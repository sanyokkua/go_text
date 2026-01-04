package llms

import (
	"fmt"
	"go_text/internal/settings"
	"os"
	"strings"
	"time"

	"github.com/wailsapp/wails/v2/pkg/logger"
	"resty.dev/v3"
)

type LLMService struct {
	logger          logger.Logger
	client          *resty.Client
	settingsService *settings.SettingsService
}

func (l *LLMService) GetModelsList() ([]string, error) {
	const op = "LLMService.GetModelsList"
	startTime := time.Now()
	l.logger.Info(fmt.Sprintf("[%s] Starting model list retrieval", op))

	provider, err := l.settingsService.GetCurrentProviderConfig()
	if err != nil {
		l.logger.Error(fmt.Sprintf("[%s] Failed to retrieve current provider configuration: %v", op, err))
		return nil, fmt.Errorf("%s: failed to retrieve application settings: %w", op, err)
	}

	if provider == nil {
		err := fmt.Errorf("current provider configuration is nil")
		l.logger.Error(fmt.Sprintf("[%s] %v", op, err))
		return nil, fmt.Errorf("%s: %w", op, err)
	}

	models, err := l.GetModelsListForProvider(provider)
	if err != nil {
		l.logger.Error(fmt.Sprintf("[%s] Failed to retrieve models for provider %s: %v", op, provider.ProviderName, err))
		return nil, fmt.Errorf("%s: failed to retrieve models: %w", op, err)
	}

	duration := time.Since(startTime)
	l.logger.Info(fmt.Sprintf("[%s] Successfully retrieved model list, duration_ms=%d, model_count=%d, provider=%s",
		op, duration.Milliseconds(), len(models), provider.ProviderName))

	return models, nil
}

func (l *LLMService) GetCompletionResponse(request *ChatCompletionRequest) (string, error) {
	const op = "LLMService.GetCompletionResponse"
	startTime := time.Now()
	l.logger.Info(fmt.Sprintf("[%s] Starting chat completion request", op))

	if request == nil {
		err := fmt.Errorf("completion request cannot be nil")
		l.logger.Error(fmt.Sprintf("[%s] %v", op, err))
		return "", fmt.Errorf("%s: %w", op, err)
	}

	provider, err := l.settingsService.GetCurrentProviderConfig()
	if err != nil {
		l.logger.Error(fmt.Sprintf("[%s] Failed to get current provider configuration: %v", op, err))
		return "", fmt.Errorf("%s: failed to retrieve application settings: %w", op, err)
	}

	if provider == nil {
		err := fmt.Errorf("current provider configuration is nil")
		l.logger.Error(fmt.Sprintf("[%s] %v", op, err))
		return "", fmt.Errorf("%s: %w", op, err)
	}

	responseContent, err := l.GetCompletionResponseForProvider(provider, request)
	if err != nil {
		l.logger.Error(fmt.Sprintf("[%s] Completion request failed for provider %s: %v", op, provider.ProviderName, err))
		return "", fmt.Errorf("%s: failed to retrieve response: %w", op, err)
	}

	duration := time.Since(startTime)
	l.logger.Info(fmt.Sprintf("[%s] Successfully completed request, duration=%v, response_length=%d, provider=%s",
		op, duration, len(responseContent), provider.ProviderName))

	return responseContent, nil
}

func (l *LLMService) GetModelsListForProvider(provider *settings.ProviderConfig) ([]string, error) {
	const op = "LLMService.GetModelsListForProvider"
	startTime := time.Now()

	if provider == nil {
		err := fmt.Errorf("provider configuration cannot be nil")
		l.logger.Error(fmt.Sprintf("[%s] %v", op, err))
		return nil, fmt.Errorf("%s: %w", op, err)
	}

	l.logger.Info(fmt.Sprintf("[%s] Starting model list retrieval for provider: %s", op, provider.ProviderName))

	if provider.UseCustomModels && provider.CustomModels != nil && len(provider.CustomModels) > 0 {
		duration := time.Since(startTime)
		l.logger.Info(fmt.Sprintf("[%s] Successfully retrieved model list, duration_ms=%d, model_count=%d, provider=%s",
			op, duration.Milliseconds(), len(provider.CustomModels), provider.ProviderName))

		return provider.CustomModels, nil
	}

	parameters, err := l.buildRequestParameters(provider)
	if err != nil {
		l.logger.Error(fmt.Sprintf("[%s] Failed to build request parameters for provider %s: %v", op, provider.ProviderName, err))
		return nil, fmt.Errorf("%s: failed to build request parameters: %w", op, err)
	}

	response, err := l.modelListRequest(parameters)
	if err != nil {
		l.logger.Error(fmt.Sprintf("[%s] Model list request failed for provider %s: %v", op, provider.ProviderName, err))
		return []string{}, fmt.Errorf("%s: failed to retrieve model list from provider: %w", op, err)
	}

	if response == nil {
		err := fmt.Errorf("received nil response from model list request")
		l.logger.Error(fmt.Sprintf("[%s] %v", op, err))
		return []string{}, fmt.Errorf("%s: %w", op, err)
	}

	modelIds := l.mapModelNames(response)
	duration := time.Since(startTime)
	l.logger.Info(fmt.Sprintf("[%s] Successfully retrieved model list, duration_ms=%d, model_count=%d, provider=%s",
		op, duration.Milliseconds(), len(modelIds), provider.ProviderName))

	return modelIds, nil
}

func (l *LLMService) GetCompletionResponseForProvider(provider *settings.ProviderConfig, request *ChatCompletionRequest) (string, error) {
	const op = "LLMService.GetCompletionResponseForProvider"
	startTime := time.Now()

	if provider == nil {
		err := fmt.Errorf("provider configuration cannot be nil")
		l.logger.Error(fmt.Sprintf("[%s] %v", op, err))
		return "", fmt.Errorf("%s: %w", op, err)
	}

	if request == nil {
		err := fmt.Errorf("completion request cannot be nil")
		l.logger.Error(fmt.Sprintf("[%s] %v", op, err))
		return "", fmt.Errorf("%s: %w", op, err)
	}

	l.logger.Info(fmt.Sprintf("[%s] Starting completion request for provider: %s, model: %s",
		op, provider.ProviderName, request.Model))

	parameters, err := l.buildRequestParameters(provider)
	if err != nil {
		l.logger.Error(fmt.Sprintf("[%s] Failed to build request parameters for provider %s: %v", op, provider.ProviderName, err))
		return "", fmt.Errorf("%s: failed to build request parameters: %w", op, err)
	}

	response, err := l.completionRequest(parameters, request)
	if err != nil {
		l.logger.Error(fmt.Sprintf("[%s] Completion request failed for provider %s: %v", op, provider.ProviderName, err))
		return "", fmt.Errorf("%s: chat completion request failed: %w", op, err)
	}

	if response == nil {
		err := fmt.Errorf("received nil response from completion request")
		l.logger.Error(fmt.Sprintf("[%s] %v", op, err))
		return "", fmt.Errorf("%s: %w", op, err)
	}

	if len(response.Choices) == 0 {
		errorMsg := "no choices returned in the completion response"
		l.logger.Error(fmt.Sprintf("[%s] %s, provider=%s, model=%s", op, errorMsg, provider.ProviderName, request.Model))
		return "", fmt.Errorf("%s: invalid response: %s", op, errorMsg)
	}

	responseContent := response.Choices[0].Message.Content
	if responseContent == "" {
		l.logger.Warning(fmt.Sprintf("[%s] Received empty response content, provider=%s, model=%s",
			op, provider.ProviderName, request.Model))
	}

	duration := time.Since(startTime)
	l.logger.Info(fmt.Sprintf("[%s] Successfully completed request, duration=%v, response_length=%d, provider=%s, model=%s",
		op, duration, len(responseContent), provider.ProviderName, request.Model))

	return responseContent, nil
}

func (l *LLMService) buildRequestParameters(provider *settings.ProviderConfig) (*RequestParameters, error) {
	const op = "LLMService.buildRequestParameters"

	if provider == nil {
		err := fmt.Errorf("provider configuration cannot be nil")
		l.logger.Error(fmt.Sprintf("[%s] %v", op, err))
		return nil, fmt.Errorf("%s: %w", op, err)
	}

	baseConfig, err := l.settingsService.GetInferenceBaseConfig()
	if err != nil {
		l.logger.Error(fmt.Sprintf("[%s] Failed to get inference base configuration: %v", op, err))
		return nil, fmt.Errorf("%s: failed to retrieve base configuration: %w", op, err)
	}

	if baseConfig == nil {
		err := fmt.Errorf("inference base configuration is nil")
		l.logger.Error(fmt.Sprintf("[%s] %v", op, err))
		return nil, fmt.Errorf("%s: %w", op, err)
	}

	modelsUrl, err := l.buildRequestURL(provider.BaseUrl, provider.ModelsEndpoint)
	if err != nil {
		l.logger.Error(fmt.Sprintf("[%s] Failed to build models URL for provider %s: %v", op, provider.ProviderName, err))
		return nil, fmt.Errorf("%s: failed to build models URL: %w", op, err)
	}

	completionEndpoint, err := l.buildRequestURL(provider.BaseUrl, provider.CompletionEndpoint)
	if err != nil {
		l.logger.Error(fmt.Sprintf("[%s] Failed to build completion URL for provider %s: %v", op, provider.ProviderName, err))
		return nil, fmt.Errorf("%s: failed to build completion URL: %w", op, err)
	}

	authToken := l.getAuthToken(provider)
	headers := l.buildRequestHeaders(provider, authToken)

	timeout := l.validateTimeout(baseConfig.Timeout)
	maxRetries := l.validateMaxRetries(baseConfig.MaxRetries)

	return &RequestParameters{
		ModelsEndpoint:     modelsUrl,
		CompletionEndpoint: completionEndpoint,
		Headers:            headers,
		TimeoutSeconds:     timeout,
		MaxRetries:         maxRetries,
	}, nil
}

func (l *LLMService) getAuthToken(provider *settings.ProviderConfig) string {
	const op = "LLMService.getAuthToken"

	if provider == nil || provider.AuthType == settings.AuthTypeNone {
		return ""
	}

	if provider.UseAuthTokenFromEnv && strings.TrimSpace(provider.EnvVarTokenName) != "" {
		token := os.Getenv(provider.EnvVarTokenName)
		if token == "" {
			l.logger.Warning(fmt.Sprintf("[%s] Environment variable %s is empty or not set for provider %s",
				op, provider.EnvVarTokenName, provider.ProviderName))
			// TODO: Add Warning Event Emit
		}
		return token
	}

	if !provider.UseAuthTokenFromEnv && strings.TrimSpace(provider.AuthToken) != "" {
		return provider.AuthToken
	}

	l.logger.Warning(fmt.Sprintf("[%s] No auth token found for provider %s with auth type %s",
		op, provider.ProviderName, provider.AuthType))
	// TODO: Add Warning Event Emit
	return ""
}

func (l *LLMService) buildRequestHeaders(provider *settings.ProviderConfig, authToken string) map[string]string {
	const op = "LLMService.buildRequestHeaders"
	headers := make(map[string]string)

	if provider == nil {
		return headers
	}

	if provider.AuthType == settings.AuthTypeBearer && strings.TrimSpace(authToken) != "" {
		headers["Authorization"] = fmt.Sprintf("Bearer %s", authToken)
	}

	if provider.AuthType == settings.AuthTypeApiKey && strings.TrimSpace(authToken) != "" {
		headers["Api-Key"] = authToken
	}

	if provider.UseCustomHeaders && provider.Headers != nil {
		for key, value := range provider.Headers {
			if strings.TrimSpace(key) != "" && strings.TrimSpace(value) != "" {
				if _, ok := headers[key]; ok == true {
					// TODO: Add Warning Event Emit that header overrides other header
					l.logger.Warning(fmt.Sprintf("[%s] Custom header %s overrides existing header value", op, key))
				}
				headers[key] = value
			}
		}
	}

	if len(headers) > 0 {
		l.logger.Trace(fmt.Sprintf("[%s] Built headers for provider %s: %v", op, provider.ProviderName, headers))
	}

	return headers
}

func (l *LLMService) validateTimeout(timeout int) int {
	const defaultTimeout = 30
	if timeout < 1 {
		l.logger.Warning(fmt.Sprintf("[LLMService.validateTimeout] Timeout %d is less than minimum (1), using default %d", timeout, defaultTimeout))
		return defaultTimeout
	}
	if timeout > 600 {
		l.logger.Warning(fmt.Sprintf("[LLMService.validateTimeout] Timeout %d exceeds maximum (600), using default %d", timeout, defaultTimeout))
		return defaultTimeout
	}
	return timeout
}

func (l *LLMService) validateMaxRetries(retries int) int {
	const defaultRetries = 3
	if retries < 0 {
		l.logger.Warning(fmt.Sprintf("[LLMService.validateMaxRetries] Max retries %d is negative, using default %d", retries, defaultRetries))
		return defaultRetries
	}
	if retries > 10 {
		l.logger.Warning(fmt.Sprintf("[LLMService.validateMaxRetries] Max retries %d exceeds maximum (10), using default %d", retries, defaultRetries))
		return defaultRetries
	}
	return retries
}

func (l *LLMService) buildRequestURL(baseURL, endpoint string) (string, error) {
	const op = "LLMService.buildRequestURL"

	if strings.TrimSpace(baseURL) == "" {
		err := fmt.Errorf("base URL cannot be empty or whitespace")
		l.logger.Error(fmt.Sprintf("[%s] %v", op, err))
		return "", fmt.Errorf("%s: %w", op, err)
	}

	if strings.TrimSpace(endpoint) == "" {
		normalizedURL := strings.TrimSuffix(baseURL, "/") + "/"
		l.logger.Trace(fmt.Sprintf("[%s] Endpoint is empty, using base URL only: %s", op, normalizedURL))
		return normalizedURL, nil
	}

	baseURL = strings.TrimSuffix(baseURL, "/")
	endpoint = strings.TrimPrefix(endpoint, "/")
	fullURL := fmt.Sprintf("%s/%s", baseURL, endpoint)

	l.logger.Trace(fmt.Sprintf("[%s] Built URL: %s", op, fullURL))
	return fullURL, nil
}

func (l *LLMService) modelListRequest(requestParameters *RequestParameters) (*ModelsListResponse, error) {
	const op = "LLMService.modelListRequest"
	startTime := time.Now()

	if requestParameters == nil {
		err := fmt.Errorf("request parameters cannot be nil")
		l.logger.Error(fmt.Sprintf("[%s] %v", op, err))
		return nil, fmt.Errorf("%s: %w", op, err)
	}

	l.logger.Info(fmt.Sprintf("[%s] Starting model list request to: %s", op, requestParameters.ModelsEndpoint))

	var response ModelsListResponse
	err := l.makeHttpRequest(resty.MethodGet, requestParameters.ModelsEndpoint, *requestParameters, nil, &response)
	if err != nil {
		l.logger.Error(fmt.Sprintf("[%s] HTTP request failed to %s: %v", op, requestParameters.ModelsEndpoint, err))
		return nil, fmt.Errorf("%s: model list request failed: %w", op, err)
	}

	if len(response.Data) == 0 {
		l.logger.Warning(fmt.Sprintf("[%s] No models found in response from %s", op, requestParameters.ModelsEndpoint))
	}

	duration := time.Since(startTime)
	l.logger.Info(fmt.Sprintf("[%s] Successfully completed request, duration=%v, models_found=%d, url=%s",
		op, duration, len(response.Data), requestParameters.ModelsEndpoint))

	return &response, nil
}

func (l *LLMService) completionRequest(requestParameters *RequestParameters, request *ChatCompletionRequest) (*ChatCompletionResponse, error) {
	const op = "LLMService.completionRequest"
	startTime := time.Now()

	if requestParameters == nil {
		err := fmt.Errorf("request parameters cannot be nil")
		l.logger.Error(fmt.Sprintf("[%s] %v", op, err))
		return nil, fmt.Errorf("%s: %w", op, err)
	}

	if request == nil {
		err := fmt.Errorf("completion request cannot be nil")
		l.logger.Error(fmt.Sprintf("[%s] %v", op, err))
		return nil, fmt.Errorf("%s: %w", op, err)
	}

	l.logger.Info(fmt.Sprintf("[%s] Starting completion request to: %s, model: %s",
		op, requestParameters.CompletionEndpoint, request.Model))

	var response ChatCompletionResponse
	err := l.makeHttpRequest(resty.MethodPost, requestParameters.CompletionEndpoint, *requestParameters, request, &response)
	if err != nil {
		l.logger.Error(fmt.Sprintf("[%s] HTTP request failed to %s: %v", op, requestParameters.CompletionEndpoint, err))
		return nil, fmt.Errorf("%s: completion request failed: %w", op, err)
	}

	duration := time.Since(startTime)
	l.logger.Info(fmt.Sprintf("[%s] Successfully completed request, duration=%v, choices=%d, url=%s",
		op, duration, len(response.Choices), requestParameters.CompletionEndpoint))

	return &response, nil
}

func (l *LLMService) makeHttpRequest(httpMethod, url string, requestParameters RequestParameters, body, result interface{}) error {
	const op = "LLMService.makeHttpRequest"
	l.logger.Trace(fmt.Sprintf("[%s] %s %s", op, httpMethod, url))

	if url == "" {
		err := fmt.Errorf("URL cannot be empty")
		l.logger.Error(fmt.Sprintf("[%s] %v", op, err))
		return fmt.Errorf("%s: %w", op, err)
	}

	req := l.client.R().
		SetHeaders(requestParameters.Headers).
		SetRetryCount(requestParameters.MaxRetries).
		SetTimeout(time.Duration(requestParameters.TimeoutSeconds) * time.Second).
		SetResult(result)

	if body != nil {
		req.SetBody(body)
	}

	startTime := time.Now()
	resp, err := req.Execute(httpMethod, url)
	duration := time.Since(startTime)

	if err != nil {
		l.logger.Error(fmt.Sprintf("[%s] Request failed after %v, method=%s, url=%s, error=%v",
			op, duration, httpMethod, url, err))
		return fmt.Errorf("%s: %s request to %s failed after %v: %w", op, httpMethod, url, duration, err)
	}

	if err := l.validateHttpResponse(resp); err != nil {
		l.logger.Error(fmt.Sprintf("[%s] Response validation failed, method=%s, url=%s, status=%s, error=%v",
			op, httpMethod, url, resp.Status(), err))
		return fmt.Errorf("%s: %w", op, err)
	}

	l.logger.Trace(fmt.Sprintf("[%s] Request completed successfully, method=%s, url=%s, status=%s, duration=%v",
		op, httpMethod, url, resp.Status(), duration))

	return nil
}

func (l *LLMService) validateHttpResponse(resp *resty.Response) error {
	const op = "LLMService.validateHttpResponse"

	if resp == nil {
		err := fmt.Errorf("HTTP response is nil")
		l.logger.Error(fmt.Sprintf("[%s] %v", op, err))
		return fmt.Errorf("%s: %w", op, err)
	}

	if resp.IsError() {
		errorMsg := fmt.Sprintf("API returned error status %d: %s", resp.StatusCode(), resp.Status())

		l.logger.Error(fmt.Sprintf("[%s] %s", op, errorMsg))
		return fmt.Errorf("remote server error: %s", errorMsg)
	}

	return nil
}

func (l *LLMService) mapModelNames(response *ModelsListResponse) []string {
	const op = "LLMService.mapModelNames"

	if response == nil {
		l.logger.Warning(fmt.Sprintf("[%s] Received nil response, returning empty model list", op))
		return []string{}
	}

	if len(response.Data) == 0 {
		l.logger.Info(fmt.Sprintf("[%s] No models found in response", op))
		return []string{}
	}

	modelIDs := make([]string, 0, len(response.Data))
	for _, item := range response.Data {
		if modelID := strings.TrimSpace(item.ID); modelID != "" {
			modelIDs = append(modelIDs, modelID)
		}
	}

	l.logger.Trace(fmt.Sprintf("[%s] Mapped %d model IDs from response data", op, len(modelIDs)))
	return modelIDs
}

func NewLLMApiService(logger logger.Logger, client *resty.Client, settingsService *settings.SettingsService) *LLMService {
	const op = "LLMService.NewLLMApiService"

	if logger == nil {
		panic(fmt.Sprintf("%s: logger cannot be nil", op))
	}
	if client == nil {
		panic(fmt.Sprintf("%s: REST client cannot be nil", op))
	}
	if settingsService == nil {
		panic(fmt.Sprintf("%s: settings service cannot be nil", op))
	}

	logger.Info(fmt.Sprintf("[%s] Initializing LLM service", op))
	return &LLMService{
		logger:          logger,
		client:          client,
		settingsService: settingsService,
	}
}
