package llm

import "go_text/internal/backend/models/llm"

type LLMService interface {
	GetModelsList() ([]string, error)
	GetCompletionResponse(request llm.ChatCompletionRequest) (string, error)
	SanitizeResponse(response string) (string, error)
}
