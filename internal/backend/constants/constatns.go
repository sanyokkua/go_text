package constants

import (
	"go_text/internal/backend/models"
)

const DefaultOllamaBaseUrl = "http://localhost:11434"

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

var DefaultSetting = models.Settings{
	BaseUrl:               DefaultOllamaBaseUrl,
	Headers:               map[string]string{},
	ModelName:             "",
	Temperature:           0.5,
	DefaultInputLanguage:  "English",
	DefaultOutputLanguage: "Ukrainian",
	Languages:             languages[:],
	UseMarkdownForOutput:  false,
}
