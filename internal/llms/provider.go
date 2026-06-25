package llms

import (
	"context"
	"time"

	"go_text/internal/apperr"
)

// ProviderKind is the machine-readable provider class. Matches the `kind` column
// in the providers table and the `providerKinds` metadata list.
type ProviderKind string

const (
	KindOllama   ProviderKind = "ollama"
	KindLMStudio ProviderKind = "lmstudio"
	KindLlamaCpp ProviderKind = "llamacpp"
	KindOpenAI   ProviderKind = "openai"
	KindAzure    ProviderKind = "azure"
)

// AuthScheme is the HTTP authentication method the provider requires.
type AuthScheme string

const (
	AuthNone   AuthScheme = "none"
	AuthBearer AuthScheme = "bearer"
	AuthAPIKey AuthScheme = "apiKey"
)

// ProviderCapabilities declares behavioural flags for a provider kind.
type ProviderCapabilities struct {
	SupportsDiscovery     bool // can enumerate models via HTTP
	SupportsRichModelMeta bool // discovery response carries token limits / feature flags
	DeploymentInURL       bool // model identifier appears in the path (Azure)
	StripThinkTags        bool // strip <think>…</think> blocks from completion content
}

// Message is a single turn in a conversation.
type Message struct {
	Role    string
	Content string
}

// ChatRequest is the provider-agnostic inference request.
type ChatRequest struct {
	Model              string
	System             string   // injected as role=system message
	Messages           []Message
	Temperature        *float64
	MaxTokens          *int
	UseLegacyMaxTokens bool // true → emit max_tokens; false → emit max_completion_tokens
	NumCtx             *int // ollama num_ctx context window; ignored by non-ollama kinds
}

// TokenUsage summarises token consumption for the request.
type TokenUsage struct {
	PromptTokens     int
	CompletionTokens int
	TotalTokens      int
}

// ChatResponse is the provider-agnostic inference response.
type ChatResponse struct {
	Content      string
	FinishReason string
	Usage        TokenUsage
	Duration     time.Duration
}

// Provider is the single extension seam for LLM back-ends.
// All methods accept a context so callers can impose deadlines.
type Provider interface {
	Chat(ctx context.Context, req ChatRequest) (ChatResponse, error)
	ListModels(ctx context.Context) ([]apperr.ModelInfo, error)
	Capabilities() ProviderCapabilities
	Kind() ProviderKind
}
