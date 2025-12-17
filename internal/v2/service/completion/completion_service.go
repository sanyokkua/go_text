package completion

import (
	"context"
	"fmt"
	"go_text/internal/v2/backend_api"
	"go_text/internal/v2/constants"
	"go_text/internal/v2/model/action"
	"go_text/internal/v2/util"
	"slices"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type completionService struct {
	ctx             *context.Context
	stringUtils     backend_api.StringUtilsApi
	promptService   backend_api.PromptApi
	settingsService backend_api.SettingsServiceApi
	llmService      backend_api.LlmApi
}

func (c completionService) ProcessAction(action action.ActionRequest) (string, error) {
	startTime := time.Now()
	actionID := action.ID
	runtime.LogInfo(*c.ctx, fmt.Sprintf("[completionService.ProcessAction] Starting action processing - ActionID: %s", actionID))

	if c.stringUtils.IsBlankString(actionID) {
		runtime.LogError(*c.ctx, "[completionService.ProcessAction] Action ID is empty")
		return "", fmt.Errorf("action id is blank")
	}

	// 1. Fetch prompt definitions
	promptDef, err := c.promptService.GetPrompt(actionID)
	if err != nil {
		runtime.LogError(*c.ctx, fmt.Sprintf("[completionService.ProcessAction] Failed to get prompt definition - ActionID: %s, Error: %v", actionID, err))
		return "", fmt.Errorf("failed to GetPrompt(%q): %w", actionID, err)
	}
	runtime.LogDebug(*c.ctx, fmt.Sprintf("[completionService.ProcessAction] Retrieved prompt definition - ActionID: %s, Category: %s", actionID, promptDef.Category))

	// 2. Fetch system instructions
	sysPromptStart := time.Now()
	sysPrompt, err := c.promptService.GetSystemPrompt(promptDef.Category)
	if err != nil {
		runtime.LogError(*c.ctx, fmt.Sprintf("[completionService.ProcessAction] Failed to get system prompt - Category: %s, Error: %v", promptDef.Category, err))
		return "", fmt.Errorf("failed to GetSystemPrompt(%q): %w", promptDef.Category, err)
	}
	sysPromptDuration := time.Since(sysPromptStart)
	runtime.LogDebug(*c.ctx, fmt.Sprintf("[completionService.ProcessAction] Retrieved system prompt - Category: %s, Duration: %dms", promptDef.Category, sysPromptDuration.Milliseconds()))

	// 3. Load all user-configured settings at once
	cfg, err := c.settingsService.GetCurrentSettings()
	if err != nil {
		runtime.LogError(*c.ctx, fmt.Sprintf("[completionService.ProcessAction] Failed to load settings - Error: %v", err))
		return "", fmt.Errorf("failed to load settings: %w", err)
	}
	runtime.LogInfo(*c.ctx, fmt.Sprintf("[completionService.ProcessAction] Loaded current settings - Provider: %s, Model: %s",
		cfg.CurrentProviderConfig.ProviderName, cfg.ModelConfig.ModelName))

	// Validate configuration
	if c.stringUtils.IsBlankString(cfg.CurrentProviderConfig.BaseUrl) {
		runtime.LogError(*c.ctx, fmt.Sprintf("[completionService.ProcessAction] Provider BaseURL not configured - Provider: %s", cfg.CurrentProviderConfig.ProviderName))
		return "", fmt.Errorf("provider BaseURL is not configured properly")
	}

	if c.stringUtils.IsBlankString(cfg.CurrentProviderConfig.CompletionEndpoint) {
		runtime.LogError(*c.ctx, fmt.Sprintf("[completionService.ProcessAction] Provider completion endpoint not configured - Provider: %s", cfg.CurrentProviderConfig.ProviderName))
		return "", fmt.Errorf("provider completion endpoint is not configured properly")
	}

	if c.stringUtils.IsBlankString(cfg.ModelConfig.ModelName) {
		runtime.LogError(*c.ctx, fmt.Sprintf("[completionService.ProcessAction] Model not configured - Provider: %s", cfg.CurrentProviderConfig.ProviderName))
		return "", fmt.Errorf("model is not configured properly")
	}

	// 4. Validate model availability
	modelsList, err := c.llmService.GetModelsList()
	providerName := cfg.CurrentProviderConfig.ProviderName
	if err != nil {
		runtime.LogError(*c.ctx, fmt.Sprintf("[completionService.ProcessAction] Failed to get models list - Provider: %s, Error: %v", providerName, err))
		return "", fmt.Errorf("failed to load models: %w, for provider: %s", err, providerName)
	}

	if len(modelsList) == 0 {
		runtime.LogWarning(*c.ctx, fmt.Sprintf("[completionService.ProcessAction] No models available from provider - Provider: %s", providerName))
	}

	if !slices.Contains(modelsList, cfg.ModelConfig.ModelName) {
		runtime.LogWarning(*c.ctx, fmt.Sprintf("[completionService.ProcessAction] Configured model not found - Model: %s, Provider: %s, Available models: %v",
			cfg.ModelConfig.ModelName, providerName, modelsList))
	}

	// 5. Build the user prompt string
	userPrompt, err := c.promptService.BuildPrompt(promptDef.Value, promptDef.Category, &action, cfg.UseMarkdownForOutput)
	if err != nil {
		runtime.LogError(*c.ctx, fmt.Sprintf("[completionService.ProcessAction] Failed to build user prompt - ActionID: %s, Category: %s, Error: %v",
			actionID, promptDef.Category, err))
		return "", err
	}
	runtime.LogDebug(*c.ctx, fmt.Sprintf("[completionService.ProcessAction] Built user prompt - ActionID: %s, Length: %d chars", actionID, len(userPrompt)))

	// 6. Check for same-language translation optimization
	if promptDef.Category == constants.PromptCategoryTranslation && action.InputLanguageID == action.OutputLanguageID {
		runtime.LogInfo(*c.ctx, fmt.Sprintf("[completionService.ProcessAction] Skipping translation - same language (%s) - ActionID: %s",
			action.InputLanguageID, actionID))
		return action.InputText, nil
	}

	// 7. Send to LLM and sanitize
	llmStart := time.Now()
	req := util.NewChatCompletionRequest(cfg, userPrompt, sysPrompt)
	rawResp, err := c.llmService.GetCompletionResponse(&req)
	llmDuration := time.Since(llmStart)

	if err != nil {
		runtime.LogError(*c.ctx, fmt.Sprintf("[completionService.ProcessAction] LLM completion failed - ActionID: %s, Model: %s, Provider: %s, Duration: %dms, Error: %v",
			actionID, cfg.ModelConfig.ModelName, providerName, llmDuration.Milliseconds(), err))
		return "", fmt.Errorf("failed to get completion result: %w", err)
	}

	runtime.LogInfo(*c.ctx, fmt.Sprintf("[completionService.ProcessAction] LLM completion successful - ActionID: %s, Model: %s, Provider: %s, Duration: %dms, Response length: %d chars",
		actionID, cfg.ModelConfig.ModelName, providerName, llmDuration.Milliseconds(), len(rawResp)))

	result, err := c.stringUtils.SanitizeReasoningBlock(rawResp)
	if err != nil {
		runtime.LogError(*c.ctx, fmt.Sprintf("[completionService.ProcessAction] Failed to sanitize response - ActionID: %s, Error: %v", actionID, err))
		return "", fmt.Errorf("SanitizeResponse: %w", err)
	}

	totalDuration := time.Since(startTime)
	runtime.LogInfo(*c.ctx, fmt.Sprintf("[completionService.ProcessAction] Action completed successfully - ActionID: %s, Category: %s, Total duration: %dms, Result length: %d chars",
		actionID, promptDef.Category, totalDuration.Milliseconds(), len(result)))

	return result, nil
}

func NewCompletionApiService(ctx *context.Context,
	stringUtils backend_api.StringUtilsApi,
	promptService backend_api.PromptApi,
	settingsService backend_api.SettingsServiceApi,
	llmService backend_api.LlmApi,
) backend_api.CompletionApi {
	return &completionService{
		ctx:             ctx,
		stringUtils:     stringUtils,
		promptService:   promptService,
		settingsService: settingsService,
		llmService:      llmService,
	}
}
