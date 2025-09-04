package models

// Models list request

type Model struct {
	ID   string  `json:"id"`
	Name *string `json:"name,omitempty"` // nil if absent
}

type ModelListResponse struct {
	Data []Model `json:"data"`
}

// Completion list request

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

func NewMessage(role, content string) Message {
	return Message{
		Role:    role,
		Content: content,
	}
}

func NewChatCompletionRequest(modelName, userPrompt, systemPrompt string, temperature float64) ChatCompletionRequest {
	systemMsg := NewMessage("system", systemPrompt)
	userMsg := NewMessage("user", userPrompt)
	return ChatCompletionRequest{
		Model: modelName,
		Messages: []Message{
			systemMsg,
			userMsg,
		},
		Temperature: temperature,
		Options: Options{
			Temperature: temperature,
		},
		Stream: false,
		N:      1,
	}
}

type Prompt struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Type     string `json:"type"`
	Category string `json:"category"`
	Value    string `json:"value"`
}

type Settings struct {
	BaseUrl               string            `json:"baseUrl"`
	Headers               map[string]string `json:"headers"`
	ModelName             string            `json:"modelName"`
	Temperature           float64           `json:"temperature"`
	DefaultInputLanguage  string            `json:"defaultInputLanguage"`
	DefaultOutputLanguage string            `json:"defaultOutputLanguage"`
	Languages             []string          `json:"languages"`
	UseMarkdownForOutput  bool              `json:"useMarkdownForOutput"`
}

type AppActionItem struct {
	ActionID   string `json:"actionId"`
	ActionText string `json:"actionText"`
}

type LanguageItem struct {
	LanguageId   string `json:"languageId"`
	LanguageText string `json:"languageText"`
}

type AppActionObjWrapper struct {
	ActionID string `json:"actionId"`

	ActionInput  string `json:"actionInput"`
	ActionOutput string `json:"actionOutput"`

	ActionInputLanguage  string `json:"actionInputLanguage"`
	ActionOutputLanguage string `json:"actionOutputLanguage"`
}
