package constants

import (
	"errors"
	"go_text/internal/backend/models"
)

func GetSystemPromptByCategory(category string) (models.Prompt, error) {
	prompt, ok := systemPromptByCategory[category]
	if !ok {
		return models.Prompt{}, errors.New("unknown prompt category")
	}
	return prompt, nil
}

func GetUserPromptById(id string) (models.Prompt, error) {
	prompt, ok := userPrompts[id]
	if !ok {
		return models.Prompt{}, errors.New("unknown prompt id")
	}
	return prompt, nil
}

func GetUserPromptsByCategory(category string) ([]models.Prompt, error) {
	items, ok := userPromptsByCategory[category]
	if !ok {
		return nil, errors.New("unknown prompt category")
	}
	return items, nil
}
