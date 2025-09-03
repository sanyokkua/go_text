package http_client

import (
	"go_text/internal/backend/core/settings"
	"go_text/internal/backend/core/utils"
	"go_text/internal/backend/models"

	"resty.dev/v3"
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

func (h *appHttpClientStruct) getRequestParams() (string, map[string]string, error) {
	baseUrl, err := h.settingsService.GetBaseUrl()
	if err != nil {
		return "", nil, err
	}

	headers, err := h.settingsService.GetHeaders()
	if err != nil {
		return "", nil, err
	}

	return baseUrl, headers, nil
}

func (h *appHttpClientStruct) MakeLLMModelListRequest() (*models.ModelListResponse, error) {
	baseUrl, headers, err := h.getRequestParams()
	if err != nil {
		return nil, err
	}

	return h.utilsService.MakeLLMModelListRequest(h.client, baseUrl, headers)
}

func (h *appHttpClientStruct) MakeLLMCompletionRequest(request *models.ChatCompletionRequest) (*models.ChatCompletionResponse, error) {
	baseUrl, headers, err := h.getRequestParams()
	if err != nil {
		return nil, err
	}

	return h.utilsService.MakeLLMCompletionRequest(h.client, baseUrl, headers, request)
}

func NewAppHttpClient(utilsService utils.UtilsService, settingsService settings.SettingsService, restyClient *resty.Client) AppHttpClient {
	return &appHttpClientStruct{
		utilsService:    utilsService,
		client:          restyClient,
		settingsService: settingsService,
	}
}
