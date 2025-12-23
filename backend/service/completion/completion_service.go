package completion

import (
	"fmt"
	"go_text/backend/abstract/backend"
	"go_text/backend/constant"
	"go_text/backend/model/action"
	"go_text/backend/model/llm"
	"go_text/backend/model/settings"
	"slices"
	"strings"
	"time"
)

type completionService struct {
	logger          backend.LoggingApi
	stringUtils     backend.StringUtilsApi
	promptService   backend.PromptApi
	settingsService backend.SettingsServiceApi
	llmService      backend.LlmApi
}

func (c completionService) ProcessAction(action action.ActionRequest) (string, error) {
	startTime := time.Now()
	actionID := action.ID
	c.logger.Info(fmt.Sprintf("[completionService.ProcessAction] Starting action processing - ActionID: %s", actionID))

	if c.stringUtils.IsBlankString(actionID) {
		c.logger.Error("[completionService.ProcessAction] Action ID is empty")
		return "", fmt.Errorf("action id is blank")
	}

	// 1. Fetch prompt definitions
	promptDef, err := c.promptService.GetPrompt(actionID)
	if err != nil {
		c.logger.Error(fmt.Sprintf("[completionService.ProcessAction] Failed to get prompt definition - ActionID: %s, Error: %v", actionID, err))
		return "", fmt.Errorf("failed to GetPrompt(%q): %w", actionID, err)
	}
	c.logger.Trace(fmt.Sprintf("[completionService.ProcessAction] Retrieved prompt definition - ActionID: %s, Category: %s", actionID, promptDef.Category))

	// 2. Fetch system instructions
	sysPromptStart := time.Now()
	sysPrompt, err := c.promptService.GetSystemPrompt(promptDef.Category)
	if err != nil {
		c.logger.Error(fmt.Sprintf("[completionService.ProcessAction] Failed to get system prompt - Category: %s, Error: %v", promptDef.Category, err))
		return "", fmt.Errorf("failed to GetSystemPrompt(%q): %w", promptDef.Category, err)
	}
	sysPromptDuration := time.Since(sysPromptStart)
	c.logger.Trace(fmt.Sprintf("[completionService.ProcessAction] Retrieved system prompt - Category: %s, Duration: %dms", promptDef.Category, sysPromptDuration.Milliseconds()))

	// 3. Load all user-configured settings at once
	cfg, err := c.settingsService.GetCurrentSettings()
	if err != nil {
		c.logger.Error(fmt.Sprintf("[completionService.ProcessAction] Failed to load settings - Error: %v", err))
		return "", fmt.Errorf("failed to load settings: %w", err)
	}
	c.logger.Info(fmt.Sprintf("[completionService.ProcessAction] Loaded current settings - Provider: %s, Model: %s",
		cfg.CurrentProviderConfig.ProviderName, cfg.ModelConfig.ModelName))

	// Validate configuration
	if c.stringUtils.IsBlankString(cfg.CurrentProviderConfig.BaseUrl) {
		c.logger.Error(fmt.Sprintf("[completionService.ProcessAction] Provider BaseURL not configured - Provider: %s", cfg.CurrentProviderConfig.ProviderName))
		return "", fmt.Errorf("provider BaseURL is not configured properly")
	}

	if c.stringUtils.IsBlankString(cfg.CurrentProviderConfig.CompletionEndpoint) {
		c.logger.Error(fmt.Sprintf("[completionService.ProcessAction] Provider completion endpoint not configured - Provider: %s", cfg.CurrentProviderConfig.ProviderName))
		return "", fmt.Errorf("provider completion endpoint is not configured properly")
	}

	if c.stringUtils.IsBlankString(cfg.ModelConfig.ModelName) {
		c.logger.Error(fmt.Sprintf("[completionService.ProcessAction] Model not configured - Provider: %s", cfg.CurrentProviderConfig.ProviderName))
		return "", fmt.Errorf("model is not configured properly")
	}

	// 4. Validate model availability
	modelsList, err := c.llmService.GetModelsList()
	providerName := cfg.CurrentProviderConfig.ProviderName
	if err != nil {
		c.logger.Error(fmt.Sprintf("[completionService.ProcessAction] Failed to get models list - Provider: %s, Error: %v", providerName, err))
		return "", fmt.Errorf("failed to load models: %w, for provider: %s", err, providerName)
	}

	if len(modelsList) == 0 {
		c.logger.Warning(fmt.Sprintf("[completionService.ProcessAction] No models available from provider - Provider: %s", providerName))
	}

	if !slices.Contains(modelsList, cfg.ModelConfig.ModelName) {
		c.logger.Warning(fmt.Sprintf("[completionService.ProcessAction] Configured model not found - Model: %s, Provider: %s, Available models: %v",
			cfg.ModelConfig.ModelName, providerName, modelsList))
	}

	// 5. Build the user prompt string
	userPrompt, err := c.promptService.BuildPrompt(promptDef.Value, promptDef.Category, &action, cfg.UseMarkdownForOutput)
	if err != nil {
		c.logger.Error(fmt.Sprintf("[completionService.ProcessAction] Failed to build user prompt - ActionID: %s, Category: %s, Error: %v",
			actionID, promptDef.Category, err))
		return "", err
	}
	c.logger.Trace(fmt.Sprintf("[completionService.ProcessAction] Built user prompt - ActionID: %s, Length: %d chars", actionID, len(userPrompt)))

	// 6. Check for same-language translation optimization
	if promptDef.Category == constant.PromptCategoryTranslation && action.InputLanguageID == action.OutputLanguageID {
		c.logger.Info(fmt.Sprintf("[completionService.ProcessAction] Skipping translation - same language (%s) - ActionID: %s",
			action.InputLanguageID, actionID))
		return action.InputText, nil
	}

	// 7. Send to LLM and sanitize
	llmStart := time.Now()
	req := NewChatCompletionRequest(cfg, userPrompt, sysPrompt)
	rawResp, err := c.llmService.GetCompletionResponse(&req)
	llmDuration := time.Since(llmStart)

	if err != nil {
		c.logger.Error(fmt.Sprintf("[completionService.ProcessAction] LLM completion failed - ActionID: %s, Model: %s, Provider: %s, Duration: %dms, Error: %v",
			actionID, cfg.ModelConfig.ModelName, providerName, llmDuration.Milliseconds(), err))
		return "", fmt.Errorf("failed to get completion result: %w", err)
	}

	c.logger.Info(fmt.Sprintf("[completionService.ProcessAction] LLM completion successful - ActionID: %s, Model: %s, Provider: %s, Duration: %dms, Response length: %d chars",
		actionID, cfg.ModelConfig.ModelName, providerName, llmDuration.Milliseconds(), len(rawResp)))

	result, err := c.stringUtils.SanitizeReasoningBlock(rawResp)
	if err != nil {
		c.logger.Error(fmt.Sprintf("[completionService.ProcessAction] Failed to sanitize response - ActionID: %s, Error: %v", actionID, err))
		return "", fmt.Errorf("SanitizeResponse: %w", err)
	}

	totalDuration := time.Since(startTime)
	c.logger.Info(fmt.Sprintf("[completionService.ProcessAction] Action completed successfully - ActionID: %s, Category: %s, Total duration: %dms, Result length: %d chars",
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

func NewCompletionApiService(logger backend.LoggingApi,
	stringUtils backend.StringUtilsApi,
	promptService backend.PromptApi,
	settingsService backend.SettingsServiceApi,
	llmService backend.LlmApi,
) backend.CompletionApi {
	return &completionService{
		logger:          logger,
		stringUtils:     stringUtils,
		promptService:   promptService,
		settingsService: settingsService,
		llmService:      llmService,
	}
}
