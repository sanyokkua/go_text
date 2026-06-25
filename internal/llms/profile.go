package llms

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
}

var ollamaProfile = ProviderProfile{
	Kind:                   KindOllama,
	DefaultAuthScheme:      AuthNone,
	DefaultBaseURL:         "http://127.0.0.1:11434/",
	CompletionPathTemplate: "v1/chat/completions",
	ModelsPathTemplate:     "api/tags",
	DiscoveryStrategy:      parseOllamaTags,
	Capabilities: ProviderCapabilities{
		SupportsDiscovery:     true,
		SupportsRichModelMeta: false,
		DeploymentInURL:       false,
		StripThinkTags:        true,
	},
}

var lmStudioProfile = ProviderProfile{
	Kind:                   KindLMStudio,
	DefaultAuthScheme:      AuthNone,
	DefaultBaseURL:         "http://127.0.0.1:1234/",
	CompletionPathTemplate: "v1/chat/completions",
	ModelsPathTemplate:     "v1/models",
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
	CompletionPathTemplate: "v1/chat/completions",
	ModelsPathTemplate:     "v1/models",
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
	CompletionPathTemplate: "v1/chat/completions",
	ModelsPathTemplate:     "v1/models",
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
