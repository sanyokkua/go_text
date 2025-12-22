package constants

import (
	"errors"
	"go_text/backend/v2/model"
)

func GetAppPrompts() *model.AppPrompts {
	return &ApplicationPrompts
}

func GetSystemPromptByCategory(category string) (model.Prompt, error) {
	prompt, ok := ApplicationPrompts.PromptGroups[category]
	if !ok {
		return model.Prompt{}, errors.New("unknown prompt category")
	}
	return prompt.SystemPrompt, nil
}

func GetUserPromptById(id string) (model.Prompt, error) {
	for _, v := range ApplicationPrompts.PromptGroups {
		prompt, ok := v.Prompts[id]
		if !ok {
			continue
		}
		return prompt, nil
	}

	return model.Prompt{}, errors.New("unknown prompt id")
}
