package backend_api

import (
	"go_text/backend/v2/model"
	"go_text/backend/v2/model/action"
)

type PromptApi interface {
	GetAppPrompts() *model.AppPrompts
	GetPrompt(promptId string) (model.Prompt, error)
	GetSystemPrompt(category string) (string, error)
	BuildPrompt(template, category string, action *action.ActionRequest, useMarkdown bool) (string, error)
}
