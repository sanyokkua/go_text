package backend_api

import (
	"go_text/internal/v2/model"
	"go_text/internal/v2/model/action"
)

type PromptApi interface {
	GetUserPromptsForCategory(category string) ([]model.Prompt, error)
	GetPrompt(promptId string) (model.Prompt, error)
	GetSystemPrompt(category string) (string, error)
	BuildPrompt(template, category string, action *action.ActionRequest, useMarkdown bool) (string, error)
}
