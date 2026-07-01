package actions

import (
	"context"
	"fmt"
	"go_text/internal/apperr"
	"go_text/internal/history"
	"go_text/internal/llms"
	"go_text/internal/prompts"
	"go_text/internal/prompts/categories"
	"go_text/internal/settings"
	"go_text/internal/tasklog"
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
	isOllama := cfg.CurrentProviderConfig.Kind == "ollama"

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
				Temperature: &temperature,
			}
		}
	}

	// Include a max output token cap when enabled. This is independent of
	// ContextWindow (which only ever informs NumCtx, downstream in chatRequestFrom) —
	// see T62: reusing ContextWindow here silently reserved most of the model's real
	// context for "completion", truncating the prompt before generation.
	if cfg.ModelConfig.UseMaxOutputTokens {
		maxOutputTokens := cfg.ModelConfig.MaxOutputTokens
		// User chooses which parameter to use
		if cfg.ModelConfig.UseLegacyMaxTokens {
			req.MaxTokens = &maxOutputTokens
		} else {
			req.MaxCompletionTokens = &maxOutputTokens
		}
	}

	return req
}

type ActionServiceAPI interface {
	GetModelsList() ([]string, error)
	GetCompletionResponse(request *llms.ChatCompletionRequest) (string, error)
	GetModelsListForProvider(provider *settings.ProviderConfig) ([]string, error)
	GetModelsInfo(providerID string) ([]apperr.ModelInfo, error)
	GetCompletionResponseForProvider(provider *settings.ProviderConfig, request *llms.ChatCompletionRequest) (string, error)
	GetPromptGroups() (*prompts.Prompts, error)
	ProcessPromptActionRequest(actionReq *prompts.PromptActionRequest) (string, error)
	GetActionCatalog() []apperr.ActionMeta
	BuildPlanAndPrompts(req apperr.PromptPreviewRequest) (*apperr.PromptPreview, error)
	RunChain(ctx context.Context, req apperr.ChainRequest, emitProgress func(apperr.StepProgress)) (*apperr.ChainResult, error)
}

type ActionService struct {
	logger          logger.Logger
	promptService   prompts.PromptServiceAPI
	llmService      llms.LLMServiceAPI
	settingsService settings.SettingsServiceAPI
	taskLogService  tasklog.TaskLogServiceAPI
	historyService  history.HistoryServiceAPI
	catalog         []apperr.ActionMeta // cached at construction; avoids promptService call in BuildPlanAndPrompts
	planner         *Planner
	composer        *Composer
}

func NewActionService(
	logger logger.Logger,
	promptService prompts.PromptServiceAPI,
	llmService llms.LLMServiceAPI,
	settingsService settings.SettingsServiceAPI,
	taskLogService tasklog.TaskLogServiceAPI,
	historyService history.HistoryServiceAPI,
) ActionServiceAPI {
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
	if taskLogService == nil {
		panic(fmt.Sprintf("%s: task log service cannot be nil", op))
	}
	if historyService == nil {
		panic(fmt.Sprintf("%s: history service cannot be nil", op))
	}

	logger.Info(fmt.Sprintf("[%s] Initializing action service", op))
	catalog := promptService.Catalog()
	return &ActionService{
		logger:          logger,
		promptService:   promptService,
		llmService:      llmService,
		settingsService: settingsService,
		taskLogService:  taskLogService,
		historyService:  historyService,
		catalog:         catalog,
		planner:         NewPlanner(catalog),
		composer:        NewComposer(catalog),
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

// GetModelsInfo returns the full []apperr.ModelInfo for the given provider.
// Empty providerID → uses the current provider.
// Non-empty providerID → validated against stored providers; returns apperr.Validation on miss.
func (a *ActionService) GetModelsInfo(providerID string) ([]apperr.ModelInfo, error) {
	const op = "ActionService.GetModelsInfo"
	a.logger.Debug(fmt.Sprintf("[%s] Retrieving models info providerID=%q", op, providerID))

	var provider *settings.ProviderConfig
	var err error

	if providerID == "" {
		provider, err = a.settingsService.GetCurrentProviderConfig()
		if err != nil {
			return nil, fmt.Errorf("%s: get current provider: %w", op, err)
		}
	} else {
		provider, err = a.settingsService.GetProviderConfig(providerID)
		if err != nil {
			return nil, apperr.Validation("providerId", "existing provider id", providerID)
		}
	}

	return a.llmService.GetModelsInfoForProvider(provider)
}

func (a *ActionService) GetCompletionResponseForProvider(provider *settings.ProviderConfig, request *llms.ChatCompletionRequest) (string, error) {
	const op = "ActionService.GetCompletionResponseForProvider"
	a.logger.Debug(fmt.Sprintf("[%s] Sending completion request for provider", op))
	return a.llmService.GetCompletionResponseForProvider(provider, request)
}

func (a *ActionService) GetActionCatalog() []apperr.ActionMeta {
	const op = "ActionService.GetActionCatalog"
	a.logger.Debug(fmt.Sprintf("[%s] Retrieving action catalog", op))
	return a.promptService.Catalog()
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
		op, cfg.CurrentProviderConfig.Name, cfg.ModelConfig.Name, promptDef.Category))

	// Validate configuration
	if err := a.validateProviderConfiguration(&cfg.CurrentProviderConfig); err != nil {
		a.logger.Error(fmt.Sprintf("[%s] Provider configuration validation failed - provider=%s, error=%v",
			op, cfg.CurrentProviderConfig.Name, err))
		return "", fmt.Errorf("%s: %w", op, err)
	}

	// 4. Validate model availability
	modelsList, err := a.llmService.GetModelsList()
	providerName := cfg.CurrentProviderConfig.Name
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

	// 7. Send to LLM via the shared runStep primitive
	stepReq := ChatStepRequest{
		System:      sysPrompt,
		User:        userPrompt,
		GroupFamily: promptDef.Category,
		ActionIDs:   []string{promptDef.ID},
		InputText:   action.InputText,
		InputLang:   action.InputLanguageID,
		OutputLang:  action.OutputLanguageID,
	}
	result, err := a.runStep(context.Background(), cfg, stepReq)
	if err != nil {
		a.logger.Error(fmt.Sprintf("[%s] runStep failed action_id=%s: %v", op, actionID, err))
		return "", fmt.Errorf("%s: %w", op, err)
	}

	totalDuration := time.Since(startTime)
	a.logger.Info(fmt.Sprintf("[%s] Action completed successfully - action_id=%s, category=%s, total_duration_ms=%d, result_length=%d",
		op, actionID, promptDef.Category, totalDuration.Milliseconds(), len(result)))

	return result, nil
}

// runStep executes one LLM inference: builds the chat-completion request,
// calls the provider, strips reasoning blocks, and writes one tasklog entry.
// It is the shared primitive used by processAction and (via T13) ChainOrchestrator.
func (a *ActionService) runStep(ctx context.Context, cfg *settings.Settings, req ChatStepRequest) (string, error) {
	const op = "ActionService.runStep"
	startTime := time.Now()
	_ = ctx // accepted for T13 cancellation; propagation added when LLMService gains context support

	a.logger.Debug(fmt.Sprintf("[%s] Starting LLM inference family=%s actions=%v", op, req.GroupFamily, req.ActionIDs))

	llmReq := newChatCompletionRequest(cfg, req.User, req.System)
	rawResp, err := a.llmService.GetCompletionResponse(&llmReq)
	if err != nil {
		a.logger.Error(fmt.Sprintf("[%s] LLM call failed family=%s error=%v", op, req.GroupFamily, err))
		return "", fmt.Errorf("%s: LLM call failed: %w", op, err)
	}

	if strings.TrimSpace(rawResp) == "" {
		a.logger.Warning(fmt.Sprintf("[%s] Received empty response from LLM family=%s", op, req.GroupFamily))
	}

	result, err := a.promptService.SanitizeReasoningBlock(rawResp)
	if err != nil {
		a.logger.Error(fmt.Sprintf("[%s] Sanitize failed: %v", op, err))
		return "", fmt.Errorf("%s: sanitize failed: %w", op, err)
	}

	actionID := strings.Join(req.ActionIDs, "+")

	_ = a.taskLogService.LogTaskExecution(tasklog.TaskLogEntry{
		SchemaVersion:  1,
		Timestamp:      time.Now().UTC().Format(time.RFC3339),
		ActionID:       actionID,
		ActionName:     actionID,
		Category:       req.GroupFamily,
		InputText:      req.InputText,
		OutputText:     result,
		SystemPrompt:   req.System,
		UserPrompt:     req.User,
		ProviderName:   cfg.CurrentProviderConfig.Name,
		ProviderType:   string(cfg.CurrentProviderConfig.Kind),
		Model:          cfg.ModelConfig.Name,
		DurationMs:     time.Since(startTime).Milliseconds(),
		InputLanguage:  req.InputLang,
		OutputLanguage: req.OutputLang,
	})

	a.logger.Debug(fmt.Sprintf("[%s] Done family=%s duration_ms=%d result_len=%d",
		op, req.GroupFamily, time.Since(startTime).Milliseconds(), len(result)))

	return result, nil
}

// buildPreviewParams constructs PreviewParams from resolved settings and request context.
// Format values match the spec: "plain" | "markdown".
// TokenParam values: "max_tokens" (legacy) | "max_completion_tokens" (default).
func buildPreviewParams(cfg *settings.Settings, req apperr.PromptPreviewRequest) apperr.PreviewParams {
	format := "plain"
	if req.UseMarkdown {
		format = "markdown"
	}
	tokenParam := "max_completion_tokens"
	if cfg.ModelConfig.UseLegacyMaxTokens {
		tokenParam = "max_tokens"
	}
	p := apperr.PreviewParams{
		Model:      cfg.ModelConfig.Name,
		Format:     format,
		InputLang:  req.InputLanguageID,
		OutputLang: req.OutputLanguageID,
		TokenParam: tokenParam,
		Stream:     false,
	}
	if cfg.ModelConfig.UseTemperature {
		t := cfg.ModelConfig.Temperature
		p.Temperature = &t
	}
	if cfg.ModelConfig.UseContextWindow {
		cw := cfg.ModelConfig.ContextWindow
		p.ContextWindow = &cw
	}
	return p
}

// BuildPlanAndPrompts runs planning + composition without calling the LLM.
// Used by PreviewPrompt (T15). Same Planner + Composer as RunChain — preview cannot drift from a real run.
// Group 0 uses sampleInput (or a placeholder); groups 1+ show the previous-step placeholder.
// Parameters are filled from settings when the service is fully wired; left zero in unit tests.
func (a *ActionService) BuildPlanAndPrompts(req apperr.PromptPreviewRequest) (*apperr.PromptPreview, error) {
	const (
		op                  = "ActionService.BuildPlanAndPrompts"
		defaultSampleInput  = "[sample input text]"
		prevStepPlaceholder = "‹output of previous step›"
	)

	chainReq := apperr.ChainRequest{
		Steps:            req.Steps,
		InputLanguageID:  req.InputLanguageID,
		OutputLanguageID: req.OutputLanguageID,
		UseMarkdown:      req.UseMarkdown,
	}
	if req.ActionID != "" && len(req.Steps) == 0 {
		chainReq.Steps = []apperr.ChainStep{{ActionID: req.ActionID}}
	}

	plan, err := a.planner.Plan(chainReq)
	if err != nil {
		return nil, fmt.Errorf("%s: planning failed: %w", op, err)
	}

	sampleInput := req.SampleInput
	if sampleInput == "" {
		sampleInput = defaultSampleInput
	}

	// Fill per-group parameters from current settings when the service is fully wired.
	// In unit tests that construct ActionService directly without a settingsService, params
	// are left as zero values — tests that verify Parameters must supply a mock settingsService.
	var params apperr.PreviewParams
	if a.settingsService != nil {
		cfg, err := a.settingsService.GetSettings()
		if err != nil {
			return nil, fmt.Errorf("%s: resolve settings: %w", op, err)
		}
		params = buildPreviewParams(cfg, req)
	}

	catalogMap := make(map[string]apperr.ActionMeta, len(a.catalog))
	for _, m := range a.catalog {
		catalogMap[m.ID] = m
	}

	groups := make([]apperr.PreviewGroup, len(plan.Groups))
	for i, g := range plan.Groups {
		// Group 0 receives the actual sample input; later groups show the prev-step placeholder
		// because their real input is the runtime output of the preceding group.
		groupInput := sampleInput
		if i > 0 {
			groupInput = prevStepPlaceholder
		}
		sys, user := a.composer.Compose(g, groupInput, chainReq, req.UseMarkdown)
		estimatedTokens := prompts.EstimateTokenCount(sys) + prompts.EstimateTokenCount(user)

		applied := make([]apperr.AppliedAction, len(g.Steps))
		for j, s := range g.Steps {
			meta := catalogMap[s.ActionID]
			applied[j] = apperr.AppliedAction{
				ID:       meta.ID,
				Name:     meta.Name,
				Category: meta.Category,
			}
		}

		groups[i] = apperr.PreviewGroup{
			Index:           i,
			Family:          g.Family,
			AppliedActions:  applied,
			SystemPrompt:    sys,
			UserPrompt:      user,
			Parameters:      params,
			EstimatedTokens: estimatedTokens,
		}
	}

	kind := "chain"
	if len(plan.Groups) == 1 {
		kind = "single"
	}

	return &apperr.PromptPreview{
		Kind:       kind,
		Inferences: plan.Inferences,
		Groups:     groups,
		Summary:    fmt.Sprintf("%d step(s) · %d inference(s)", len(chainReq.Steps), plan.Inferences),
	}, nil
}

func (a *ActionService) validateProviderConfiguration(provider *settings.ProviderConfig) error {
	if provider == nil {
		return fmt.Errorf("provider configuration cannot be nil")
	}

	if strings.TrimSpace(provider.BaseURL) == "" {
		return fmt.Errorf("provider BaseURL is not configured properly for provider '%s'", provider.Name)
	}

	if strings.TrimSpace(provider.CompletionPath) == "" {
		return fmt.Errorf("provider completion endpoint is not configured properly for provider '%s'", provider.Name)
	}

	return nil
}
