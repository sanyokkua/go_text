package completion

import (
	"fmt"
	"go_text/backend/v2/backend_api"
	"go_text/backend/v2/constants"
	"go_text/backend/v2/model/action"
	"go_text/backend/v2/model/llm"
	"go_text/backend/v2/model/settings"
	"slices"
	"strings"
	"time"
)

type completionService struct {
	logger          backend_api.LoggingApi
	stringUtils     backend_api.StringUtilsApi
	promptService   backend_api.PromptApi
	settingsService backend_api.SettingsServiceApi
	llmService      backend_api.LlmApi
}

func (c completionService) ProcessAction(action action.ActionRequest) (string, error) {
	startTime := time.Now()
	actionID := action.ID
	c.logger.LogInfo(fmt.Sprintf("[completionService.ProcessAction] Starting action processing - ActionID: %s", actionID))

	if c.stringUtils.IsBlankString(actionID) {
		c.logger.LogError("[completionService.ProcessAction] Action ID is empty")
		return "", fmt.Errorf("action id is blank")
	}

	// 1. Fetch prompt definitions
	promptDef, err := c.promptService.GetPrompt(actionID)
	if err != nil {
		c.logger.LogError(fmt.Sprintf("[completionService.ProcessAction] Failed to get prompt definition - ActionID: %s, Error: %v", actionID, err))
		return "", fmt.Errorf("failed to GetPrompt(%q): %w", actionID, err)
	}
	c.logger.LogDebug(fmt.Sprintf("[completionService.ProcessAction] Retrieved prompt definition - ActionID: %s, Category: %s", actionID, promptDef.Category))

	// 2. Fetch system instructions
	sysPromptStart := time.Now()
	sysPrompt, err := c.promptService.GetSystemPrompt(promptDef.Category)
	if err != nil {
		c.logger.LogError(fmt.Sprintf("[completionService.ProcessAction] Failed to get system prompt - Category: %s, Error: %v", promptDef.Category, err))
		return "", fmt.Errorf("failed to GetSystemPrompt(%q): %w", promptDef.Category, err)
	}
	sysPromptDuration := time.Since(sysPromptStart)
	c.logger.LogDebug(fmt.Sprintf("[completionService.ProcessAction] Retrieved system prompt - Category: %s, Duration: %dms", promptDef.Category, sysPromptDuration.Milliseconds()))

	// 3. Load all user-configured settings at once
	cfg, err := c.settingsService.GetCurrentSettings()
	if err != nil {
		c.logger.LogError(fmt.Sprintf("[completionService.ProcessAction] Failed to load settings - Error: %v", err))
		return "", fmt.Errorf("failed to load settings: %w", err)
	}
	c.logger.LogInfo(fmt.Sprintf("[completionService.ProcessAction] Loaded current settings - Provider: %s, Model: %s",
		cfg.CurrentProviderConfig.ProviderName, cfg.ModelConfig.ModelName))

	// Validate configuration
	if c.stringUtils.IsBlankString(cfg.CurrentProviderConfig.BaseUrl) {
		c.logger.LogError(fmt.Sprintf("[completionService.ProcessAction] Provider BaseURL not configured - Provider: %s", cfg.CurrentProviderConfig.ProviderName))
		return "", fmt.Errorf("provider BaseURL is not configured properly")
	}

	if c.stringUtils.IsBlankString(cfg.CurrentProviderConfig.CompletionEndpoint) {
		c.logger.LogError(fmt.Sprintf("[completionService.ProcessAction] Provider completion endpoint not configured - Provider: %s", cfg.CurrentProviderConfig.ProviderName))
		return "", fmt.Errorf("provider completion endpoint is not configured properly")
	}

	if c.stringUtils.IsBlankString(cfg.ModelConfig.ModelName) {
		c.logger.LogError(fmt.Sprintf("[completionService.ProcessAction] Model not configured - Provider: %s", cfg.CurrentProviderConfig.ProviderName))
		return "", fmt.Errorf("model is not configured properly")
	}

	// 4. Validate model availability
	modelsList, err := c.llmService.GetModelsList()
	providerName := cfg.CurrentProviderConfig.ProviderName
	if err != nil {
		c.logger.LogError(fmt.Sprintf("[completionService.ProcessAction] Failed to get models list - Provider: %s, Error: %v", providerName, err))
		return "", fmt.Errorf("failed to load models: %w, for provider: %s", err, providerName)
	}

	if len(modelsList) == 0 {
		c.logger.LogWarn(fmt.Sprintf("[completionService.ProcessAction] No models available from provider - Provider: %s", providerName))
	}

	if !slices.Contains(modelsList, cfg.ModelConfig.ModelName) {
		c.logger.LogWarn(fmt.Sprintf("[completionService.ProcessAction] Configured model not found - Model: %s, Provider: %s, Available models: %v",
			cfg.ModelConfig.ModelName, providerName, modelsList))
	}

	// 5. Build the user prompt string
	userPrompt, err := c.promptService.BuildPrompt(promptDef.Value, promptDef.Category, &action, cfg.UseMarkdownForOutput)
	if err != nil {
		c.logger.LogError(fmt.Sprintf("[completionService.ProcessAction] Failed to build user prompt - ActionID: %s, Category: %s, Error: %v",
			actionID, promptDef.Category, err))
		return "", err
	}
	c.logger.LogDebug(fmt.Sprintf("[completionService.ProcessAction] Built user prompt - ActionID: %s, Length: %d chars", actionID, len(userPrompt)))

	// 6. Check for same-language translation optimization
	if promptDef.Category == constants.PromptCategoryTranslation && action.InputLanguageID == action.OutputLanguageID {
		c.logger.LogInfo(fmt.Sprintf("[completionService.ProcessAction] Skipping translation - same language (%s) - ActionID: %s",
			action.InputLanguageID, actionID))
		return action.InputText, nil
	}

	// 7. Send to LLM and sanitize
	llmStart := time.Now()
	req := NewChatCompletionRequest(cfg, userPrompt, sysPrompt)
	rawResp, err := c.llmService.GetCompletionResponse(&req)
	llmDuration := time.Since(llmStart)

	if err != nil {
		c.logger.LogError(fmt.Sprintf("[completionService.ProcessAction] LLM completion failed - ActionID: %s, Model: %s, Provider: %s, Duration: %dms, Error: %v",
			actionID, cfg.ModelConfig.ModelName, providerName, llmDuration.Milliseconds(), err))
		return "", fmt.Errorf("failed to get completion result: %w", err)
	}

	c.logger.LogInfo(fmt.Sprintf("[completionService.ProcessAction] LLM completion successful - ActionID: %s, Model: %s, Provider: %s, Duration: %dms, Response length: %d chars",
		actionID, cfg.ModelConfig.ModelName, providerName, llmDuration.Milliseconds(), len(rawResp)))

	result, err := c.stringUtils.SanitizeReasoningBlock(rawResp)
	if err != nil {
		c.logger.LogError(fmt.Sprintf("[completionService.ProcessAction] Failed to sanitize response - ActionID: %s, Error: %v", actionID, err))
		return "", fmt.Errorf("SanitizeResponse: %w", err)
	}

	totalDuration := time.Since(startTime)
	c.logger.LogInfo(fmt.Sprintf("[completionService.ProcessAction] Action completed successfully - ActionID: %s, Category: %s, Total duration: %dms, Result length: %d chars",
		actionID, promptDef.Category, totalDuration.Milliseconds(), len(result)))

	return result, nil
}

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

func NewCompletionApiService(logger backend_api.LoggingApi,
	stringUtils backend_api.StringUtilsApi,
	promptService backend_api.PromptApi,
	settingsService backend_api.SettingsServiceApi,
	llmService backend_api.LlmApi,
) backend_api.CompletionApi {
	return &completionService{
		logger:          logger,
		stringUtils:     stringUtils,
		promptService:   promptService,
		settingsService: settingsService,
		llmService:      llmService,
	}
}
