package llm

type LlmModel struct {
	ID   string  `json:"id"`
	Name *string `json:"name,omitempty"` // nil if absent
}

type LlmModelListResponse struct {
	Data []LlmModel `json:"data"`
}
