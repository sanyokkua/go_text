package settings

import (
	"go_text/internal/backend/constants/llm"
	"go_text/internal/backend/models/settings"
)

var languages = [15]string{
	"Chinese",
	"Croatian",
	"Czech",
	"English",
	"French",
	"German",
	"Hindi",
	"Italian",
	"Korean",
	"Polish",
	"Portuguese",
	"Russian",
	"Serbian",
	"Spanish",
	"Ukrainian",
}

var DefaultSetting = settings.Settings{
	BaseUrl:               llm.DefaultOllamaBaseUrl,
	Headers:               map[string]string{},
	ModelName:             "gpt-oss:20b",
	Temperature:           0.5,
	DefaultInputLanguage:  "English",
	DefaultOutputLanguage: "Ukrainian",
	Languages:             languages[:],
	UseMarkdownForOutput:  false,
}
