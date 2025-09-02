package llm

import (
	"fmt"
	"go_text/internal/backend/core/utils/mapping"
	"go_text/internal/backend/interfaces/http_client"
	llmInterfaces "go_text/internal/backend/interfaces/llm"
	"go_text/internal/backend/models/llm"
	"regexp"
	"strings"
)

type llmServiceStruct struct {
	httpClient http_client.HttpClient
}

func (l *llmServiceStruct) GetModelsList() ([]string, error) {
	response, err := l.httpClient.MakeGetRequest()
	if err != nil {
		return []string{}, err
	}

	items := response.Data
	if len(items) == 0 {
		return []string{}, nil
	}

	modelIds := mapping.MapModelNames(response)
	return modelIds, nil
}

func (l *llmServiceStruct) GetCompletionResponse(request llm.ChatCompletionRequest) (string, error) {
	response, err := l.httpClient.MakePostRequest(request)
	if err != nil {
		return "", err
	}

	// Check if we have at least one choice in the response
	if len(response.Choices) == 0 {
		return "", fmt.Errorf("no choices returned in the response")
	}

	// Return the content of the first choice
	return response.Choices[0].Message.Content, nil
}

func (l *llmServiceStruct) SanitizeResponse(response string) (string, error) {
	re, err := regexp.Compile(`(?s)<think>.*?</think>`)
	if err != nil {
		return "", err
	}
	cleaned := re.ReplaceAllString(response, "")
	return strings.TrimSpace(cleaned), nil
}

func NewLLMService(httpClient http_client.HttpClient) llmInterfaces.LLMService {
	return &llmServiceStruct{
		httpClient: httpClient,
	}
}
