package llm

import (
	"fmt"
	"go_text/backend/abstract/backend"
	"go_text/backend/model/llm"
	"time"
)

type llmService struct {
	logger          backend.LoggingApi
	llmHttpApi      backend.LlmHttpApi
	settingsService backend.SettingsServiceApi
	mapper          backend.MapperUtilsApi
}

func (l llmService) GetModelsList() ([]string, error) {
	startTime := time.Now()

	l.logger.Info("[llmService.GetModelsList] Starting model list retrieval")

	settings, err := l.settingsService.GetCurrentSettings()
	if err != nil {
		l.logger.Error(fmt.Sprintf("[llmService.GetModelsList] Settings retrieval failed, error=%v, error_type=%T", err, err))
		return nil, fmt.Errorf("failed to retrieve application settings: %w", err)
	}

	provider := settings.CurrentProviderConfig
	l.logger.Trace(fmt.Sprintf("[llmService.GetModelsList] Using provider configuration, provider=%s, base_url=%s, endpoint=%s", provider.ProviderName, provider.BaseUrl, provider.ModelsEndpoint))

	response, err := l.llmHttpApi.ModelListRequest(provider.BaseUrl, provider.ModelsEndpoint, provider.Headers)
	if err != nil {
		l.logger.Error(fmt.Sprintf("[llmService.GetModelsList] Model list retrieval failed, error=%v, error_type=%T, provider=%s", err, err, provider.ProviderName))
		return []string{}, fmt.Errorf("failed to retrieve model list from provider: %w", err)
	}

	modelIds := l.mapper.MapModelNames(response)
	duration := time.Since(startTime)
	l.logger.Info(fmt.Sprintf("[llmService.GetModelsList] Successfully retrieved model list, duration_ms=%d, model_count=%d, provider=%s", duration.Milliseconds(), len(modelIds), provider.ProviderName))

	return modelIds, nil
}

func (l llmService) GetCompletionResponse(request *llm.ChatCompletionRequest) (string, error) {
	startTime := time.Now()
	l.logger.Info("[GetCompletionResponse] Starting chat completion request")

	settings, err := l.settingsService.GetCurrentSettings()
	if err != nil {
		l.logger.Error(fmt.Sprintf("[GetCompletionResponse] Failed to get current settings: %v", err))
		return "", fmt.Errorf("failed to retrieve application settings: %w", err)
	}

	provider := settings.CurrentProviderConfig
	l.logger.Trace(fmt.Sprintf("[GetCompletionResponse] Using provider: BaseURL=%s, Endpoint=%s", provider.BaseUrl, provider.ModelsEndpoint))

	response, err := l.llmHttpApi.CompletionRequest(provider.BaseUrl, provider.CompletionEndpoint, provider.Headers, request)
	if err != nil {
		l.logger.Error(fmt.Sprintf("[GetCompletionResponse] Completion request failed: %v", err))
		return "", fmt.Errorf("chat completion request failed: %w", err)
	}

	if len(response.Choices) == 0 {
		errorMsg := "no choices returned in the completion response"
		l.logger.Error(fmt.Sprintf("[GetCompletionResponse] %s", errorMsg))
		return "", fmt.Errorf("invalid response: %s", errorMsg)
	}

	responseContent := response.Choices[0].Message.Content
	duration := time.Since(startTime)
	l.logger.Info(fmt.Sprintf("[GetCompletionResponse] Successfully completed in %v, Response length: %d characters", duration, len(responseContent)))

	return responseContent, nil
}

func NewLlmApiService(logger backend.LoggingApi,
	llmHttpApi backend.LlmHttpApi,
	settingsService backend.SettingsServiceApi,
	mapper backend.MapperUtilsApi) backend.LlmApi {
	return &llmService{
		logger:          logger,
		llmHttpApi:      llmHttpApi,
		settingsService: settingsService,
		mapper:          mapper,
	}
}
