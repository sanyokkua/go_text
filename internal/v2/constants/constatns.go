package constants

import (
	"go_text/internal/v2/model/settings"
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

var OllamaConfig = settings.ProviderConfig{
	ProviderType:       settings.ProviderTypeOllama,
	ProviderName:       "Ollama",
	BaseUrl:            "http://127.0.0.1:11434",
	ModelsEndpoint:     "/v1/models",
	CompletionEndpoint: "/v1/chat/completions",
	Headers:            make(map[string]string),
}

var LMStudioConfig = settings.ProviderConfig{
	ProviderType:       settings.ProviderTypeCustom,
	ProviderName:       "LM Studio",
	BaseUrl:            "http://127.0.0.1:1234",
	ModelsEndpoint:     "/v1/models",
	CompletionEndpoint: "/v1/chat/completions",
	Headers:            make(map[string]string),
}

var LlamaCppConfig = settings.ProviderConfig{
	ProviderType:       settings.ProviderTypeCustom,
	ProviderName:       "Llama.cpp",
	BaseUrl:            "http://127.0.0.1:8080",
	ModelsEndpoint:     "/v1/models",
	CompletionEndpoint: "/v1/chat/completions",
	Headers:            make(map[string]string),
}

var DefaultSetting = settings.Settings{
	AvailableProviderConfigs: []settings.ProviderConfig{OllamaConfig, LMStudioConfig, LlamaCppConfig},
	CurrentProviderConfig:    OllamaConfig,
	ModelConfig: settings.LlmModelConfig{
		ModelName:            "",
		IsTemperatureEnabled: true,
		Temperature:          0.5,
	},
	LanguageConfig: settings.LanguageConfig{
		DefaultInputLanguage:  "English",
		DefaultOutputLanguage: "Ukrainian",
		Languages:             languages[:],
	},
	UseMarkdownForOutput: false,
}
