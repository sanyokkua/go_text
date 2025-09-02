package prompts

import "go_text/internal/backend/models/prompts"

type PromptService interface {
	GetUserPromptsForCategory(category string) ([]prompts.Prompt, error)
	GetPrompt(promptId string) (prompts.Prompt, error)
	GetSystemPrompt(category string) (string, error)
	ReplaceTemplateParameter(template, value, prompt string) (string, error)
}
