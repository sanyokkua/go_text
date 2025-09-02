package prompts

import (
	"errors"
	"go_text/internal/backend/models/prompts"
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

func GetSystemPromptByCategory(category string) (prompts.Prompt, error) {
	prompt, ok := systemPromptByCategory[category]
	if !ok {
		return prompts.Prompt{}, errors.New("unknown prompt category")
	}
	return prompt, nil
}

func GetUserPromptById(id string) (prompts.Prompt, error) {
	prompt, ok := userPrompts[id]
	if !ok {
		return prompts.Prompt{}, errors.New("unknown prompt id")
	}
	return prompt, nil
}

func GetUserPromptsByCategory(category string) ([]prompts.Prompt, error) {
	items, ok := userPromptsByCategory[category]
	if !ok {
		return nil, errors.New("unknown prompt category")
	}
	return items, nil
}
