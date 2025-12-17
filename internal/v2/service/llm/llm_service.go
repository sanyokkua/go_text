package llm

import (
	"context"
	"fmt"
	"time"

	"go_text/internal/v2/backend_api"
	"go_text/internal/v2/model/llm"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type llmService struct {
	ctx             *context.Context
	llmHttpApi      backend_api.LlmHttpApi
	settingsService backend_api.SettingsServiceApi
	mapper          backend_api.MapperUtilsApi
}

func (l llmService) GetModelsList() ([]string, error) {
	startTime := time.Now()
	runtime.LogInfo(*l.ctx, "[GetModelsList] Starting to fetch available models")

	settings, err := l.settingsService.GetCurrentSettings()
	if err != nil {
		runtime.LogError(*l.ctx, fmt.Sprintf("[GetModelsList] Failed to get current settings: %v", err))
		return nil, fmt.Errorf("failed to retrieve application settings: %w", err)
	}

	provider := settings.CurrentProviderConfig
	runtime.LogDebug(*l.ctx, fmt.Sprintf("[GetModelsList] Using provider: BaseURL=%s, Endpoint=%s", provider.BaseUrl, provider.ModelsEndpoint))

	response, err := l.llmHttpApi.ModelListRequest(provider.BaseUrl, provider.ModelsEndpoint, provider.Headers)
	if err != nil {
		runtime.LogError(*l.ctx, fmt.Sprintf("[GetModelsList] Failed to fetch models from provider: %v", err))
		return []string{}, fmt.Errorf("failed to retrieve model list from provider: %w", err)
	}

	modelIds := l.mapper.MapModelNames(response)
	duration := time.Since(startTime)
	runtime.LogInfo(*l.ctx, fmt.Sprintf("[GetModelsList] Successfully retrieved %d models in %v", len(modelIds), duration))

	return modelIds, nil
}

func (l llmService) GetCompletionResponse(request *llm.ChatCompletionRequest) (string, error) {
	startTime := time.Now()
	runtime.LogInfo(*l.ctx, "[GetCompletionResponse] Starting chat completion request")

	settings, err := l.settingsService.GetCurrentSettings()
	if err != nil {
		runtime.LogError(*l.ctx, fmt.Sprintf("[GetCompletionResponse] Failed to get current settings: %v", err))
		return "", fmt.Errorf("failed to retrieve application settings: %w", err)
	}

	provider := settings.CurrentProviderConfig
	runtime.LogDebug(*l.ctx, fmt.Sprintf("[GetCompletionResponse] Using provider: BaseURL=%s, Endpoint=%s", provider.BaseUrl, provider.ModelsEndpoint))

	response, err := l.llmHttpApi.CompletionRequest(provider.BaseUrl, provider.ModelsEndpoint, provider.Headers, request)
	if err != nil {
		runtime.LogError(*l.ctx, fmt.Sprintf("[GetCompletionResponse] Completion request failed: %v", err))
		return "", fmt.Errorf("chat completion request failed: %w", err)
	}

	if len(response.Choices) == 0 {
		errorMsg := "no choices returned in the completion response"
		runtime.LogError(*l.ctx, fmt.Sprintf("[GetCompletionResponse] %s", errorMsg))
		return "", fmt.Errorf("invalid response: %s", errorMsg)
	}

	responseContent := response.Choices[0].Message.Content
	duration := time.Since(startTime)
	runtime.LogInfo(*l.ctx, fmt.Sprintf("[GetCompletionResponse] Successfully completed in %v, Response length: %d characters", duration, len(responseContent)))

	return responseContent, nil
}

func NewLlmApiService(ctx *context.Context,
	llmHttpApi backend_api.LlmHttpApi,
	settingsService backend_api.SettingsServiceApi,
	mapper backend_api.MapperUtilsApi) backend_api.LlmApi {
	return &llmService{
		ctx:             ctx,
		llmHttpApi:      llmHttpApi,
		settingsService: settingsService,
		mapper:          mapper,
	}
}
