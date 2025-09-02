package ui

import (
	"go_text/internal/backend/models/settings"
	"go_text/internal/backend/models/ui"
)

type AppUISettingsApi interface {
	LoadSettings() (settings.Settings, error)
	SaveSettings(settings.Settings) error
	ResetToDefaultSettings() (settings.Settings, error)
	ValidateConnection(baseUrl string, headers map[string]string) (bool, error)
}

type AppUIStateApi interface {
	GetProofreadingItems() ([]ui.AppActionItem, error)
	GetFormattingItems() ([]ui.AppActionItem, error)
	GetTranslatingItems() ([]ui.AppActionItem, error)
	GetSummarizationItems() ([]ui.AppActionItem, error)
	GetInputLanguages() ([]ui.LanguageItem, error)
	GetOutputLanguages() ([]ui.LanguageItem, error)
	GetDefaultInputLanguage() (ui.LanguageItem, error)
	GetDefaultOutputLanguage() (ui.LanguageItem, error)
	GetModelsList() ([]string, error)
	GetCurrentModel() (string, error)
}

type AppUIActionApi interface {
	ProcessAction(action ui.AppActionObjWrapper) (string, error)
}
