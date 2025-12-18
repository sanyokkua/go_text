package http

import (
	"fmt"
	"go_text/internal/v2/backend_api"
	"time"

	"go_text/internal/backend/core/utils/string_utils"
	"go_text/internal/v2/model/llm"
	"strings"

	"resty.dev/v3"
)

type llmHttpService struct {
	logger backend_api.LoggingApi
	client *resty.Client
}

func (l llmHttpService) ModelListRequest(baseUrl, endpoint string, headers map[string]string) (*llm.LlmModelListResponse, error) {
	startTime := time.Now()
	l.logger.LogInfo(fmt.Sprintf("[ModelListRequest] Starting request - BaseURL: %s, Endpoint: %s", baseUrl, endpoint))

	url, err := l.buildRequestURL(baseUrl, endpoint)
	if err != nil {
		l.logger.LogError(fmt.Sprintf("[ModelListRequest] Failed to build URL: %v", err))
		return nil, fmt.Errorf("failed to construct request URL: %w", err)
	}

	var response llm.LlmModelListResponse
	err = l.makeHttpRequest(resty.MethodGet, url, headers, nil, &response)
	if err != nil {
		l.logger.LogError(fmt.Sprintf("[ModelListRequest] HTTP request failed: %v", err))
		return nil, fmt.Errorf("model list request failed: %w", err)
	}

	duration := time.Since(startTime)
	l.logger.LogInfo(fmt.Sprintf("[ModelListRequest] Successfully completed in %v. Found %d models", duration, len(response.Data)))

	return &response, nil
}

func (l llmHttpService) CompletionRequest(baseUrl, endpoint string, headers map[string]string, request *llm.ChatCompletionRequest) (*llm.ChatCompletionResponse, error) {
	startTime := time.Now()
	l.logger.LogInfo(fmt.Sprintf("[CompletionRequest] Starting request - BaseURL: %s, Endpoint: %s", baseUrl, endpoint))

	url, err := l.buildRequestURL(baseUrl, endpoint)
	if err != nil {
		l.logger.LogError(fmt.Sprintf("[CompletionRequest] Failed to build URL: %v", err))
		return nil, fmt.Errorf("failed to construct completion URL: %w", err)
	}

	var response llm.ChatCompletionResponse
	err = l.makeHttpRequest(resty.MethodPost, url, headers, request, &response)
	if err != nil {
		l.logger.LogError(fmt.Sprintf("[CompletionRequest] HTTP request failed: %v", err))
		return nil, fmt.Errorf("completion request failed: %w", err)
	}

	duration := time.Since(startTime)
	l.logger.LogInfo(fmt.Sprintf("[CompletionRequest] Successfully completed in %v", duration))

	return &response, nil
}

func (l llmHttpService) buildRequestURL(baseUrl, endpoint string) (string, error) {
	if string_utils.IsBlankString(baseUrl) {
		return "", fmt.Errorf("base URL cannot be empty or whitespace")
	}
	if string_utils.IsBlankString(endpoint) {
		return "", fmt.Errorf("endpoint path cannot be empty or whitespace")
	}

	// Normalize URL by removing trailing slash from base and ensuring endpoint starts with slash
	baseUrl = strings.TrimSuffix(baseUrl, "/")
	endpoint = strings.TrimPrefix(endpoint, "/")
	if endpoint == "" {
		return baseUrl, nil
	}
	return fmt.Sprintf("%s/%s", baseUrl, endpoint), nil
}

func (l llmHttpService) makeHttpRequest(httpMethod, url string, headers map[string]string, body, result interface{}) error {
	l.logger.LogDebug(fmt.Sprintf("[makeHttpRequest] %s %s", httpMethod, url))

	req := l.client.R().
		SetHeaders(headers).
		SetResult(result)

	if body != nil {
		req.SetBody(body)
	}

	startTime := time.Now()
	resp, err := req.Execute(httpMethod, url)
	duration := time.Since(startTime)

	if err != nil {
		l.logger.LogError(fmt.Sprintf("[makeHttpRequest] Request failed after %v: %v", duration, err))
		return fmt.Errorf("%s request to %s failed: %w", httpMethod, url, err)
	}

	l.logger.LogDebug(fmt.Sprintf("[makeHttpRequest] Completed in %v, Status: %s", duration, resp.Status()))

	return l.validateHttpResponse(resp)
}

func (l llmHttpService) validateHttpResponse(resp *resty.Response) error {
	if resp.IsError() {
		errorMsg := fmt.Sprintf("API returned error status %d: %s", resp.StatusCode(), resp.Status())
		l.logger.LogError(fmt.Sprintf("[validateHttpResponse] %s", errorMsg))
		return fmt.Errorf("remote server error: %s", errorMsg)
	}
	return nil
}

func NewLlmHttpApiService(logger backend_api.LoggingApi, client *resty.Client) backend_api.LlmHttpApi {
	return &llmHttpService{
		logger: logger,
		client: client,
	}
}
