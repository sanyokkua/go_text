package http_utils

import (
	"fmt"
	"go_text/internal/backend/core/utils/string_utils"
	"go_text/internal/backend/models"
	"strings"
	"time"

	"resty.dev/v3"
)

func BuildRequestURL(baseUrl, endpoint string) (string, error) {
	if string_utils.IsBlankString(baseUrl) {
		return "", fmt.Errorf("baseUrl cannot be blank")
	}
	if strings.HasSuffix(baseUrl, "/") {
		baseUrl = baseUrl[:len(baseUrl)-1]
	}
	return baseUrl + endpoint, nil
}

func MakeLLMModelListRequest(client *resty.Client, baseUrl, endpointUrl string, headers map[string]string) (*models.ModelListResponse, error) {
	url, err := BuildRequestURL(baseUrl, endpointUrl)
	if err != nil {
		return nil, err
	}

	var response models.ModelListResponse
	err = MakeHttpRequest(client, resty.MethodGet, url, headers, nil, &response)
	if err != nil {
		return nil, err
	}

	return &response, nil
}

func MakeLLMCompletionRequest(client *resty.Client, baseUrl, endpointUrl string, headers map[string]string, request *models.ChatCompletionRequest) (*models.ChatCompletionResponse, error) {
	url, err := BuildRequestURL(baseUrl, endpointUrl)
	if err != nil {
		return nil, err
	}

	var response models.ChatCompletionResponse
	err = MakeHttpRequest(client, resty.MethodPost, url, headers, request, &response)
	if err != nil {
		return nil, err
	}

	return &response, nil
}

func MakeHttpRequest(client *resty.Client, httpMethod, url string, headers map[string]string, body, result interface{}) error {
	req := client.R().
		SetHeaders(headers).
		SetResult(result)

	if body != nil {
		req.SetBody(body)
	}

	resp, err := req.Execute(httpMethod, url)

	if err != nil {
		return err
	}

	return ValidateHttpResponse(resp)
}

func ValidateHttpResponse(resp *resty.Response) error {
	if resp.IsError() {
		return fmt.Errorf("API request failed with status %d", resp.StatusCode())
	}
	return nil
}

func NewRestyClient() *resty.Client {
	return resty.New().
		SetTimeout(time.Minute).
		SetHeader("Content-Type", "application/json").
		SetHeader("Accept", "application/json")
}
