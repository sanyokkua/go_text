package models

type Prompt struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Type     string `json:"type"`
	Category string `json:"category"`
	Value    string `json:"value"`
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
