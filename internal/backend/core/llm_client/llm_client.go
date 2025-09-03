package llm_client

import (
	"fmt"
	"go_text/internal/backend/core/http_client"
	"go_text/internal/backend/core/utils"
	"go_text/internal/backend/models"
)

type AppLLMService interface {
	GetModelsList() ([]string, error)
	GetCompletionResponse(request *models.ChatCompletionRequest) (string, error)
}

type llmServiceStruct struct {
	httpClient   http_client.AppHttpClient
	utilsService utils.UtilsService
}

func (l *llmServiceStruct) GetModelsList() ([]string, error) {
	response, err := l.httpClient.MakeLLMModelListRequest()
	if err != nil {
		return []string{}, err
	}

	modelIds := l.utilsService.MapModelNames(response)
	return modelIds, nil
}

func (l *llmServiceStruct) GetCompletionResponse(request *models.ChatCompletionRequest) (string, error) {
	response, err := l.httpClient.MakeLLMCompletionRequest(request)
	if err != nil {
		return "", err
	}

	if len(response.Choices) == 0 {
		return "", fmt.Errorf("no choices returned in the response")
	}

	return response.Choices[0].Message.Content, nil
}

func NewAppLLMService(httpClient http_client.AppHttpClient, utilsService utils.UtilsService) AppLLMService {
	return &llmServiceStruct{
		httpClient:   httpClient,
		utilsService: utilsService,
	}
}
