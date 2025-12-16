package models

type ProviderType string

const (
	ProviderTypeCustom   ProviderType = "custom-open-ai"
	ProviderTypeOllama   ProviderType = "ollama"
	ProviderTypeLMStudio ProviderType = "lm-studio"
	ProviderTypeLlamaCpp ProviderType = "llama-cpp"
)

type ProviderConfig struct {
	ProviderType       ProviderType      `json:"providerType"`
	ProviderName       string            `json:"providerName"`
	BaseUrl            string            `json:"baseUrl"`
	ModelsEndpoint     string            `json:"modelsEndpoint"`
	CompletionEndpoint string            `json:"completionEndpoint"`
	Headers            map[string]string `json:"headers"`
}

type ModelConfig struct {
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
	ModelConfig              ModelConfig      `json:"modelConfig"`
	LanguageConfig           LanguageConfig   `json:"languageConfig"`
	UseMarkdownForOutput     bool             `json:"useMarkdownForOutput"`
}
