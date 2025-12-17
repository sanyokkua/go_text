package backend_api

import (
	"go_text/internal/v2/model/llm"
)

type LlmApi interface {
	GetModelsList() ([]string, error)
	GetCompletionResponse(request *llm.ChatCompletionRequest) (string, error)
}
