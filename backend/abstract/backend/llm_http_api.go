package backend

import (
	llm2 "go_text/backend/model/llm"
)

type LlmHttpApi interface {
	ModelListRequest(baseUrl, endpoint string, headers map[string]string) (*llm2.LlmModelListResponse, error)
	CompletionRequest(baseUrl, endpoint string, headers map[string]string, request *llm2.ChatCompletionRequest) (*llm2.ChatCompletionResponse, error)
}
