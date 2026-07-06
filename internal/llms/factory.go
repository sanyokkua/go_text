package llms

import (
	"go_text/internal/apperr"
	"go_text/internal/settings"
	"resty.dev/v3"
)

// ResolvedProviderConfig pairs a stored ProviderConfig with the request-time secret.
// Secret is resolved from os.Getenv(Config.APIKeyEnvVar) by the LLMService facade
// immediately before the HTTP call. It is NEVER persisted or logged.
type ResolvedProviderConfig struct {
	Config settings.ProviderConfig
	Secret string
}

// ProviderBuilder constructs a Provider from a resolved config and its profile.
type ProviderBuilder func(cfg ResolvedProviderConfig, profile ProviderProfile) (Provider, error)

// ProviderFactory maps provider kinds to their builder and profile.
type ProviderFactory struct {
	builders map[ProviderKind]ProviderBuilder
	profiles map[ProviderKind]ProviderProfile
	client   *resty.Client
}

// NewProviderFactory creates a factory pre-registered with the five built-in kinds.
func NewProviderFactory(client *resty.Client) *ProviderFactory {
	f := &ProviderFactory{
		builders: make(map[ProviderKind]ProviderBuilder),
		profiles: make(map[ProviderKind]ProviderProfile),
		client:   client,
	}
	openAIBuilder := func(cfg ResolvedProviderConfig, profile ProviderProfile) (Provider, error) {
		return &OpenAICompatibleProvider{cfg: cfg, profile: profile, client: client}, nil
	}
	f.Register(KindOllama, openAIBuilder, ollamaProfile)
	f.Register(KindLMStudio, openAIBuilder, lmStudioProfile)
	f.Register(KindLlamaCpp, openAIBuilder, llamaCppProfile)
	f.Register(KindOpenAI, openAIBuilder, openAIProfile)
	f.Register(KindAzure, openAIBuilder, azureProfile)
	return f
}

// Register adds or replaces a kind's builder and profile.
func (f *ProviderFactory) Register(kind ProviderKind, b ProviderBuilder, p ProviderProfile) {
	f.builders[kind] = b
	f.profiles[kind] = p
}

// Build resolves the profile for cfg.Config.Kind and constructs a Provider.
// Returns apperr.Validation if the kind is not registered.
func (f *ProviderFactory) Build(cfg ResolvedProviderConfig) (Provider, error) {
	kind := ProviderKind(cfg.Config.Kind)
	builder, ok := f.builders[kind]
	if !ok {
		return nil, apperr.Validation("kind", "one of ollama|lmstudio|llamacpp|openai|azure", cfg.Config.Kind)
	}
	profile := f.profiles[kind]
	return builder(cfg, profile)
}
