package settings

import (
	"github.com/google/uuid"
)

const (
	ProviderTypeOpenAICompatible ProviderType = "open-ai-compatible"
	ProviderTypeOllama           ProviderType = "ollama"
)
const (
	AuthTypeNone   AuthType = "none"
	AuthTypeApiKey AuthType = "api-key"
	AuthTypeBearer AuthType = "bearer"
)

var ProviderTypes = []ProviderType{ProviderTypeOpenAICompatible, ProviderTypeOllama}
var AuthTypes = []AuthType{AuthTypeNone, AuthTypeApiKey, AuthTypeBearer}

var Languages = [15]string{
	"Chinese",
	"Croatian",
	"Czech",
	"English",
	"French",
	"German",
	"Hindi",
	"Italian",
	"Korean",
	"Polish",
	"Portuguese",
	"Russian",
	"Serbian",
	"Spanish",
	"Ukrainian",
}

var OllamaConfig = ProviderConfig{
	ProviderID:          uuid.NewString(),
	ProviderName:        "Ollama",
	ProviderType:        ProviderTypeOllama,
	BaseUrl:             "http://127.0.0.1:11434/",
	ModelsEndpoint:      "v1/models",
	CompletionEndpoint:  "v1/chat/completions",
	AuthType:            AuthTypeNone,
	AuthToken:           "",
	UseAuthTokenFromEnv: false,
	EnvVarTokenName:     "",
	UseCustomHeaders:    false,
	Headers:             nil,
	UseCustomModels:     false,
	CustomModels:        nil,
}

var LMStudioConfig = ProviderConfig{
	ProviderID:          uuid.NewString(),
	ProviderName:        "LM Studio",
	ProviderType:        ProviderTypeOpenAICompatible,
	BaseUrl:             "http://127.0.0.1:1234/",
	ModelsEndpoint:      "v1/models",
	CompletionEndpoint:  "v1/chat/completions",
	AuthType:            AuthTypeNone,
	AuthToken:           "",
	UseAuthTokenFromEnv: false,
	EnvVarTokenName:     "",
	UseCustomHeaders:    false,
	Headers:             nil,
	UseCustomModels:     false,
	CustomModels:        nil,
}

var LlamaCppConfig = ProviderConfig{
	ProviderID:          uuid.NewString(),
	ProviderName:        "Llama.cpp",
	ProviderType:        ProviderTypeOpenAICompatible,
	BaseUrl:             "http://127.0.0.1:8080/",
	ModelsEndpoint:      "v1/models",
	CompletionEndpoint:  "v1/chat/completions",
	AuthType:            AuthTypeNone,
	AuthToken:           "",
	UseAuthTokenFromEnv: false,
	EnvVarTokenName:     "",
	UseCustomHeaders:    false,
	Headers:             nil,
	UseCustomModels:     false,
	CustomModels:        nil,
}

var OpenrouterConfig = ProviderConfig{
	ProviderID:          uuid.NewString(),
	ProviderName:        "OpenRouter.ai",
	ProviderType:        ProviderTypeOpenAICompatible,
	BaseUrl:             "https://openrouter.ai/api/",
	ModelsEndpoint:      "v1/models",
	CompletionEndpoint:  "v1/chat/completions",
	AuthType:            AuthTypeBearer,
	AuthToken:           "",
	UseAuthTokenFromEnv: true,
	EnvVarTokenName:     "OPENROUTER_API_KEY",
	UseCustomHeaders:    false,
	Headers:             nil,
	UseCustomModels:     false,
	CustomModels:        nil,
}

var OpenAIConfig = ProviderConfig{
	ProviderID:          uuid.NewString(),
	ProviderName:        "OpenAI",
	ProviderType:        ProviderTypeOpenAICompatible,
	BaseUrl:             "https://api.openai.com/",
	ModelsEndpoint:      "v1/models",
	CompletionEndpoint:  "v1/chat/completions",
	AuthType:            AuthTypeBearer,
	AuthToken:           "",
	UseAuthTokenFromEnv: true,
	EnvVarTokenName:     "OPENAI_API_KEY",
	UseCustomHeaders:    true,
	Headers: map[string]string{
		"OpenAI-Organization": "",
		"OpenAI-Project":      "",
	},
	UseCustomModels: false,
	CustomModels:    nil,
}

var DefaultSetting = Settings{
	AvailableProviderConfigs: []ProviderConfig{OllamaConfig, LMStudioConfig, LlamaCppConfig, OpenrouterConfig, OpenAIConfig},
	CurrentProviderConfig:    OllamaConfig,
	InferenceBaseConfig: InferenceBaseConfig{
		Timeout:              60,
		MaxRetries:           3,
		UseMarkdownForOutput: false,
	},
	ModelConfig: ModelConfig{
		Name:           "",
		UseTemperature: true,
		Temperature:    0.5,
	},
	LanguageConfig: LanguageConfig{
		DefaultInputLanguage:  "English",
		DefaultOutputLanguage: "Ukrainian",
		Languages:             Languages[:],
	},
}
