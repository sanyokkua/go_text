package settings

type ProviderType string

const (
	ProviderTypeCustom ProviderType = "open-ai-compatible"
	ProviderTypeOllama ProviderType = "ollama"
)

type ProviderConfig struct {
	ProviderName       string            `json:"providerName"` // Unique
	ProviderType       ProviderType      `json:"providerType"`
	BaseUrl            string            `json:"baseUrl"`
	ModelsEndpoint     string            `json:"modelsEndpoint"`
	CompletionEndpoint string            `json:"completionEndpoint"`
	Headers            map[string]string `json:"headers"`
}

type LlmModelConfig struct {
	ModelName            string  `json:"modelName"`
	IsTemperatureEnabled bool    `json:"isTemperatureEnabled"`
	Temperature          float64 `json:"temperature"`
}

type LanguageConfig struct {
	Languages             []string `json:"languages"`
	DefaultInputLanguage  string   `json:"defaultInputLanguage"`
	DefaultOutputLanguage string   `json:"defaultOutputLanguage"`
}

type Settings struct {
	AvailableProviderConfigs []ProviderConfig `json:"availableProviderConfigs"`
	CurrentProviderConfig    ProviderConfig   `json:"currentProviderConfig"`
	ModelConfig              LlmModelConfig   `json:"modelConfig"`
	LanguageConfig           LanguageConfig   `json:"languageConfig"`
	UseMarkdownForOutput     bool             `json:"useMarkdownForOutput"`
}
