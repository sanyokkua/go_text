package api

import (
	"go_text/internal/v2/model"
)

type StateApi interface {
	GetInputLanguages() ([]model.LanguageItem, error)
	GetOutputLanguages() ([]model.LanguageItem, error)
	GetDefaultInputLanguage() (model.LanguageItem, error)
	GetDefaultOutputLanguage() (model.LanguageItem, error)
}
