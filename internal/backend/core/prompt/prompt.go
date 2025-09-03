package prompt

import (
	"go_text/internal/backend/constants"
	"go_text/internal/backend/models"
)

type PromptService interface {
	GetUserPromptsForCategory(category string) ([]models.Prompt, error)
	GetPrompt(promptId string) (models.Prompt, error)
	GetSystemPrompt(category string) (string, error)
}

type promptServiceStruct struct {
}

func (p *promptServiceStruct) GetUserPromptsForCategory(category string) ([]models.Prompt, error) {
	return constants.GetUserPromptsByCategory(category)
}

func (p *promptServiceStruct) GetPrompt(promptId string) (models.Prompt, error) {
	prompt, err := constants.GetUserPromptById(promptId)
	return prompt, err
}

func (p *promptServiceStruct) GetSystemPrompt(category string) (string, error) {
	systemPrompt, err := constants.GetSystemPromptByCategory(category)
	if err != nil {
		return "", err
	}
	return systemPrompt.Value, err
}

func NewPromptService() PromptService {
	return &promptServiceStruct{}
}
