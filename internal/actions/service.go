package actions

import (
	"context"
	"fmt"
	"go_text/internal/apperr"
	"go_text/internal/history"
	"go_text/internal/llms"
	"go_text/internal/logging"
	"go_text/internal/prompts"
	"go_text/internal/settings"
	"go_text/internal/tasklog"
	"strings"
	"time"
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
	GetCompletionResponse(ctx context.Context, request *llms.ChatCompletionRequest) (string, error)
	GetModelsListForProvider(provider *settings.ProviderConfig) ([]string, error)
	GetModelsInfo(providerID string) ([]apperr.ModelInfo, error)
	GetCompletionResponseForProvider(ctx context.Context, provider *settings.ProviderConfig, request *llms.ChatCompletionRequest) (string, error)
	GetActionCatalog() []apperr.ActionMeta
	BuildPlanAndPrompts(req apperr.PromptPreviewRequest) (*apperr.PromptPreview, error)
	RunChain(ctx context.Context, req apperr.ChainRequest, emitProgress func(apperr.StepProgress)) (*apperr.ChainResult, error)
}

type ActionService struct {
	logger          *logging.Logger
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
	logger *logging.Logger,
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

func (a *ActionService) GetCompletionResponse(ctx context.Context, request *llms.ChatCompletionRequest) (string, error) {
	const op = "ActionService.GetCompletionResponse"
	a.logger.Debug(fmt.Sprintf("[%s] Sending completion request", op))
	return a.llmService.GetCompletionResponse(ctx, request)
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

func (a *ActionService) GetCompletionResponseForProvider(ctx context.Context, provider *settings.ProviderConfig, request *llms.ChatCompletionRequest) (string, error) {
	const op = "ActionService.GetCompletionResponseForProvider"
	a.logger.Debug(fmt.Sprintf("[%s] Sending completion request for provider", op))
	return a.llmService.GetCompletionResponseForProvider(ctx, provider, request)
}

func (a *ActionService) GetActionCatalog() []apperr.ActionMeta {
	const op = "ActionService.GetActionCatalog"
	a.logger.Debug(fmt.Sprintf("[%s] Retrieving action catalog", op))
	return a.promptService.Catalog()
}

// runStep executes one LLM inference: builds the chat-completion request,
// calls the provider, strips reasoning blocks, and writes one tasklog entry.
// It is the shared primitive used by processAction and (via T13) ChainOrchestrator.
func (a *ActionService) runStep(ctx context.Context, cfg *settings.Settings, req ChatStepRequest) (string, error) {
	const op = "ActionService.runStep"
	startTime := time.Now()

	lg := a.logger.WithOp(op).With().
		Str("component", "actions").
		Str("run_id", req.RunID).
		Str("family", req.GroupFamily).
		Str("provider", string(cfg.CurrentProviderConfig.Kind)).
		Logger()

	lg.Debug().Strs("actions", req.ActionIDs).Msg("starting LLM inference")

	llmReq := newChatCompletionRequest(cfg, req.User, req.System)
	rawResp, err := a.llmService.GetCompletionResponse(ctx, &llmReq)
	if err != nil {
		lg.Error().Err(err).Msg("LLM call failed")
		return "", fmt.Errorf("%s: LLM call failed: %w", op, err)
	}

	if strings.TrimSpace(rawResp) == "" {
		lg.Warn().Msg("received empty response from LLM")
	}

	result, err := a.promptService.SanitizeReasoningBlock(rawResp)
	if err != nil {
		lg.Error().Err(err).Msg("sanitize failed")
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
		RunID:          req.RunID,
	})

	lg.Debug().
		Int64("duration_ms", time.Since(startTime).Milliseconds()).
		Int("result_len", len(result)).
		Msg("step completed")

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
