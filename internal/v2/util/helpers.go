package util

import (
	"go_text/internal/v2/model/action"
	"go_text/internal/v2/model/llm"
	"go_text/internal/v2/model/settings"
	"strings"
)

// Action Functions

func NewActionItem(actionId, actionText string) *action.Action {
	return &action.Action{
		ID:   actionId,
		Text: actionText,
	}
}

func NewActionGroup(groupName string, actions []action.Action) *action.Group {
	return &action.Group{
		GroupName:    groupName,
		GroupActions: actions,
	}
}

func NewActions(actionGroups []action.Group) *action.Actions {
	return &action.Actions{
		ActionGroups: actionGroups,
	}
}

// Completion list request

func NewMessage(role, content string) llm.Message {
	return llm.Message{
		Role:    role,
		Content: strings.TrimSpace(content),
	}
}

func NewChatCompletionRequest(cfg *settings.Settings, userPrompt, systemPrompt string) llm.ChatCompletionRequest {
	systemMsg := NewMessage(llm.RoleSystemMsg, systemPrompt)
	userMsg := NewMessage(llm.RoleUserMsg, userPrompt)

	modelName := cfg.ModelConfig.ModelName
	temperature := cfg.ModelConfig.Temperature
	isTemperatureEnabled := cfg.ModelConfig.IsTemperatureEnabled
	isOllama := cfg.CurrentProviderConfig.ProviderType == settings.ProviderTypeOllama

	req := llm.ChatCompletionRequest{
		Model: modelName,
		Messages: []llm.Message{
			systemMsg,
			userMsg,
		},
		Stream: false,
		N:      1,
	}

	// Only include temperature when enabled
	if isTemperatureEnabled {
		req.Temperature = &temperature
		if isOllama {
			req.Options = &llm.Options{
				Temperature: temperature,
			}
		}
	}

	return req
}
