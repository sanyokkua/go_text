package llms

const (
	pathV1Chat   = "v1/chat/completions"
	pathV1Models = "v1/models"
)

// ProviderProfile holds the static per-kind data that drives OpenAICompatibleProvider.
// Fields with a non-empty value override any user-configured override.
type ProviderProfile struct {
	Kind ProviderKind

	// DefaultAuthScheme is used when ProviderConfig.AuthScheme is empty.
	DefaultAuthScheme AuthScheme

	// DefaultBaseURL is the fallback when ProviderConfig.BaseURL is empty.
	DefaultBaseURL string

	// CompletionPathTemplate is the URL path appended to BaseURL.
	// Supports {deployment} placeholder (replaced with SelectedModel) for Azure.
	CompletionPathTemplate string

	// ModelsPathTemplate is the path appended to BaseURL for model discovery.
	ModelsPathTemplate string

	// DiscoveryStrategy parses the raw discovery HTTP response body.
	DiscoveryStrategy DiscoveryStrategy

	Capabilities ProviderCapabilities

	// NativeChatPath, when non-empty, is the path to a kind-specific native chat endpoint
	// used instead of CompletionPathTemplate. T63: Ollama's OpenAI-compatible endpoint
	// silently ignores options.num_ctx; its native endpoint honors it.
	NativeChatPath string
}

var ollamaProfile = ProviderProfile{
	Kind:                   KindOllama,
	DefaultAuthScheme:      AuthNone,
	DefaultBaseURL:         "http://127.0.0.1:11434/",
	CompletionPathTemplate: pathV1Chat,
	ModelsPathTemplate:     pathV1Models,
	DiscoveryStrategy:      parseStandardModels,
	Capabilities: ProviderCapabilities{
		SupportsDiscovery:     true,
		SupportsRichModelMeta: false,
		DeploymentInURL:       false,
		StripThinkTags:        true,
	},
	NativeChatPath: "api/chat",
}

var lmStudioProfile = ProviderProfile{
	Kind:                   KindLMStudio,
	DefaultAuthScheme:      AuthNone,
	DefaultBaseURL:         "http://127.0.0.1:1234/",
	CompletionPathTemplate: pathV1Chat,
	ModelsPathTemplate:     pathV1Models,
	DiscoveryStrategy:      parseStandardModels,
	Capabilities: ProviderCapabilities{
		SupportsDiscovery:     true,
		SupportsRichModelMeta: false,
		DeploymentInURL:       false,
		StripThinkTags:        true,
	},
}

var llamaCppProfile = ProviderProfile{
	Kind:                   KindLlamaCpp,
	DefaultAuthScheme:      AuthNone,
	DefaultBaseURL:         "http://127.0.0.1:8080/",
	CompletionPathTemplate: pathV1Chat,
	ModelsPathTemplate:     pathV1Models,
	DiscoveryStrategy:      parseStandardModels,
	Capabilities: ProviderCapabilities{
		SupportsDiscovery:     true,
		SupportsRichModelMeta: false,
		DeploymentInURL:       false,
		StripThinkTags:        true,
	},
}

var openAIProfile = ProviderProfile{
	Kind:                   KindOpenAI,
	DefaultAuthScheme:      AuthBearer,
	DefaultBaseURL:         "https://api.openai.com/",
	CompletionPathTemplate: pathV1Chat,
	ModelsPathTemplate:     pathV1Models,
	DiscoveryStrategy:      parseStandardModels,
	Capabilities: ProviderCapabilities{
		SupportsDiscovery:     true,
		SupportsRichModelMeta: false,
		DeploymentInURL:       false,
		StripThinkTags:        false,
	},
}

var azureProfile = ProviderProfile{
	Kind:                   KindAzure,
	DefaultAuthScheme:      AuthAPIKey,
	DefaultBaseURL:         "", // Azure requires a user-supplied BaseURL (endpoint)
	CompletionPathTemplate: "openai/deployments/{deployment}/chat/completions",
	ModelsPathTemplate:     "openai/deployments",
	DiscoveryStrategy:      parseAzureDeployments,
	Capabilities: ProviderCapabilities{
		SupportsDiscovery:     true,
		SupportsRichModelMeta: true,
		DeploymentInURL:       true,
		StripThinkTags:        false,
	},
}
