package prompt

import (
	"context"
	"fmt"
	"time"

	"go_text/internal/backend/core/utils/string_utils"
	"go_text/internal/v2/backend_api"
	"go_text/internal/v2/constants"
	"go_text/internal/v2/model"
	"go_text/internal/v2/model/action"
	"strings"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type promptServiceStruct struct {
	ctx *context.Context
}

func (p *promptServiceStruct) GetUserPromptsForCategory(category string) ([]model.Prompt, error) {
	startTime := time.Now()
	runtime.LogInfo(*p.ctx, fmt.Sprintf("[GetUserPromptsForCategory] Fetching prompts for category: %s", category))

	prompts, err := constants.GetUserPromptsByCategory(category)
	if err != nil {
		runtime.LogError(*p.ctx, fmt.Sprintf("[GetUserPromptsForCategory] Failed to get prompts for category '%s': %v", category, err))
		return nil, fmt.Errorf("failed to retrieve prompts for category '%s': %w", category, err)
	}

	duration := time.Since(startTime)
	runtime.LogInfo(*p.ctx, fmt.Sprintf("[GetUserPromptsForCategory] Successfully retrieved %d prompts for category '%s' in %v", len(prompts), category, duration))

	return prompts, nil
}

func (p *promptServiceStruct) GetPrompt(promptId string) (model.Prompt, error) {
	startTime := time.Now()
	runtime.LogInfo(*p.ctx, fmt.Sprintf("[GetPrompt] Fetching prompt with ID: %s", promptId))

	prompt, err := constants.GetUserPromptById(promptId)
	if err != nil {
		runtime.LogError(*p.ctx, fmt.Sprintf("[GetPrompt] Failed to get prompt with ID '%s': %v", promptId, err))
		return model.Prompt{}, fmt.Errorf("failed to retrieve prompt with ID '%s': %w", promptId, err)
	}

	duration := time.Since(startTime)
	runtime.LogInfo(*p.ctx, fmt.Sprintf("[GetPrompt] Successfully retrieved prompt '%s' in %v", promptId, duration))

	return prompt, nil
}

func (p *promptServiceStruct) GetSystemPrompt(category string) (string, error) {
	startTime := time.Now()
	runtime.LogInfo(*p.ctx, fmt.Sprintf("[GetSystemPrompt] Fetching system prompt for category: %s", category))

	systemPrompt, err := constants.GetSystemPromptByCategory(category)
	if err != nil {
		runtime.LogError(*p.ctx, fmt.Sprintf("[GetSystemPrompt] Failed to get system prompt for category '%s': %v", category, err))
		return "", fmt.Errorf("failed to retrieve system prompt for category '%s': %w", category, err)
	}

	duration := time.Since(startTime)
	runtime.LogInfo(*p.ctx, fmt.Sprintf("[GetSystemPrompt] Successfully retrieved system prompt for category '%s' in %v", category, duration))

	return systemPrompt.Value, nil
}

func (p *promptServiceStruct) BuildPrompt(template, category string, action *action.ActionRequest, useMarkdown bool) (string, error) {
	startTime := time.Now()
	runtime.LogInfo(*p.ctx, fmt.Sprintf("[BuildPrompt] Building prompt for category: %s, ActionID: %s", category, action.ID))

	if action == nil {
		errorMsg := "action is nil"
		runtime.LogError(*p.ctx, fmt.Sprintf("[BuildPrompt] %s", errorMsg))
		return "", fmt.Errorf("invalid input: %s", errorMsg)
	}
	if string_utils.IsBlankString(template) {
		errorMsg := "invalid template"
		runtime.LogError(*p.ctx, fmt.Sprintf("[BuildPrompt] %s", errorMsg))
		return "", fmt.Errorf("invalid input: %s", errorMsg)
	}
	if string_utils.IsBlankString(category) {
		errorMsg := "invalid category"
		runtime.LogError(*p.ctx, fmt.Sprintf("[BuildPrompt] %s", errorMsg))
		return "", fmt.Errorf("invalid input: %s", errorMsg)
	}

	isTranslation := category == constants.PromptCategoryTranslation
	isValidAction, err := p.isActionRequestValid(action, isTranslation)
	if !isValidAction {
		runtime.LogError(*p.ctx, fmt.Sprintf("[BuildPrompt] Action validation failed: %v", err))
		return "", fmt.Errorf("action validation failed: %w", err)
	}

	replacements := map[string]string{
		constants.TemplateParamText: action.InputText,
	}

	if isTranslation {
		replacements[constants.TemplateParamInputLanguage] = action.InputLanguageID
		replacements[constants.TemplateParamOutputLanguage] = action.OutputLanguageID
	}

	if strings.Contains(template, constants.TemplateParamFormat) {
		format := constants.OutputFormatPlainText
		if useMarkdown {
			format = constants.OutputFormatMarkdown
		}
		replacements[constants.TemplateParamFormat] = format
	}

	for token, val := range replacements {
		originalTemplate := template
		template, err = string_utils.ReplaceTemplateParameter(token, val, template)
		if err != nil {
			runtime.LogError(*p.ctx, fmt.Sprintf("[BuildPrompt] Failed to replace template parameter '%s': %v", token, err))
			return "", fmt.Errorf("template parameter replacement failed for '%s': %w", token, err)
		}
		runtime.LogDebug(*p.ctx, fmt.Sprintf("[BuildPrompt] Replaced parameter '%s' in template. Before: %.50s..., After: %.50s...", token, originalTemplate, template))
	}

	duration := time.Since(startTime)
	runtime.LogInfo(*p.ctx, fmt.Sprintf("[BuildPrompt] Successfully built prompt in %v, Final length: %d characters", duration, len(template)))

	return template, nil
}

func (p *promptServiceStruct) isActionRequestValid(obj *action.ActionRequest, isTranslationAction bool) (bool, error) {
	if obj == nil {
		return false, fmt.Errorf("ActionRequest must not be nil")
	}
	if string_utils.IsBlankString(obj.ID) {
		return false, fmt.Errorf("invalid action id: cannot be empty or whitespace")
	}
	if string_utils.IsBlankString(obj.InputText) {
		return false, fmt.Errorf("invalid action InputText: cannot be empty or whitespace")
	}
	if isTranslationAction {
		if string_utils.IsBlankString(obj.InputLanguageID) {
			return false, fmt.Errorf("invalid action InputLanguageID: cannot be empty or whitespace")
		}
		if string_utils.IsBlankString(obj.OutputLanguageID) {
			return false, fmt.Errorf("invalid action OutputLanguageID: cannot be empty or whitespace")
		}
	}
	return true, nil
}

func NewPromptService(ctx *context.Context) backend_api.PromptApi {
	return &promptServiceStruct{
		ctx: ctx,
	}
}
