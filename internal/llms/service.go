package llms

import (
	"context"
	"errors"
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	"go_text/internal/apperr"
	"go_text/internal/settings"

	"github.com/wailsapp/wails/v2/pkg/logger"
)

var errNilProvider = errors.New("provider configuration cannot be nil")

type LLMServiceAPI interface {
	GetModelsList() ([]string, error)
	GetCompletionResponse(ctx context.Context, request *ChatCompletionRequest) (string, error)
	GetModelsListForProvider(provider *settings.ProviderConfig) ([]string, error)
	GetModelsInfoForProvider(provider *settings.ProviderConfig) ([]apperr.ModelInfo, error)
	GetCompletionResponseForProvider(ctx context.Context, provider *settings.ProviderConfig, request *ChatCompletionRequest) (string, error)
}

type LLMService struct {
	logger          logger.Logger
	factory         *ProviderFactory
	settingsService settings.SettingsServiceAPI
}

func NewLLMApiService(l logger.Logger, factory *ProviderFactory, settingsService settings.SettingsServiceAPI) LLMServiceAPI {
	const op = "LLMService.NewLLMApiService"
	if l == nil {
		panic(fmt.Sprintf("%s: logger cannot be nil", op))
	}
	if factory == nil {
		panic(fmt.Sprintf("%s: provider factory cannot be nil", op))
	}
	if settingsService == nil {
		panic(fmt.Sprintf("%s: settings service cannot be nil", op))
	}
	l.Info(fmt.Sprintf("[%s] Initializing LLM service", op))
	return &LLMService{logger: l, factory: factory, settingsService: settingsService}
}

func (l *LLMService) GetModelsList() ([]string, error) {
	const op = "LLMService.GetModelsList"
	provider, err := l.settingsService.GetCurrentProviderConfig()
	if err != nil {
		return nil, fmt.Errorf("%s: get current provider: %w", op, err)
	}
	if provider == nil {
		return nil, fmt.Errorf("%s: current provider configuration is nil", op)
	}
	return l.GetModelsListForProvider(provider)
}

func (l *LLMService) GetCompletionResponse(ctx context.Context, request *ChatCompletionRequest) (string, error) {
	const op = "LLMService.GetCompletionResponse"
	if request == nil {
		return "", fmt.Errorf("%s: completion request cannot be nil", op)
	}
	provider, err := l.settingsService.GetCurrentProviderConfig()
	if err != nil {
		return "", fmt.Errorf("%s: get current provider: %w", op, err)
	}
	if provider == nil {
		return "", fmt.Errorf("%s: current provider configuration is nil", op)
	}
	return l.GetCompletionResponseForProvider(ctx, provider, request)
}

// GetModelsListForProvider returns the model list for a given provider config.
// If UseCustomModels is true and CustomModels is non-empty, those are returned without HTTP.
// If discovery fails, CustomModels is returned as a silent fallback.
func (l *LLMService) GetModelsListForProvider(provider *settings.ProviderConfig) ([]string, error) {
	const op = "LLMService.GetModelsListForProvider"
	if provider == nil {
		return nil, fmt.Errorf("%s: %w", op, errNilProvider)
	}

	if provider.UseCustomModels && len(provider.CustomModels) > 0 {
		l.logger.Info(fmt.Sprintf("[%s] Using custom models for provider %s", op, provider.Name))
		return provider.CustomModels, nil
	}

	resolved, err := l.resolveConfig(provider)
	if err != nil {
		return l.customModelsFallback(provider, op, err)
	}

	p, err := l.factory.Build(resolved)
	if err != nil {
		return l.customModelsFallback(provider, op, err)
	}

	baseConfig, err := l.settingsService.GetInferenceBaseConfig()
	if err != nil {
		return l.customModelsFallback(provider, op, err)
	}

	timeout := ValidateTimeout(baseConfig.Timeout)
	ctx, cancel := context.WithTimeout(context.Background(), time.Duration(timeout)*time.Second)
	defer cancel()

	models, err := p.ListModels(ctx)
	if err != nil {
		return l.customModelsFallback(provider, op, apperr.RewriteTimeoutSeconds(err, timeout))
	}

	ids := make([]string, 0, len(models))
	for _, m := range models {
		ids = append(ids, m.ID)
	}
	l.logger.Debug(fmt.Sprintf("[%s] Retrieved %d models for provider %s", op, len(ids), provider.Name))
	return ids, nil
}

// GetModelsInfoForProvider returns the model list with optional capability metadata.
// If UseCustomModels is true and CustomModels is non-empty, those are returned without
// an HTTP call (Caps = nil for all). If discovery fails, CustomModels are used as a
// silent fallback. A nil provider returns an error; a live discovery with no models
// returns an empty non-nil slice.
func (l *LLMService) GetModelsInfoForProvider(provider *settings.ProviderConfig) ([]apperr.ModelInfo, error) {
	const op = "LLMService.GetModelsInfoForProvider"
	if provider == nil {
		return nil, fmt.Errorf("%s: %w", op, errNilProvider)
	}

	if provider.UseCustomModels && len(provider.CustomModels) > 0 {
		l.logger.Info(fmt.Sprintf("[%s] Using custom models for provider %s", op, provider.Name))
		return customModelsAsModelInfo(provider.CustomModels), nil
	}

	resolved, err := l.resolveConfig(provider)
	if err != nil {
		return l.customModelsInfoFallback(provider, op, err)
	}

	p, err := l.factory.Build(resolved)
	if err != nil {
		return l.customModelsInfoFallback(provider, op, err)
	}

	baseConfig, err := l.settingsService.GetInferenceBaseConfig()
	if err != nil {
		return l.customModelsInfoFallback(provider, op, err)
	}

	timeout := ValidateTimeout(baseConfig.Timeout)
	ctx, cancel := context.WithTimeout(context.Background(), time.Duration(timeout)*time.Second)
	defer cancel()

	models, err := p.ListModels(ctx)
	if err != nil {
		err = apperr.RewriteTimeoutSeconds(err, timeout)
		if p.Capabilities().SupportsDiscovery && !provider.UseCustomModels {
			return nil, err
		}
		return l.customModelsInfoFallback(provider, op, err)
	}

	l.logger.Debug(fmt.Sprintf("[%s] Retrieved %d models for provider %s", op, len(models), provider.Name))
	if models == nil {
		return []apperr.ModelInfo{}, nil
	}
	return models, nil
}

func (l *LLMService) GetCompletionResponseForProvider(ctx context.Context, provider *settings.ProviderConfig, request *ChatCompletionRequest) (string, error) {
	const op = "LLMService.GetCompletionResponseForProvider"
	if provider == nil {
		return "", fmt.Errorf("%s: %s", op, errNilProvider)
	}
	if request == nil {
		return "", fmt.Errorf("%s: completion request cannot be nil", op)
	}

	resolved, err := l.resolveConfig(provider)
	if err != nil {
		return "", err
	}

	p, err := l.factory.Build(resolved)
	if err != nil {
		return "", err
	}

	baseConfig, err := l.settingsService.GetInferenceBaseConfig()
	if err != nil {
		return "", fmt.Errorf("%s: get inference config: %w", op, err)
	}
	modelConfig, err := l.settingsService.GetModelConfig()
	if err != nil {
		return "", fmt.Errorf("%s: get model config: %w", op, err)
	}

	timeout := ValidateTimeout(baseConfig.Timeout)
	maxRetries := l.validateMaxRetries(baseConfig.MaxRetries)
	attempt := chatAttempt{provider: p, request: chatRequestFrom(request, modelConfig), timeout: timeout}

	return l.chatWithRetry(ctx, attempt, maxRetries)
}

// chatAttempt groups the per-call inputs needed to run one HTTP attempt, keeping
// chatWithRetry and chatOnce within the project's max-3-args function limit.
type chatAttempt struct {
	provider Provider
	request  ChatRequest
	timeout  int
}

const (
	retryBackoffBase = 500 * time.Millisecond
	retryBackoffCap  = 8 * time.Second
)

// chatWithRetry runs up to maxRetries+1 attempts against a.provider, retrying only on
// apperr.AppError.Retryable errors. Each attempt gets a fresh timeout-second budget
// derived from the caller's ctx, so a slow first attempt cannot starve later retries.
func (l *LLMService) chatWithRetry(ctx context.Context, a chatAttempt, maxRetries int) (string, error) {
	const op = "LLMService.chatWithRetry"
	var lastErr error
	for attemptNum := 0; attemptNum <= maxRetries; attemptNum++ {
		content, err := l.chatOnce(ctx, a)
		if err == nil {
			return content, nil
		}
		lastErr = err

		ae, retryable := asRetryableAppError(err)
		if !retryable || attemptNum == maxRetries {
			return "", err
		}

		l.logger.Warning(fmt.Sprintf("[%s] Attempt %d/%d failed for provider %s, retrying: %v",
			op, attemptNum+1, maxRetries+1, a.provider.Kind(), err))
		if waitErr := l.waitBeforeRetry(ctx, attemptNum, ae); waitErr != nil {
			return "", waitErr
		}
	}
	return "", lastErr
}

// chatOnce performs a single HTTP attempt bounded by its own timeout-second budget
// derived from ctx. Scoping the context to this function (rather than the caller's loop)
// ensures cancel() runs on every path, satisfying go vet's lostcancel check.
func (l *LLMService) chatOnce(ctx context.Context, a chatAttempt) (string, error) {
	reqCtx, cancel := context.WithTimeout(ctx, time.Duration(a.timeout)*time.Second)
	defer cancel()

	resp, err := a.provider.Chat(reqCtx, a.request)
	if err != nil {
		return "", apperr.RewriteTimeoutSeconds(err, a.timeout)
	}
	return resp.Content, nil
}

// waitBeforeRetry blocks for the backoff delay, aborting immediately if ctx is cancelled
// (e.g. CancelChain or app shutdown) rather than sleeping out the full backoff.
func (l *LLMService) waitBeforeRetry(ctx context.Context, attempt int, ae *apperr.AppError) error {
	select {
	case <-ctx.Done():
		return apperr.CancelledRequest(ctx.Err())
	case <-time.After(retryBackoffDelay(attempt, ae)):
		return nil
	}
}

// asRetryableAppError narrows err to *apperr.AppError and reports whether it is retryable.
// Provider.Chat only ever returns errors built via mapTransportError, mapHTTPStatus, or
// apperr.EmptyCompletion, so this check alone is sufficient to gate retries here.
func asRetryableAppError(err error) (*apperr.AppError, bool) {
	var ae *apperr.AppError
	if errors.As(err, &ae) && ae.Retryable {
		return ae, true
	}
	return nil, false
}

// retryBackoffDelay computes the wait before the next retry attempt. It is a package-level
// var (not a plain function) so tests can override it to avoid real sleeps — see
// GoUnitTestsRules.md §3.2 (the `var now = time.Now` pattern).
var retryBackoffDelay = defaultRetryBackoffDelay

// defaultRetryBackoffDelay honors the provider's Retry-After hint when present, otherwise
// falls back to exponential backoff (500ms, 1s, 2s, ...) capped at retryBackoffCap.
func defaultRetryBackoffDelay(attempt int, ae *apperr.AppError) time.Duration {
	if ae != nil {
		if retryAfter, ok := retryAfterSeconds(ae); ok {
			return retryAfter
		}
	}
	delay := retryBackoffBase << attempt
	if delay > retryBackoffCap {
		return retryBackoffCap
	}
	return delay
}

// retryAfterSeconds extracts a positive Retry-After duration from an AppError's Details,
// as populated by apperr.RateLimited. Returns ok=false if absent, unparsable, or <= 0.
func retryAfterSeconds(ae *apperr.AppError) (time.Duration, bool) {
	raw, present := ae.Details["retryAfter"]
	if !present {
		return 0, false
	}
	seconds, err := strconv.Atoi(raw)
	if err != nil || seconds <= 0 {
		return 0, false
	}
	return time.Duration(seconds) * time.Second, true
}

// resolveConfig reads the secret from the environment.
// Returns apperr.MissingCredential if auth != none and the env var is unset or empty.
func (l *LLMService) resolveConfig(provider *settings.ProviderConfig) (ResolvedProviderConfig, error) {
	authScheme := provider.AuthScheme
	if authScheme == "" {
		kind := ProviderKind(provider.Kind)
		switch kind {
		case KindOllama, KindLMStudio, KindLlamaCpp:
			authScheme = string(AuthNone)
		case KindOpenAI:
			authScheme = string(AuthBearer)
		case KindAzure:
			authScheme = string(AuthAPIKey)
		}
	}

	secret := ""
	if authScheme != string(AuthNone) {
		if strings.TrimSpace(provider.APIKeyEnvVar) == "" {
			return ResolvedProviderConfig{}, apperr.MissingCredential(provider.Name, provider.APIKeyEnvVar)
		}
		secret = os.Getenv(provider.APIKeyEnvVar)
		if secret == "" {
			return ResolvedProviderConfig{}, apperr.MissingCredential(provider.Name, provider.APIKeyEnvVar)
		}
	}
	return ResolvedProviderConfig{Config: *provider, Secret: secret}, nil
}

// customModelsFallback logs a warning and returns CustomModels if available.
// The discovery error is swallowed — no user-facing error — per the discovery fallback rule.
func (l *LLMService) customModelsFallback(provider *settings.ProviderConfig, op string, err error) ([]string, error) {
	l.logger.Warning(fmt.Sprintf("[%s] Discovery failed for provider %s, falling back to custom models: %v",
		op, provider.Name, err))
	if len(provider.CustomModels) > 0 {
		return provider.CustomModels, nil
	}
	return []string{}, nil
}

// customModelsAsModelInfo converts a string slice into ModelInfo entries with Caps=nil.
func customModelsAsModelInfo(ids []string) []apperr.ModelInfo {
	out := make([]apperr.ModelInfo, 0, len(ids))
	for _, id := range ids {
		if id != "" {
			out = append(out, apperr.ModelInfo{ID: id, Label: id})
		}
	}
	return out
}

// customModelsInfoFallback logs a warning and returns CustomModels as ModelInfo (Caps=nil).
// The discovery error is intentionally swallowed — no user-facing error — per the spec.
func (l *LLMService) customModelsInfoFallback(provider *settings.ProviderConfig, op string, err error) ([]apperr.ModelInfo, error) {
	l.logger.Warning(fmt.Sprintf("[%s] Discovery failed for provider %s, falling back to custom models: %v",
		op, provider.Name, err))
	return customModelsAsModelInfo(provider.CustomModels), nil
}

// chatRequestFrom converts a ChatCompletionRequest (facade format) to a ChatRequest (Provider format).
func chatRequestFrom(req *ChatCompletionRequest, modelCfg *settings.ModelConfig) ChatRequest {
	var system string
	messages := make([]Message, 0, len(req.Messages))
	for _, m := range req.Messages {
		if m.Role == "system" {
			system = m.Content
		} else {
			messages = append(messages, Message{Role: m.Role, Content: m.Content})
		}
	}

	chatReq := ChatRequest{
		Model:    req.Model,
		System:   system,
		Messages: messages,
	}
	if req.Temperature != nil {
		chatReq.Temperature = req.Temperature
	}

	// Consolidate token limit from whichever field is set.
	if req.MaxTokens != nil {
		chatReq.MaxTokens = req.MaxTokens
	} else if req.MaxCompletionTokens != nil {
		chatReq.MaxTokens = req.MaxCompletionTokens
	}

	if modelCfg != nil {
		chatReq.UseLegacyMaxTokens = modelCfg.UseLegacyMaxTokens
		if modelCfg.UseContextWindow && modelCfg.ContextWindow > 0 {
			chatReq.NumCtx = &modelCfg.ContextWindow
		}
	}
	return chatReq
}

// ValidateTimeout clamps a configured timeout to the valid 1-600s range, falling back to 30s
// if out of range. Shared by LLMService and verification.Service so both paths apply the
// identical policy.
func ValidateTimeout(timeout int) int {
	const defaultTimeout = 30
	if timeout < 1 || timeout > 600 {
		return defaultTimeout
	}
	return timeout
}

func (l *LLMService) validateMaxRetries(retries int) int {
	const defaultRetries = 3
	if retries < 0 || retries > 10 {
		return defaultRetries
	}
	return retries
}
