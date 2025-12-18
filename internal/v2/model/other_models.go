package model

type Prompt struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Type     string `json:"type"`
	Category string `json:"category"`
	Value    string `json:"value"`
}

type LanguageItem struct {
	LanguageId   string `json:"languageId"`
	LanguageText string `json:"languageText"`
}

type AppPromptGroup struct {
	GroupName    string
	SystemPrompt Prompt
	Prompts      map[string]Prompt
}
type AppPrompts struct {
	PromptGroups map[string]AppPromptGroup
}
