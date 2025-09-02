package ui

import (
	"fmt"
	"go_text/internal/backend/interfaces/ui"
	"strings"

	promConst "go_text/internal/backend/constants/prompts"
	llmapi "go_text/internal/backend/interfaces/llm"
	"go_text/internal/backend/interfaces/prompts"
	"go_text/internal/backend/interfaces/settings"
	llmModels "go_text/internal/backend/models/llm"
	uiModel "go_text/internal/backend/models/ui"
)

type appUIActionApiStruct struct {
	prompts  prompts.PromptService
	settings settings.SettingsService
	llm      llmapi.LLMService
}

func (h *appUIActionApiStruct) ProcessAction(action uiModel.AppActionObjWrapper) (string, error) {
	// 1. Fetch prompt definitions
	promptDef, err := h.prompts.GetPrompt(action.ActionID)
	if err != nil {
		return "", fmt.Errorf("GetPrompt(%q): %w", action.ActionID, err)
	}

	// 2. Fetch system instructions
	sysPrompt, err := h.prompts.GetSystemPrompt(promptDef.Category)
	if err != nil {
		return "", fmt.Errorf("GetSystemPrompt(%q): %w", promptDef.Category, err)
	}

	// 3. Load all user-configured settings at once
	cfg, err := h.settings.GetCurrentSettings()
	if err != nil {
		return "", fmt.Errorf("GetCurrentSettings: %w", err)
	}

	// 4. Build the user prompt string
	userPrompt, err := h.buildPrompt(promptDef.Value, promptDef.Category, action, cfg.UseMarkdownForOutput)
	if err != nil {
		return "", err
	}

	// 5. Send to LLM and sanitize
	req := llmModels.NewChatCompletionRequest(cfg.ModelName, userPrompt, sysPrompt, cfg.Temperature)
	rawResp, err := h.llm.GetCompletionResponse(req)
	if err != nil {
		return "", fmt.Errorf("GetCompletionResponse: %w", err)
	}

	result, err := h.llm.SanitizeResponse(rawResp)
	if err != nil {
		return "", fmt.Errorf("SanitizeResponse: %w", err)
	}

	return result, nil
}

func (h *appUIActionApiStruct) buildPrompt(
	template, category string,
	action uiModel.AppActionObjWrapper,
	useMarkdown bool,
) (string, error) {
	replacements := map[string]string{
		promConst.TemplateParamText: action.ActionInput,
	}

	if category == promConst.PromptCategoryTranslation {
		replacements[promConst.TemplateParamInputLanguage] = action.ActionInputLanguage
		replacements[promConst.TemplateParamOutputLanguage] = action.ActionOutputLanguage
	}

	if strings.Contains(template, promConst.TemplateParamFormat) {
		format := promConst.OutputFormatPlainText
		if useMarkdown {
			format = promConst.OutputFormatMarkdown
		}
		replacements[promConst.TemplateParamFormat] = format
	}

	var err error
	for token, val := range replacements {
		template, err = h.prompts.ReplaceTemplateParameter(token, val, template)
		if err != nil {
			return "", fmt.Errorf("ReplaceTemplateParameter(%s): %w", token, err)
		}
	}
	return template, nil
}

func NewAppUIActionApi(
	prompts prompts.PromptService,
	settings settings.SettingsService,
	llm llmapi.LLMService,
) ui.AppUIActionApi {
	return &appUIActionApiStruct{prompts: prompts, settings: settings, llm: llm}
}
