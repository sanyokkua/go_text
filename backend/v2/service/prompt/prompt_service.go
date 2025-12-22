package prompt

import (
	"fmt"
	backend_api2 "go_text/backend/v2/abstract/backend"
	"go_text/backend/v2/constant"
	"go_text/backend/v2/model"
	"go_text/backend/v2/model/action"
	"strings"
	"time"
)

type promptServiceStruct struct {
	logger      backend_api2.LoggingApi
	stringUtils backend_api2.StringUtilsApi
}

func (p *promptServiceStruct) GetAppPrompts() *model.AppPrompts {
	return constant.GetAppPrompts()
}

func (p *promptServiceStruct) GetPrompt(promptId string) (model.Prompt, error) {
	startTime := time.Now()
	p.logger.LogInfo(fmt.Sprintf("[GetPrompt] Fetching prompt with ID: %s", promptId))

	prompt, err := constant.GetUserPromptById(promptId)
	if err != nil {
		p.logger.LogError(fmt.Sprintf("[GetPrompt] Failed to get prompt with ID '%s': %v", promptId, err))
		return model.Prompt{}, fmt.Errorf("failed to retrieve prompt with ID '%s': %w", promptId, err)
	}

	duration := time.Since(startTime)
	p.logger.LogInfo(fmt.Sprintf("[GetPrompt] Successfully retrieved prompt '%s' in %v", promptId, duration))

	return prompt, nil
}

func (p *promptServiceStruct) GetSystemPrompt(category string) (string, error) {
	startTime := time.Now()
	p.logger.LogInfo(fmt.Sprintf("[GetSystemPrompt] Fetching system prompt for category: %s", category))

	systemPrompt, err := constant.GetSystemPromptByCategory(category)
	if err != nil {
		p.logger.LogError(fmt.Sprintf("[GetSystemPrompt] Failed to get system prompt for category '%s': %v", category, err))
		return "", fmt.Errorf("failed to retrieve system prompt for category '%s': %w", category, err)
	}

	duration := time.Since(startTime)
	p.logger.LogInfo(fmt.Sprintf("[GetSystemPrompt] Successfully retrieved system prompt for category '%s' in %v", category, duration))

	return systemPrompt.Value, nil
}

func (p *promptServiceStruct) BuildPrompt(template, category string, action *action.ActionRequest, useMarkdown bool) (string, error) {
	startTime := time.Now()
	p.logger.LogInfo(fmt.Sprintf("[BuildPrompt] Building prompt for category: %s, ActionID: %s", category, action.ID))

	if action == nil {
		errorMsg := "action is nil"
		p.logger.LogError(fmt.Sprintf("[BuildPrompt] %s", errorMsg))
		return "", fmt.Errorf("invalid input: %s", errorMsg)
	}
	if p.stringUtils.IsBlankString(template) {
		errorMsg := "invalid template"
		p.logger.LogError(fmt.Sprintf("[BuildPrompt] %s", errorMsg))
		return "", fmt.Errorf("invalid input: %s", errorMsg)
	}
	if p.stringUtils.IsBlankString(category) {
		errorMsg := "invalid category"
		p.logger.LogError(fmt.Sprintf("[BuildPrompt] %s", errorMsg))
		return "", fmt.Errorf("invalid input: %s", errorMsg)
	}

	isTranslation := category == constant.PromptCategoryTranslation
	isValidAction, err := p.isActionRequestValid(action, isTranslation)
	if !isValidAction {
		p.logger.LogError(fmt.Sprintf("[BuildPrompt] Action validation failed: %v", err))
		return "", fmt.Errorf("action validation failed: %w", err)
	}

	replacements := map[string]string{
		constant.TemplateParamText: action.InputText,
	}

	if isTranslation {
		replacements[constant.TemplateParamInputLanguage] = action.InputLanguageID
		replacements[constant.TemplateParamOutputLanguage] = action.OutputLanguageID
	}

	if strings.Contains(template, constant.TemplateParamFormat) {
		format := constant.OutputFormatPlainText
		if useMarkdown {
			format = constant.OutputFormatMarkdown
		}
		replacements[constant.TemplateParamFormat] = format
	}

	for token, val := range replacements {
		originalTemplate := template
		template, err = p.stringUtils.ReplaceTemplateParameter(token, val, template)
		if err != nil {
			p.logger.LogError(fmt.Sprintf("[BuildPrompt] Failed to replace template parameter '%s': %v", token, err))
			return "", fmt.Errorf("template parameter replacement failed for '%s': %w", token, err)
		}
		p.logger.LogDebug(fmt.Sprintf("[BuildPrompt] Replaced parameter '%s' in template. Before: %.50s..., After: %.50s...", token, originalTemplate, template))
	}

	duration := time.Since(startTime)
	p.logger.LogInfo(fmt.Sprintf("[BuildPrompt] Successfully built prompt in %v, Final length: %d characters", duration, len(template)))

	return template, nil
}

func (p *promptServiceStruct) isActionRequestValid(obj *action.ActionRequest, isTranslationAction bool) (bool, error) {
	if obj == nil {
		return false, fmt.Errorf("ActionRequest must not be nil")
	}
	if p.stringUtils.IsBlankString(obj.ID) {
		return false, fmt.Errorf("invalid action id: cannot be empty or whitespace")
	}
	if p.stringUtils.IsBlankString(obj.InputText) {
		return false, fmt.Errorf("invalid action InputText: cannot be empty or whitespace")
	}
	if isTranslationAction {
		if p.stringUtils.IsBlankString(obj.InputLanguageID) {
			return false, fmt.Errorf("invalid action InputLanguageID: cannot be empty or whitespace")
		}
		if p.stringUtils.IsBlankString(obj.OutputLanguageID) {
			return false, fmt.Errorf("invalid action OutputLanguageID: cannot be empty or whitespace")
		}
	}
	return true, nil
}

func NewPromptService(logger backend_api2.LoggingApi, stringUtils backend_api2.StringUtilsApi) backend_api2.PromptApi {
	return &promptServiceStruct{
		logger:      logger,
		stringUtils: stringUtils,
	}
}
