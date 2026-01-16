package llms

type ModelsResponse struct {
	ID   string  `json:"id"`
	Name *string `json:"name,omitempty"` // nil if absent
}

type ModelsListResponse struct {
	Data []ModelsResponse `json:"data"`
}

// Request

type CompletionRequestMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type Options struct {
	Temperature float64 `json:"temperature,omitempty"`
}

// ChatCompletionRequest represents the structure for OpenAI-compatible API requests
type ChatCompletionRequest struct {
	Model       string                     `json:"model"`
	Messages    []CompletionRequestMessage `json:"messages"`
	Temperature *float64                   `json:"temperature,omitempty"`
	Options     *Options                   `json:"options,omitempty"` // Only used by Ollama
	Stream      bool                       `json:"stream"`
	N           int                        `json:"n,omitempty"`
	// Token limit parameters - the user chooses which one to use
	MaxTokens           *int `json:"max_tokens,omitempty"`            // Legacy parameter
	MaxCompletionTokens *int `json:"max_completion_tokens,omitempty"` // Current recommended parameter
}

// Response

// Choice represents a single generated response option
type Choice struct {
	Index        int                      `json:"index"`
	Message      CompletionRequestMessage `json:"message"`
	FinishReason string                   `json:"finish_reason"`
}

// Usage represents token usage statistics
type Usage struct {
	PromptTokens     int `json:"prompt_tokens"`
	CompletionTokens int `json:"completion_tokens"`
	TotalTokens      int `json:"total_tokens"`
}

// ChatCompletionResponse represents the standard response from OpenAI-compatible APIs
type ChatCompletionResponse struct {
	ID      string   `json:"id"`
	Model   string   `json:"model"`
	Choices []Choice `json:"choices"`
	Usage   Usage    `json:"usage"`
}

type RequestParameters struct {
	ModelsEndpoint     string
	CompletionEndpoint string
	Headers            map[string]string
	TimeoutSeconds     int
	MaxRetries         int
}
