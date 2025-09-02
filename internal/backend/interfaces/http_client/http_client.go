package http_client

import "go_text/internal/backend/models/llm"

type HttpClient interface {
	MakeGetRequest() (*llm.ModelListResponse, error)
	MakePostRequest(request llm.ChatCompletionRequest) (*llm.ChatCompletionResponse, error)
}
