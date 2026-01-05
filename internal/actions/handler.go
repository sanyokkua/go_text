package actions

import (
	"fmt"
	"go_text/internal/llms"
	"go_text/internal/prompts"
	"go_text/internal/settings"
	"strings"

	"github.com/wailsapp/wails/v2/pkg/logger"
)

type ActionHandlerAPI interface {
	GetModelsList() ([]string, error)
	GetCompletionResponse(request *llms.ChatCompletionRequest) (string, error)
	GetModelsListForProvider(provider *settings.ProviderConfig) ([]string, error)
	GetCompletionResponseForProvider(provider *settings.ProviderConfig, request *llms.ChatCompletionRequest) (string, error)
	GetPromptGroups() (*prompts.Prompts, error)
	ProcessPrompt(actionReq prompts.PromptActionRequest) (string, error)
}

type ActionHandler struct {
	logger        logger.Logger
	actionService ActionServiceAPI
}

func (h *ActionHandler) GetModelsList() ([]string, error) {
	const op = "ActionHandler.GetModelsList"
	h.logger.Debug(fmt.Sprintf("[%s] Retrieving models list", op))
	return h.actionService.GetModelsList()
}

func (h *ActionHandler) GetCompletionResponse(request *llms.ChatCompletionRequest) (string, error) {
	const op = "ActionHandler.GetCompletionResponse"
	h.logger.Debug(fmt.Sprintf("[%s] Sending completion request, model=%s, messages_count=%d", op, request.Model, len(request.Messages)))
	return h.actionService.GetCompletionResponse(request)
}

func (h *ActionHandler) GetModelsListForProvider(provider *settings.ProviderConfig) ([]string, error) {
	const op = "ActionHandler.GetModelsListForProvider"
	h.logger.Debug(fmt.Sprintf("[%s] Retrieving models list for provider=%s", op, provider.ProviderName))
	return h.actionService.GetModelsListForProvider(provider)
}

func (h *ActionHandler) GetCompletionResponseForProvider(provider *settings.ProviderConfig, request *llms.ChatCompletionRequest) (string, error) {
	const op = "ActionHandler.GetCompletionResponseForProvider"
	h.logger.Debug(fmt.Sprintf("[%s] Sending completion request for provider=%s, model=%s, messages_count=%d", op, provider.ProviderName, request.Model, len(request.Messages)))
	return h.actionService.GetCompletionResponseForProvider(provider, request)
}

func (h *ActionHandler) GetPromptGroups() (*prompts.Prompts, error) {
	const op = "ActionHandler.GetPromptGroups"
	h.logger.Debug(fmt.Sprintf("[%s] Retrieving prompt groups", op))

	appPrompts, err := h.actionService.GetPromptGroups()
	if err != nil {
		h.logger.Error(fmt.Sprintf("[%s] Failed to retrieve prompt groups: %v", op, err))
		return nil, fmt.Errorf("%s: failed to retrieve prompt groups: %w", op, err)
	}

	if appPrompts == nil {
		err := fmt.Errorf("received nil prompt groups from action service")
		h.logger.Error(fmt.Sprintf("[%s] %v", op, err))
		return nil, fmt.Errorf("%s: %w", op, err)
	}

	if len(appPrompts.PromptGroups) == 0 {
		h.logger.Warning(fmt.Sprintf("[%s] No prompt groups found", op))
	}

	h.logger.Trace(fmt.Sprintf("[%s] Successfully retrieved %d prompt groups", op, len(appPrompts.PromptGroups)))
	return appPrompts, nil
}

func (h *ActionHandler) ProcessPrompt(actionReq prompts.PromptActionRequest) (string, error) {
	const op = "ActionHandler.ProcessPrompt"

	actionID := strings.TrimSpace(actionReq.ID)
	if actionID == "" {
		err := fmt.Errorf("action ID cannot be empty")
		h.logger.Error(fmt.Sprintf("[%s] %v", op, err))
		return "", fmt.Errorf("%s: %w", op, err)
	}

	h.logger.Info(fmt.Sprintf("[%s] Starting prompt processing - action_id=%s", op, actionID))

	result, err := h.actionService.ProcessPromptActionRequest(&actionReq)
	if err != nil {
		h.logger.Error(fmt.Sprintf("[%s] Failed to process action '%s': %v", op, actionID, err))
		return "", fmt.Errorf("%s: action processing failed for action '%s': %w", op, actionID, err)
	}

	h.logger.Info(fmt.Sprintf("[%s] Successfully processed action '%s', result_length=%d",
		op, actionID, len(result)))
	return result, nil
}

func NewActionHandler(logger logger.Logger, actionService ActionServiceAPI) ActionHandlerAPI {
	const op = "ActionHandler.NewActionHandler"

	if logger == nil {
		panic(fmt.Sprintf("%s: logger cannot be nil", op))
	}
	if actionService == nil {
		panic(fmt.Sprintf("%s: action service cannot be nil", op))
	}

	logger.Info(fmt.Sprintf("[%s] Initializing action handler", op))
	return &ActionHandler{
		logger:        logger,
		actionService: actionService,
	}
}
