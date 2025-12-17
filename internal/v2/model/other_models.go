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
