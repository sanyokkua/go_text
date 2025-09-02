package http_client

import (
	"fmt"
	llmConstants "go_text/internal/backend/constants/llm"
	"go_text/internal/backend/interfaces/http_client"
	settingsInterfaces "go_text/internal/backend/interfaces/settings"
	"go_text/internal/backend/models/llm"
	"time"

	"resty.dev/v3"
)

type httpClientStruct struct {
	settingsService settingsInterfaces.SettingsService
}

func (h *httpClientStruct) MakeGetRequest() (*llm.ModelListResponse, error) {
	baseUrl, err := h.settingsService.GetBaseUrl()
	if err != nil {
		return nil, err
	}

	headers, err := h.settingsService.GetHeaders()
	if err != nil {
		return nil, err
	}

	fullUrl := baseUrl + llmConstants.OpenAICompatibleGetModels

	client := resty.New()
	defer func(client *resty.Client) {
		err := client.Close()
		if err != nil {

		}
	}(client)

	var response llm.ModelListResponse

	// Make the POST request
	resp, err := client.R().
		// Set content type and accept headers
		SetHeader("Content-Type", "application/json").
		SetHeader("Accept", "application/json").
		SetHeaders(headers).
		SetTimeout(time.Minute).
		// Set the response object to unmarshal into
		SetResult(&response).
		// Make the Get request
		Get(fullUrl)

	if err != nil {
		return nil, err
	}

	// Check for non-2xx status codes
	if resp.IsError() {
		return nil, fmt.Errorf("API request failed with status %d", resp.StatusCode())
	}

	return &response, nil
}

func (h *httpClientStruct) MakePostRequest(request llm.ChatCompletionRequest) (*llm.ChatCompletionResponse, error) {
	baseUrl, err := h.settingsService.GetBaseUrl()
	if err != nil {
		return nil, err
	}

	headers, err := h.settingsService.GetHeaders()
	if err != nil {
		return nil, err
	}

	fullUrl := baseUrl + llmConstants.OpenAICompatiblePostCompletions

	client := resty.New()
	defer func(client *resty.Client) {
		err := client.Close()
		if err != nil {

		}
	}(client)

	var response llm.ChatCompletionResponse

	// Make the POST request
	resp, err := client.R().
		// Set content type and accept headers
		SetHeader("Content-Type", "application/json").
		SetHeader("Accept", "application/json").
		SetHeaders(headers).
		SetTimeout(time.Minute).
		// Set the request body
		SetBody(request).
		// Set the response object to unmarshal into
		SetResult(&response).
		// Make the POST request
		Post(fullUrl)

	if err != nil {
		return nil, err
	}

	// Check for non-2xx status codes
	if resp.IsError() {
		return nil, fmt.Errorf("API request failed with status %d", resp.StatusCode())
	}

	return &response, nil
}

func NewHttpClient(settingsService settingsInterfaces.SettingsService) http_client.HttpClient {
	return &httpClientStruct{
		settingsService: settingsService,
	}
}
