package backend

import (
	"go_text/backend/model"
	"go_text/backend/model/action"
)

type PromptApi interface {
	GetAppPrompts() *model.AppPrompts
	GetSystemPromptByCategory(category string) (model.Prompt, error)
	GetUserPromptById(id string) (model.Prompt, error)
	GetPrompt(promptId string) (model.Prompt, error)
	GetSystemPrompt(category string) (string, error)
	BuildPrompt(template, category string, action *action.ActionRequest, useMarkdown bool) (string, error)
}
