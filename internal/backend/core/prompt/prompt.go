package prompt

import (
	"fmt"
	promptConst "go_text/internal/backend/constants/prompts"
	promptInterfaces "go_text/internal/backend/interfaces/prompts"
	"go_text/internal/backend/models/prompts"
	"strings"
)

type promptServiceStruct struct {
}

func (p *promptServiceStruct) GetUserPromptsForCategory(category string) ([]prompts.Prompt, error) {
	return promptConst.GetUserPromptsByCategory(category)
}

func (p *promptServiceStruct) GetPrompt(promptId string) (prompts.Prompt, error) {
	prompt, err := promptConst.GetUserPromptById(promptId)
	return prompt, err
}

func (p *promptServiceStruct) GetSystemPrompt(category string) (string, error) {
	systemPrompt, err := promptConst.GetSystemPromptByCategory(category)
	if err != nil {
		return "", err
	}
	return systemPrompt.Value, err
}

func (p *promptServiceStruct) ReplaceTemplateParameter(template, value, prompt string) (string, error) {
	if strings.TrimSpace(prompt) == "" {
		return "", fmt.Errorf("prompt cannot be blank")
	}
	if strings.TrimSpace(template) == "" {
		return prompt, fmt.Errorf("template cannot be blank")
	}
	if !strings.Contains(prompt, template) {
		return prompt, nil
	}
	replaceResult := strings.ReplaceAll(prompt, template, value)
	return replaceResult, nil
}

func NewPromptService() promptInterfaces.PromptService {
	return &promptServiceStruct{}
}
