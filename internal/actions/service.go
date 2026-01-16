package actions

import (
	"fmt"
	"go_text/internal/llms"
	"go_text/internal/prompts"
	"go_text/internal/prompts/categories"
	"go_text/internal/settings"
	"slices"
	"strings"
	"time"

	"github.com/wailsapp/wails/v2/pkg/logger"
)

func newMessage(role, content string) llms.CompletionRequestMessage {
	return llms.CompletionRequestMessage{
		Role:    role,
		Content: strings.TrimSpace(content),
	}
}

func newChatCompletionRequest(cfg *settings.Settings, userPrompt, systemPrompt string) llms.ChatCompletionRequest {
	systemMsg := newMessage(RoleSystemMsg, systemPrompt)
	userMsg := newMessage(RoleUserMsg, userPrompt)

	modelName := cfg.ModelConfig.Name
	temperature := cfg.ModelConfig.Temperature
	isTemperatureEnabled := cfg.ModelConfig.UseTemperature
	isOllama := cfg.CurrentProviderConfig.ProviderType == settings.ProviderTypeOllama

	req := llms.ChatCompletionRequest{
		Model: modelName,
		Messages: []llms.CompletionRequestMessage{
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
			req.Options = &llms.Options{
				Temperature: temperature,
			}
		}
	}

	// Include a context window when enabled
	if cfg.ModelConfig.UseContextWindow {
		contextWindow := cfg.ModelConfig.ContextWindow
		// User chooses which parameter to use
		if cfg.ModelConfig.UseLegacyMaxTokens {
			req.MaxTokens = &contextWindow
		} else {
			req.MaxCompletionTokens = &contextWindow
		}
	}

	return req
}

type ActionServiceAPI interface {
	GetModelsList() ([]string, error)
	GetCompletionResponse(request *llms.ChatCompletionRequest) (string, error)
	GetModelsListForProvider(provider *settings.ProviderConfig) ([]string, error)
	GetCompletionResponseForProvider(provider *settings.ProviderConfig, request *llms.ChatCompletionRequest) (string, error)
	GetPromptGroups() (*prompts.Prompts, error)
	ProcessPromptActionRequest(actionReq *prompts.PromptActionRequest) (string, error)
}

type ActionService struct {
	logger          logger.Logger
	promptService   prompts.PromptServiceAPI
	llmService      llms.LLMServiceAPI
	settingsService settings.SettingsServiceAPI
}

func NewActionService(logger logger.Logger, promptService prompts.PromptServiceAPI, llmService llms.LLMServiceAPI, settingsService settings.SettingsServiceAPI) ActionServiceAPI {
	const op = "ActionService.NewActionService"

	if logger == nil {
		panic(fmt.Sprintf("%s: logger cannot be nil", op))
	}
	if promptService == nil {
		panic(fmt.Sprintf("%s: prompt service cannot be nil", op))
	}
	if llmService == nil {
		panic(fmt.Sprintf("%s: LLM service cannot be nil", op))
	}
	if settingsService == nil {
		panic(fmt.Sprintf("%s: settings service cannot be nil", op))
	}

	logger.Info(fmt.Sprintf("[%s] Initializing action service", op))
	return &ActionService{
		logger:          logger,
		promptService:   promptService,
		llmService:      llmService,
		settingsService: settingsService,
	}
}

func (a *ActionService) GetModelsList() ([]string, error) {
	const op = "ActionService.GetModelsList"
	a.logger.Debug(fmt.Sprintf("[%s] Retrieving models list", op))
	return a.llmService.GetModelsList()
}

func (a *ActionService) GetCompletionResponse(request *llms.ChatCompletionRequest) (string, error) {
	const op = "ActionService.GetCompletionResponse"
	a.logger.Debug(fmt.Sprintf("[%s] Sending completion request", op))
	return a.llmService.GetCompletionResponse(request)
}

func (a *ActionService) GetModelsListForProvider(provider *settings.ProviderConfig) ([]string, error) {
	const op = "ActionService.GetModelsListForProvider"
	a.logger.Debug(fmt.Sprintf("[%s] Retrieving models list for provider", op))
	return a.llmService.GetModelsListForProvider(provider)
}

func (a *ActionService) GetCompletionResponseForProvider(provider *settings.ProviderConfig, request *llms.ChatCompletionRequest) (string, error) {
	const op = "ActionService.GetCompletionResponseForProvider"
	a.logger.Debug(fmt.Sprintf("[%s] Sending completion request for provider", op))
	return a.llmService.GetCompletionResponseForProvider(provider, request)
}

func (a *ActionService) GetPromptGroups() (*prompts.Prompts, error) {
	const op = "ActionService.GetPromptGroups"
	a.logger.Debug(fmt.Sprintf("[%s] Retrieving prompt groups", op))

	appPrompts := a.promptService.GetAppPrompts()
	if appPrompts == nil {
		err := fmt.Errorf("no app prompts returned")
		a.logger.Error(fmt.Sprintf("[%s] %v", op, err))
		return nil, fmt.Errorf("%s: %w", op, err)
	}

	a.logger.Trace(fmt.Sprintf("[%s] Successfully retrieved %d prompt groups", op, len(appPrompts.PromptGroups)))
	return appPrompts, nil
}

func (a *ActionService) ProcessPromptActionRequest(actionReq *prompts.PromptActionRequest) (string, error) {
	const op = "ActionService.ProcessPromptActionRequest"
	startTime := time.Now()

	if actionReq == nil {
		err := fmt.Errorf("action request cannot be nil")
		a.logger.Error(fmt.Sprintf("[%s] %v", op, err))
		return "", fmt.Errorf("%s: %w", op, err)
	}

	a.logger.Info(fmt.Sprintf("[%s] Starting action processing - ActionID: %s", op, actionReq.ID))

	result, err := a.processAction(actionReq)
	if err != nil {
		a.logger.Error(fmt.Sprintf("[%s] Failed to process action '%s': %v", op, actionReq.ID, err))
		return "", fmt.Errorf("%s: action processing failed: %w", op, err)
	}

	duration := time.Since(startTime)
	a.logger.Info(fmt.Sprintf("[%s] Successfully processed action '%s' in %v, result_length=%d",
		op, actionReq.ID, duration, len(result)))

	return result, nil
}

func (a *ActionService) processAction(action *prompts.PromptActionRequest) (string, error) {
	const op = "ActionService.processAction"
	startTime := time.Now()

	if action == nil {
		err := fmt.Errorf("action request cannot be nil")
		a.logger.Error(fmt.Sprintf("[%s] %v", op, err))
		return "", fmt.Errorf("%s: %w", op, err)
	}

	actionID := strings.TrimSpace(action.ID)
	if actionID == "" {
		err := fmt.Errorf("action ID cannot be empty")
		a.logger.Error(fmt.Sprintf("[%s] %v", op, err))
		return "", fmt.Errorf("%s: %w", op, err)
	}

	a.logger.Info(fmt.Sprintf("[%s] Starting action processing - action_id=%s", op, actionID))

	// 1. Fetch prompt definitions
	promptDef, err := a.promptService.GetPrompt(actionID)
	if err != nil {
		a.logger.Error(fmt.Sprintf("[%s] Failed to get prompt definition - action_id=%s, error=%v", op, actionID, err))
		return "", fmt.Errorf("%s: failed to get prompt definition for action '%s': %w", op, actionID, err)
	}

	a.logger.Trace(fmt.Sprintf("[%s] Retrieved prompt definition - action_id=%s, category=%s, prompt_id=%s",
		op, actionID, promptDef.Category, promptDef.ID))

	// 2. Fetch system instructions
	sysPromptStart := time.Now()
	sysPrompt, err := a.promptService.GetSystemPrompt(promptDef.Category)
	if err != nil {
		a.logger.Error(fmt.Sprintf("[%s] Failed to get system prompt - category=%s, error=%v", op, promptDef.Category, err))
		return "", fmt.Errorf("%s: failed to get system prompt for category '%s': %w", op, promptDef.Category, err)
	}

	if strings.TrimSpace(sysPrompt) == "" {
		a.logger.Warning(fmt.Sprintf("[%s] System prompt is empty for category %s", op, promptDef.Category))
	}

	sysPromptDuration := time.Since(sysPromptStart)
	a.logger.Trace(fmt.Sprintf("[%s] Retrieved system prompt - category=%s, duration_ms=%d",
		op, promptDef.Category, sysPromptDuration.Milliseconds()))

	// 3. Load all user-configured settings at once
	cfg, err := a.settingsService.GetSettings()
	if err != nil {
		a.logger.Error(fmt.Sprintf("[%s] Failed to load settings - error=%v", op, err))
		return "", fmt.Errorf("%s: failed to load application settings: %w", op, err)
	}

	if cfg == nil {
		err := fmt.Errorf("settings configuration is nil")
		a.logger.Error(fmt.Sprintf("[%s] %v", op, err))
		return "", fmt.Errorf("%s: %w", op, err)
	}

	a.logger.Info(fmt.Sprintf("[%s] Loaded current settings - provider=%s, model=%s, category=%s",
		op, cfg.CurrentProviderConfig.ProviderName, cfg.ModelConfig.Name, promptDef.Category))

	// Validate configuration
	if err := a.validateProviderConfiguration(&cfg.CurrentProviderConfig); err != nil {
		a.logger.Error(fmt.Sprintf("[%s] Provider configuration validation failed - provider=%s, error=%v",
			op, cfg.CurrentProviderConfig.ProviderName, err))
		return "", fmt.Errorf("%s: %w", op, err)
	}

	// 4. Validate model availability
	modelsList, err := a.llmService.GetModelsList()
	providerName := cfg.CurrentProviderConfig.ProviderName
	if err != nil {
		a.logger.Error(fmt.Sprintf("[%s] Failed to get models list - provider=%s, error=%v", op, providerName, err))
		return "", fmt.Errorf("%s: failed to load models for provider '%s': %w", op, providerName, err)
	}

	if len(modelsList) == 0 {
		a.logger.Warning(fmt.Sprintf("[%s] No models available from provider - provider=%s", op, providerName))
	}

	if !slices.Contains(modelsList, cfg.ModelConfig.Name) {
		a.logger.Warning(fmt.Sprintf("[%s] Configured model not found - model=%s, provider=%s, available_models_count=%d",
			op, cfg.ModelConfig.Name, providerName, len(modelsList)))
	}

	// 5. Build the user prompt string
	userPrompt, err := a.promptService.BuildPrompt(promptDef.Value, promptDef.Category, action, cfg.InferenceBaseConfig.UseMarkdownForOutput)
	if err != nil {
		a.logger.Error(fmt.Sprintf("[%s] Failed to build user prompt - action_id=%s, category=%s, error=%v",
			op, actionID, promptDef.Category, err))
		return "", fmt.Errorf("%s: failed to build user prompt: %w", op, err)
	}

	if strings.TrimSpace(userPrompt) == "" {
		a.logger.Warning(fmt.Sprintf("[%s] Built user prompt is empty - action_id=%s, category=%s",
			op, actionID, promptDef.Category))
	}

	a.logger.Trace(fmt.Sprintf("[%s] Built user prompt - action_id=%s, prompt_length=%d", op, actionID, len(userPrompt)))

	// 6. Check for same-language translation optimization
	if promptDef.Category == categories.PromptGroupTranslation &&
		strings.EqualFold(action.InputLanguageID, action.OutputLanguageID) {
		a.logger.Info(fmt.Sprintf("[%s] Skipping translation - same language (%s) - action_id=%s",
			op, action.InputLanguageID, actionID))
		return action.InputText, nil
	}

	// 7. Send to LLM and sanitize
	llmStart := time.Now()
	req := newChatCompletionRequest(cfg, userPrompt, sysPrompt)
	rawResp, err := a.GetCompletionResponse(&req)
	llmDuration := time.Since(llmStart)

	if err != nil {
		a.logger.Error(fmt.Sprintf("[%s] LLM completion failed - action_id=%s, model=%s, provider=%s, duration_ms=%d, error=%v",
			op, actionID, cfg.ModelConfig.Name, providerName, llmDuration.Milliseconds(), err))
		return "", fmt.Errorf("%s: failed to get completion result for action '%s': %w", op, actionID, err)
	}

	if strings.TrimSpace(rawResp) == "" {
		a.logger.Warning(fmt.Sprintf("[%s] Received empty response from LLM - action_id=%s, model=%s, provider=%s",
			op, actionID, cfg.ModelConfig.Name, providerName))
	}

	a.logger.Info(fmt.Sprintf("[%s] LLM completion successful - action_id=%s, model=%s, provider=%s, duration_ms=%d, response_length=%d",
		op, actionID, cfg.ModelConfig.Name, providerName, llmDuration.Milliseconds(), len(rawResp)))

	result, err := a.promptService.SanitizeReasoningBlock(rawResp)
	if err != nil {
		a.logger.Error(fmt.Sprintf("[%s] Failed to sanitize response - action_id=%s, error=%v", op, actionID, err))
		return "", fmt.Errorf("%s: failed to sanitize response for action '%s': %w", op, actionID, err)
	}

	if strings.TrimSpace(result) == "" {
		a.logger.Warning(fmt.Sprintf("[%s] Sanitized result is empty - action_id=%s", op, actionID))
	}

	totalDuration := time.Since(startTime)
	a.logger.Info(fmt.Sprintf("[%s] Action completed successfully - action_id=%s, category=%s, total_duration_ms=%d, result_length=%d",
		op, actionID, promptDef.Category, totalDuration.Milliseconds(), len(result)))

	return result, nil
}

func (a *ActionService) validateProviderConfiguration(provider *settings.ProviderConfig) error {
	if provider == nil {
		return fmt.Errorf("provider configuration cannot be nil")
	}

	if strings.TrimSpace(provider.BaseUrl) == "" {
		return fmt.Errorf("provider BaseURL is not configured properly for provider '%s'", provider.ProviderName)
	}

	if strings.TrimSpace(provider.CompletionEndpoint) == "" {
		return fmt.Errorf("provider completion endpoint is not configured properly for provider '%s'", provider.ProviderName)
	}

	return nil
}
