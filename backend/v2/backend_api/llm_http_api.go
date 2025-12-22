package backend_api

import (
	"go_text/backend/v2/model/llm"
)

type LlmHttpApi interface {
	ModelListRequest(baseUrl, endpoint string, headers map[string]string) (*llm.LlmModelListResponse, error)
	CompletionRequest(baseUrl, endpoint string, headers map[string]string, request *llm.ChatCompletionRequest) (*llm.ChatCompletionResponse, error)
}
