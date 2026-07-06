package verification

import (
	"context"
	"errors"
	"fmt"
	"os"
	"strings"
	"time"

	"go_text/internal/apperr"
	"go_text/internal/gate"
	"go_text/internal/llms"
	"go_text/internal/settings"

	"github.com/wailsapp/wails/v2/pkg/logger"
)

// ServiceAPI is the verification service interface consumed by ActionHandler.
//
// All three checks take the in-flight draft ProviderConfig (not a saved
// provider ID) so the user can verify edits — base URL, auth, selected model —
// before saving. The config carries only the env-var name, never a secret.
// TestConnection and TestModels are stateless with respect to saved settings;
// TestInference additionally reads the saved ModelConfig (see below) so its
// request mirrors a real chain run.
type ServiceAPI interface {
	TestConnection(cfg settings.ProviderConfig) (*apperr.VerifyOutcome, error)
	TestModels(cfg settings.ProviderConfig) (*apperr.VerifyOutcome, error)
	TestInference(cfg settings.ProviderConfig) (*apperr.VerifyOutcome, error)
}

// Service runs the three provider diagnostic checks. TestConnection and
// TestModels are stateless with respect to saved settings — they operate only
// on the draft ProviderConfig supplied by the caller, so verification works
// before a provider is saved. TestInference also reads the saved ModelConfig
// so its request exercises the same parameters a real chain run would use.
type Service struct {
	wlog            logger.Logger
	factory         *llms.ProviderFactory
	settingsService settings.SettingsServiceAPI
	gate            *gate.InferenceGate
}

// NewService constructs a VerificationService. All arguments are required.
func NewService(
	wlog logger.Logger,
	factory *llms.ProviderFactory,
	settingsService settings.SettingsServiceAPI,
	g *gate.InferenceGate,
) ServiceAPI {
	const op = "verification.NewService"
	if wlog == nil {
		panic(fmt.Sprintf("%s: logger cannot be nil", op))
	}
	if factory == nil {
		panic(fmt.Sprintf("%s: provider factory cannot be nil", op))
	}
	if settingsService == nil {
		panic(fmt.Sprintf("%s: settings service cannot be nil", op))
	}
	if g == nil {
		panic(fmt.Sprintf("%s: inference gate cannot be nil", op))
	}
	return &Service{wlog: wlog, factory: factory, settingsService: settingsService, gate: g}
}

// TestConnection verifies that the provider endpoint is reachable and
// credentials are valid. Failure codes: missing_credential, auth,
// provider_unreachable.
func (s *Service) TestConnection(cfg settings.ProviderConfig) (*apperr.VerifyOutcome, error) {
	start := time.Now()
	outcome := &apperr.VerifyOutcome{Check: "connection"}

	resolved, err := resolveSecret(&cfg)
	if err != nil {
		outcome.DurationMs = time.Since(start).Milliseconds()
		outcome.OK = false
		return outcome, err
	}

	p, err := s.factory.Build(resolved)
	if err != nil {
		outcome.DurationMs = time.Since(start).Milliseconds()
		outcome.OK = false
		return outcome, err
	}

	timeoutSeconds := 30 // llms.ValidateTimeout's own out-of-range fallback value
	if bc, bcErr := s.settingsService.GetInferenceBaseConfig(); bcErr == nil && bc != nil {
		timeoutSeconds = llms.ValidateTimeout(bc.Timeout)
	}
	ctx, cancel := context.WithTimeout(context.Background(), time.Duration(timeoutSeconds)*time.Second)
	defer cancel()

	_, listErr := p.ListModels(ctx)
	listErr = apperr.RewriteTimeoutSeconds(listErr, timeoutSeconds)
	outcome.DurationMs = time.Since(start).Milliseconds()

	if listErr != nil {
		var ae *apperr.AppError
		if errors.As(listErr, &ae) {
			switch ae.Code {
			case apperr.CodeAuth, apperr.CodeMissingCredential:
				outcome.OK = false
				return outcome, ae
			case apperr.CodeProviderUnreachable, apperr.CodeTimeout:
				// Both map to unreachable for connection purposes.
				outcome.OK = false
				return outcome, apperr.Unreachable(cfg.Name, cfg.BaseURL, listErr)
			}
		}
		// Any other error (404, rate-limit, etc.) means server responded → reachable.
	}
	outcome.OK = true
	return outcome, nil
}

// TestModels runs the provider's discovery strategy and reports the model
// count, first model name, and the full discovered list (so callers can
// populate a model picker without a second discovery call). Failure codes:
// missing_credential, provider_unreachable, model_not_found, internal.
func (s *Service) TestModels(cfg settings.ProviderConfig) (*apperr.VerifyOutcome, error) {
	start := time.Now()
	outcome := &apperr.VerifyOutcome{Check: "models"}

	resolved, err := resolveSecret(&cfg)
	if err != nil {
		outcome.DurationMs = time.Since(start).Milliseconds()
		outcome.OK = false
		return outcome, err
	}

	p, err := s.factory.Build(resolved)
	if err != nil {
		outcome.DurationMs = time.Since(start).Milliseconds()
		outcome.OK = false
		return outcome, err
	}

	timeoutSeconds := 30 // llms.ValidateTimeout's own out-of-range fallback value
	if bc, bcErr := s.settingsService.GetInferenceBaseConfig(); bcErr == nil && bc != nil {
		timeoutSeconds = llms.ValidateTimeout(bc.Timeout)
	}
	ctx, cancel := context.WithTimeout(context.Background(), time.Duration(timeoutSeconds)*time.Second)
	defer cancel()

	models, listErr := p.ListModels(ctx)
	listErr = apperr.RewriteTimeoutSeconds(listErr, timeoutSeconds)
	outcome.DurationMs = time.Since(start).Milliseconds()

	if listErr != nil {
		outcome.OK = false
		return outcome, listErr
	}
	if len(models) == 0 {
		outcome.OK = false
		return outcome, apperr.ModelNotFound(cfg.Name, apperr.ModelUnavailablePlaceholder, nil)
	}
	outcome.OK = true
	outcome.ModelCount = len(models)
	outcome.Sample = models[0].ID
	outcome.Models = models
	return outcome, nil
}

// TestInference sends a tiny completion to the selected model to verify the
// full inference path. It acquires the InferenceGate first; if the gate is
// held it returns immediately with CodeBusy (no LLM call). The gate is always
// released via defer — on success, failure, timeout, or panic.
//
// The request applies the same saved ModelConfig a real chain run would use
// (temperature, max output tokens / legacy-flag, context window → NumCtx) so
// this diagnostic exercises the same parameters as production traffic, not an
// unconstrained bare prompt.
// Failure codes: busy, missing_credential, auth, model_not_found, timeout,
// rate_limited, context_window, empty_completion, internal.
func (s *Service) TestInference(cfg settings.ProviderConfig) (*apperr.VerifyOutcome, error) {
	if !s.gate.TryAcquire() {
		return &apperr.VerifyOutcome{Check: "inference", OK: false, DurationMs: 0},
			apperr.Busy()
	}
	defer s.gate.Release()

	start := time.Now()
	outcome := &apperr.VerifyOutcome{Check: "inference"}

	if cfg.SelectedModel == "" {
		outcome.DurationMs = time.Since(start).Milliseconds()
		outcome.OK = false
		return outcome, apperr.Validation("selectedModel", "a non-empty model name", "")
	}

	resolved, err := resolveSecret(&cfg)
	if err != nil {
		outcome.DurationMs = time.Since(start).Milliseconds()
		outcome.OK = false
		return outcome, err
	}

	p, err := s.factory.Build(resolved)
	if err != nil {
		outcome.DurationMs = time.Since(start).Milliseconds()
		outcome.OK = false
		return outcome, err
	}

	modelCfg, err := s.settingsService.GetModelConfig()
	if err != nil {
		outcome.DurationMs = time.Since(start).Milliseconds()
		outcome.OK = false
		return outcome, apperr.Internal(fmt.Errorf("get model config: %w", err))
	}

	timeoutSeconds := 30 // llms.ValidateTimeout's own out-of-range fallback value
	if bc, bcErr := s.settingsService.GetInferenceBaseConfig(); bcErr == nil && bc != nil {
		timeoutSeconds = llms.ValidateTimeout(bc.Timeout)
	}
	ctx, cancel := context.WithTimeout(context.Background(), time.Duration(timeoutSeconds)*time.Second)
	defer cancel()

	req := llms.ChatRequest{
		Model:    cfg.SelectedModel,
		Messages: []llms.Message{{Role: "user", Content: "Hi"}},
	}
	if modelCfg.UseTemperature {
		t := modelCfg.Temperature
		req.Temperature = &t
	}
	if modelCfg.UseMaxOutputTokens {
		maxOut := modelCfg.MaxOutputTokens
		req.MaxTokens = &maxOut
		req.UseLegacyMaxTokens = modelCfg.UseLegacyMaxTokens
	}
	if modelCfg.UseContextWindow && modelCfg.ContextWindow > 0 {
		req.NumCtx = &modelCfg.ContextWindow
	}

	resp, chatErr := p.Chat(ctx, req)
	chatErr = apperr.RewriteTimeoutSeconds(chatErr, timeoutSeconds)
	outcome.DurationMs = time.Since(start).Milliseconds()

	if chatErr != nil {
		outcome.OK = false
		return outcome, chatErr
	}
	outcome.OK = true
	sample := resp.Content
	if len(sample) > 200 {
		sample = sample[:200]
	}
	outcome.Sample = sample
	return outcome, nil
}

// resolveSecret reads the API secret from the environment.
// Returns apperr.MissingCredential if auth is required but the env var is
// absent or empty. Mirrors LLMService.resolveConfig without the fallback logic.
func resolveSecret(cfg *settings.ProviderConfig) (llms.ResolvedProviderConfig, error) {
	authScheme := cfg.AuthScheme
	if authScheme == "" {
		switch llms.ProviderKind(cfg.Kind) {
		case llms.KindOllama, llms.KindLMStudio, llms.KindLlamaCpp:
			authScheme = string(llms.AuthNone)
		case llms.KindOpenAI:
			authScheme = string(llms.AuthBearer)
		case llms.KindAzure:
			authScheme = string(llms.AuthAPIKey)
		}
	}

	secret := ""
	if authScheme != string(llms.AuthNone) {
		if strings.TrimSpace(cfg.APIKeyEnvVar) == "" {
			return llms.ResolvedProviderConfig{}, apperr.MissingCredential(cfg.Name, cfg.APIKeyEnvVar)
		}
		secret = os.Getenv(cfg.APIKeyEnvVar)
		if secret == "" {
			return llms.ResolvedProviderConfig{}, apperr.MissingCredential(cfg.Name, cfg.APIKeyEnvVar)
		}
	}
	return llms.ResolvedProviderConfig{Config: *cfg, Secret: secret}, nil
}
