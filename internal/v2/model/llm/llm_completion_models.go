package llm

const RoleSystemMsg = "system"
const RoleUserMsg = "user"

// Request

type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type Options struct {
	Temperature float64 `json:"temperature,omitempty"`
}

// ChatCompletionRequest represents the structure for OpenAI-compatible API requests
type ChatCompletionRequest struct {
	Model       string    `json:"model"`
	Messages    []Message `json:"messages"`
	Temperature *float64  `json:"temperature,omitempty"`
	Options     *Options  `json:"options,omitempty"` // Only used by Ollama
	Stream      bool      `json:"stream"`
	N           int       `json:"n,omitempty"`
}

// Response

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
