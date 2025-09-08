package http_client

import (
	"go_text/internal/backend/constants"
	"go_text/internal/backend/core/settings"
	"go_text/internal/backend/core/utils"
	"go_text/internal/backend/models"

	"resty.dev/v3"
)

const (
	modelsEndpoint     = "models"
	completionEndpoint = "completion"
)

type AppHttpClient interface {
	MakeLLMModelListRequest() (*models.ModelListResponse, error)
	MakeLLMCompletionRequest(request *models.ChatCompletionRequest) (*models.ChatCompletionResponse, error)
}

type appHttpClientStruct struct {
	utilsService    utils.UtilsService
	settingsService settings.SettingsService
	client          *resty.Client
}

func (h *appHttpClientStruct) getRequestParams(requestEndpoint string) (baseUrl, endpoint string, headers map[string]string, err error) {
	baseUrl, err = h.settingsService.GetBaseUrl()
	if err != nil {
		return "", "", nil, err
	}

	headers, err = h.settingsService.GetHeaders()
	if err != nil {
		return "", "", nil, err
	}

	if requestEndpoint == modelsEndpoint {
		endpoint, err = h.settingsService.GetModelsEndpoint()
	} else {
		endpoint, err = h.settingsService.GetCompletionEndpoint()
	}
	if err != nil {
		return "", "", nil, err
	}

	return baseUrl, endpoint, headers, nil
}

func (h *appHttpClientStruct) MakeLLMModelListRequest() (*models.ModelListResponse, error) {
	baseUrl, endpoint, headers, err := h.getRequestParams(modelsEndpoint)
	if err != nil {
		return nil, err
	}

	return h.utilsService.MakeLLMModelListRequest(h.client, baseUrl, endpoint, headers)
}

func (h *appHttpClientStruct) MakeLLMCompletionRequest(request *models.ChatCompletionRequest) (*models.ChatCompletionResponse, error) {
	baseUrl, endpoint, headers, err := h.getRequestParams(completionEndpoint)
	if err != nil {
		return nil, err
	}

	if baseUrl != constants.DefaultOllamaBaseUrl && baseUrl != constants.DefaultOllamaBaseUrlAlternative {
		// Exclude Options used only by Ollama
		request.Options = nil
	}

	return h.utilsService.MakeLLMCompletionRequest(h.client, baseUrl, endpoint, headers, request)
}

func NewAppHttpClient(utilsService utils.UtilsService, settingsService settings.SettingsService, restyClient *resty.Client) AppHttpClient {
	return &appHttpClientStruct{
		utilsService:    utilsService,
		client:          restyClient,
		settingsService: settingsService,
	}
}
