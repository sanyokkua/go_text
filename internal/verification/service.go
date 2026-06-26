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

const verifyTimeout = 30 * time.Second

// ServiceAPI is the verification service interface consumed by ActionHandler.
type ServiceAPI interface {
	TestConnection(providerID string) (*apperr.VerifyOutcome, error)
	TestModels(providerID string) (*apperr.VerifyOutcome, error)
	TestInference(providerID string) (*apperr.VerifyOutcome, error)
}

// Service runs the three provider diagnostic checks.
type Service struct {
	wlog     logger.Logger
	settings settings.SettingsServiceAPI
	factory  *llms.ProviderFactory
	gate     *gate.InferenceGate
}

// NewService constructs a VerificationService. All arguments are required.
func NewService(
	wlog logger.Logger,
	settings settings.SettingsServiceAPI,
	factory *llms.ProviderFactory,
	g *gate.InferenceGate,
) ServiceAPI {
	const op = "verification.NewService"
	if wlog == nil {
		panic(fmt.Sprintf("%s: logger cannot be nil", op))
	}
	if settings == nil {
		panic(fmt.Sprintf("%s: settings service cannot be nil", op))
	}
	if factory == nil {
		panic(fmt.Sprintf("%s: provider factory cannot be nil", op))
	}
	if g == nil {
		panic(fmt.Sprintf("%s: inference gate cannot be nil", op))
	}
	return &Service{wlog: wlog, settings: settings, factory: factory, gate: g}
}

// TestConnection verifies that the provider endpoint is reachable and
// credentials are valid. Failure codes: missing_credential, auth,
// provider_unreachable.
func (s *Service) TestConnection(providerID string) (*apperr.VerifyOutcome, error) {
	start := time.Now()
	outcome := &apperr.VerifyOutcome{Check: "connection"}

	cfg, err := s.getProviderConfig(providerID)
	if err != nil {
		outcome.DurationMs = time.Since(start).Milliseconds()
		outcome.OK = false
		return outcome, err
	}

	resolved, err := resolveSecret(cfg)
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

	ctx, cancel := context.WithTimeout(context.Background(), verifyTimeout)
	defer cancel()

	_, listErr := p.ListModels(ctx)
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
// count and first model name. Failure codes: missing_credential,
// provider_unreachable, model_not_found, internal.
func (s *Service) TestModels(providerID string) (*apperr.VerifyOutcome, error) {
	start := time.Now()
	outcome := &apperr.VerifyOutcome{Check: "models"}

	cfg, err := s.getProviderConfig(providerID)
	if err != nil {
		outcome.DurationMs = time.Since(start).Milliseconds()
		outcome.OK = false
		return outcome, err
	}

	resolved, err := resolveSecret(cfg)
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

	ctx, cancel := context.WithTimeout(context.Background(), verifyTimeout)
	defer cancel()

	models, listErr := p.ListModels(ctx)
	outcome.DurationMs = time.Since(start).Milliseconds()

	if listErr != nil {
		outcome.OK = false
		return outcome, listErr
	}
	if len(models) == 0 {
		outcome.OK = false
		return outcome, apperr.ModelNotFound(cfg.Name, "(none discovered)", nil)
	}
	outcome.OK = true
	outcome.ModelCount = len(models)
	outcome.Sample = models[0].ID
	return outcome, nil
}

// TestInference sends a tiny completion to the selected model to verify the
// full inference path. It acquires the InferenceGate first; if the gate is
// held it returns immediately with CodeBusy (no LLM call). The gate is always
// released via defer — on success, failure, timeout, or panic.
// Failure codes: busy, missing_credential, auth, model_not_found, timeout,
// rate_limited, context_window, empty_completion.
func (s *Service) TestInference(providerID string) (*apperr.VerifyOutcome, error) {
	if !s.gate.TryAcquire() {
		return &apperr.VerifyOutcome{Check: "inference", OK: false, DurationMs: 0},
			apperr.Busy()
	}
	defer s.gate.Release()

	start := time.Now()
	outcome := &apperr.VerifyOutcome{Check: "inference"}

	cfg, err := s.getProviderConfig(providerID)
	if err != nil {
		outcome.DurationMs = time.Since(start).Milliseconds()
		outcome.OK = false
		return outcome, err
	}

	if cfg.SelectedModel == "" {
		outcome.DurationMs = time.Since(start).Milliseconds()
		outcome.OK = false
		return outcome, apperr.Validation("selectedModel", "a non-empty model name", "")
	}

	resolved, err := resolveSecret(cfg)
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

	ctx, cancel := context.WithTimeout(context.Background(), verifyTimeout)
	defer cancel()

	req := llms.ChatRequest{
		Model:    cfg.SelectedModel,
		Messages: []llms.Message{{Role: "user", Content: "Hi"}},
	}

	resp, chatErr := p.Chat(ctx, req)
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

// getProviderConfig fetches and validates a provider config by ID.
func (s *Service) getProviderConfig(providerID string) (*settings.ProviderConfig, error) {
	cfg, err := s.settings.GetProviderConfig(providerID)
	if err != nil {
		return nil, apperr.Internal(fmt.Errorf("get provider config: %w", err))
	}
	if cfg == nil {
		return nil, apperr.Validation("providerID", "a known provider ID", providerID)
	}
	return cfg, nil
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
