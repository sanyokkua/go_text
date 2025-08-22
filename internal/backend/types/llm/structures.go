package llm

type Model struct {
	ID   string  `json:"id"`
	Name *string `json:"name,omitempty"` // nil if absent
}

type ModelListResponse struct {
	Data []Model `json:"data"`
}

// Message represents a single message in the conversation
type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// Options contains model-specific parameters for providers like Ollama
type Options struct {
	Temperature float64 `json:"temperature,omitempty"`
}

// ChatCompletionRequest represents the structure for OpenAI-compatible API requests
type ChatCompletionRequest struct {
	Model       string    `json:"model"`
	Messages    []Message `json:"messages"`
	Temperature float64   `json:"temperature,omitempty"`
	Options     Options   `json:"options,omitempty"`
	Stream      bool      `json:"stream"`
	N           int       `json:"n,omitempty"`
}

// Choice represents a single generated response option
type Choice struct {
	Index        int     `json:"index"`
	Message      Message `json:"message"`
	FinishReason string  `json:"finish_reason"`
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
