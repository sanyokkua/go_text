package prompts

// ===== Prompt Struct =====

type Prompt struct {
	ID       string         `json:"id"`
	Type     PromptType     `json:"type"`
	Category PromptCategory `json:"category"`
	Value    string         `json:"value"`
}
