package constants

import (
	"errors"
	"go_text/internal/v2/model"
)

func GetSystemPromptByCategory(category string) (model.Prompt, error) {
	prompt, ok := systemPromptByCategory[category]
	if !ok {
		return model.Prompt{}, errors.New("unknown prompt category")
	}
	return prompt, nil
}

func GetUserPromptById(id string) (model.Prompt, error) {
	prompt, ok := userPrompts[id]
	if !ok {
		return model.Prompt{}, errors.New("unknown prompt id")
	}
	return prompt, nil
}

func GetUserPromptsByCategory(category string) ([]model.Prompt, error) {
	items, ok := userPromptsByCategory[category]
	if !ok {
		return nil, errors.New("unknown prompt category")
	}
	return items, nil
}
