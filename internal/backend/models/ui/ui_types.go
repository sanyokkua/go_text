package ui

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
