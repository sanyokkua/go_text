package ui

import (
	"fmt"
	"go_text/internal/backend/constants"
	"go_text/internal/backend/core/llm_client"
	"go_text/internal/backend/core/prompt"
	"go_text/internal/backend/core/settings"
	"go_text/internal/backend/core/utils"
	"go_text/internal/backend/models"
	"slices"
)

type AppUIActionApi interface {
	ProcessAction(action models.AppActionObjWrapper) (string, error)
}

type appUIActionApiStruct struct {
	promptService   prompt.PromptService
	settingsService settings.SettingsService
	llmService      llm_client.AppLLMService
	utilsService    utils.UtilsService
}

func (h *appUIActionApiStruct) ProcessAction(action models.AppActionObjWrapper) (string, error) {
	if h.utilsService.IsBlankString(action.ActionID) {
		return "", fmt.Errorf("invalid action id")
	}
	// 1. Fetch prompt definitions
	promptDef, err := h.promptService.GetPrompt(action.ActionID)
	if err != nil {
		return "", fmt.Errorf("GetPrompt(%q): %w", action.ActionID, err)
	}

	// 2. Fetch system instructions
	sysPrompt, err := h.promptService.GetSystemPrompt(promptDef.Category)
	if err != nil {
		return "", fmt.Errorf("GetSystemPrompt(%q): %w", promptDef.Category, err)
	}

	// 3. Load all user-configured settingsService at once
	cfg, err := h.settingsService.GetCurrentSettings()
	if err != nil {
		return "", fmt.Errorf("GetCurrentSettings: %w", err)
	}

	// Validate config is present
	if h.utilsService.IsBlankString(cfg.BaseUrl) || h.utilsService.IsBlankString(cfg.ModelName) {
		return "", fmt.Errorf("model and provider are not configured properly")
	}

	if h.utilsService.IsBlankString(cfg.CompletionEndpoint) {
		return "", fmt.Errorf("empty completion endpoint")
	}

	modelsList, err := h.llmService.GetModelsList()
	if err != nil || len(modelsList) == 0 {
		return "", fmt.Errorf("failed to load models: %w", err)
	}
	if !slices.Contains(modelsList, cfg.ModelName) {
		return "", fmt.Errorf("model '%s' not found in provider", cfg.ModelName)
	}

	// 4. Build the user prompt string
	userPrompt, err := h.utilsService.BuildPrompt(promptDef.Value, promptDef.Category, &action, cfg.UseMarkdownForOutput)
	if err != nil {
		return "", err
	}

	// Check if the input/output langs for translation are the same to not do the additional LLM call
	if promptDef.Category == constants.PromptCategoryTranslation && action.ActionInputLanguage == action.ActionOutputLanguage {
		return action.ActionInput, nil
	}

	// 5. Send to LLM and sanitize
	messages := []models.Message{
		models.NewMessage("system", sysPrompt),
		models.NewMessage("user", userPrompt),
	}

	req := models.ChatCompletionRequest{
		Model:    cfg.ModelName,
		Messages: messages,
		Stream:   false,
		N:        1,
	}

	if cfg.IsTemperatureEnabled {
		t := cfg.Temperature
		req.Temperature = &t
		req.Options = &models.Options{Temperature: t}
	}

	// req := models.NewChatCompletionRequest(cfg.ModelName, userPrompt, sysPrompt, cfg.Temperature) // OLD

	rawResp, err := h.llmService.GetCompletionResponse(&req)
	if err != nil {
		return "", fmt.Errorf("GetCompletionResponse: %w", err)
	}

	result, err := h.utilsService.SanitizeReasoningBlock(rawResp)
	if err != nil {
		return "", fmt.Errorf("SanitizeResponse: %w", err)
	}

	return result, nil
}

func NewAppUIActionApi(prompts prompt.PromptService, settings settings.SettingsService, llmService llm_client.AppLLMService, utilsService utils.UtilsService) AppUIActionApi {
	return &appUIActionApiStruct{promptService: prompts, settingsService: settings, llmService: llmService, utilsService: utilsService}
}
