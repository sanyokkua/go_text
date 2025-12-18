package llm

import (
	"fmt"
	"time"

	"go_text/internal/v2/backend_api"
	"go_text/internal/v2/model/llm"
)

type llmService struct {
	logger          backend_api.LoggingApi
	llmHttpApi      backend_api.LlmHttpApi
	settingsService backend_api.SettingsServiceApi
	mapper          backend_api.MapperUtilsApi
}

func (l llmService) GetModelsList() ([]string, error) {
	startTime := time.Now()
	l.logger.LogInfo("[GetModelsList] Starting to fetch available models")

	settings, err := l.settingsService.GetCurrentSettings()
	if err != nil {
		l.logger.LogError(fmt.Sprintf("[GetModelsList] Failed to get current settings: %v", err))
		return nil, fmt.Errorf("failed to retrieve application settings: %w", err)
	}

	provider := settings.CurrentProviderConfig
	l.logger.LogDebug(fmt.Sprintf("[GetModelsList] Using provider: BaseURL=%s, Endpoint=%s", provider.BaseUrl, provider.ModelsEndpoint))

	response, err := l.llmHttpApi.ModelListRequest(provider.BaseUrl, provider.ModelsEndpoint, provider.Headers)
	if err != nil {
		l.logger.LogError(fmt.Sprintf("[GetModelsList] Failed to fetch models from provider: %v", err))
		return []string{}, fmt.Errorf("failed to retrieve model list from provider: %w", err)
	}

	modelIds := l.mapper.MapModelNames(response)
	duration := time.Since(startTime)
	l.logger.LogInfo(fmt.Sprintf("[GetModelsList] Successfully retrieved %d models in %v", len(modelIds), duration))

	return modelIds, nil
}

func (l llmService) GetCompletionResponse(request *llm.ChatCompletionRequest) (string, error) {
	startTime := time.Now()
	l.logger.LogInfo("[GetCompletionResponse] Starting chat completion request")

	settings, err := l.settingsService.GetCurrentSettings()
	if err != nil {
		l.logger.LogError(fmt.Sprintf("[GetCompletionResponse] Failed to get current settings: %v", err))
		return "", fmt.Errorf("failed to retrieve application settings: %w", err)
	}

	provider := settings.CurrentProviderConfig
	l.logger.LogDebug(fmt.Sprintf("[GetCompletionResponse] Using provider: BaseURL=%s, Endpoint=%s", provider.BaseUrl, provider.ModelsEndpoint))

	response, err := l.llmHttpApi.CompletionRequest(provider.BaseUrl, provider.ModelsEndpoint, provider.Headers, request)
	if err != nil {
		l.logger.LogError(fmt.Sprintf("[GetCompletionResponse] Completion request failed: %v", err))
		return "", fmt.Errorf("chat completion request failed: %w", err)
	}

	if len(response.Choices) == 0 {
		errorMsg := "no choices returned in the completion response"
		l.logger.LogError(fmt.Sprintf("[GetCompletionResponse] %s", errorMsg))
		return "", fmt.Errorf("invalid response: %s", errorMsg)
	}

	responseContent := response.Choices[0].Message.Content
	duration := time.Since(startTime)
	l.logger.LogInfo(fmt.Sprintf("[GetCompletionResponse] Successfully completed in %v, Response length: %d characters", duration, len(responseContent)))

	return responseContent, nil
}

func NewLlmApiService(logger backend_api.LoggingApi,
	llmHttpApi backend_api.LlmHttpApi,
	settingsService backend_api.SettingsServiceApi,
	mapper backend_api.MapperUtilsApi) backend_api.LlmApi {
	return &llmService{
		logger:          logger,
		llmHttpApi:      llmHttpApi,
		settingsService: settingsService,
		mapper:          mapper,
	}
}
