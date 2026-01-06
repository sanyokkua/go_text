package prompts

type Prompt struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Type     string `json:"type"`
	Category string `json:"category"`
	Value    string `json:"value"`
}

type PromptGroup struct {
	GroupID      string            `json:"groupId"`
	GroupName    string            `json:"groupName"`
	SystemPrompt Prompt            `json:"systemPrompt"`
	Prompts      map[string]Prompt `json:"prompts"`
}

type Prompts struct {
	PromptGroups map[string]PromptGroup `json:"promptGroups"`
}

type PromptActionRequest struct {
	ID string `json:"id"`

	InputText  string `json:"inputText"`
	OutputText string `json:"outputText,omitempty"`

	InputLanguageID  string `json:"inputLanguageId,omitempty"`
	OutputLanguageID string `json:"outputLanguageId,omitempty"`
}
