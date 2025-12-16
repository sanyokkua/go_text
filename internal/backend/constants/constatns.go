package constants

import (
	"go_text/internal/backend/models"
)

const DefaultOllamaBaseUrl = "http://localhost:11434"
const DefaultOllamaBaseUrlAlternative = "http://127.0.0.1:11434"

const (
	OpenAICompatibleGetModels       = "/v1/models"
	OpenAICompatiblePostCompletions = "/v1/chat/completions"
)
const (
	PromptTypeSystem            = "System Prompt"
	PromptTypeUser              = "User Prompt"
	PromptCategoryTranslation   = "Translation"
	PromptCategoryProofread     = "Proofreading"
	PromptCategoryFormat        = "Formatting"
	PromptCategorySummary       = "Summarization"
	PromptCategoryTransforming  = "Transforming"
	TemplateParamText           = "{{user_text}}"
	TemplateParamFormat         = "{{user_format}}"
	TemplateParamInputLanguage  = "{{input_language}}"
	TemplateParamOutputLanguage = "{{output_language}}"
	OutputFormatPlainText       = "PlainText"
	OutputFormatMarkdown        = "Markdown"
)

var languages = [15]string{
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

var OllamaConfig = models.ProviderConfig{
	ProviderType:       models.ProviderTypeOllama,
	ProviderName:       "Ollama",
	BaseUrl:            "http://127.0.0.1:11434",
	ModelsEndpoint:     "/v1/models",
	CompletionEndpoint: "/v1/chat/completions",
	Headers:            make(map[string]string),
}

var LMStudioConfig = models.ProviderConfig{
	ProviderType:       models.ProviderTypeLMStudio,
	ProviderName:       "LM Studio",
	BaseUrl:            "http://127.0.0.1:1234",
	ModelsEndpoint:     "/v1/models",
	CompletionEndpoint: "/v1/chat/completions",
	Headers:            make(map[string]string),
}

var LlamaCppConfig = models.ProviderConfig{
	ProviderType:       models.ProviderTypeLlamaCpp,
	ProviderName:       "Llama.cpp",
	BaseUrl:            "http://127.0.0.1:8080",
	ModelsEndpoint:     "/v1/models",
	CompletionEndpoint: "/v1/chat/completions",
	Headers:            make(map[string]string),
}

var DefaultSetting = models.Settings{
	AvailableProviderConfigs: []models.ProviderConfig{OllamaConfig, LMStudioConfig, LlamaCppConfig},
	CurrentProviderConfig:    OllamaConfig,
	ModelConfig: models.ModelConfig{
		ModelName:            "",
		IsTemperatureEnabled: true,
		Temperature:          0.5,
	},
	LanguageConfig: models.LanguageConfig{
		DefaultInputLanguage:  "English",
		DefaultOutputLanguage: "Ukrainian",
		Languages:             languages[:],
	},
	UseMarkdownForOutput: false,
}
