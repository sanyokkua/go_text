package settings

import "go_text/internal/backend/models/settings"

type SettingsService interface {
	GetDefaultSettings() (settings.Settings, error)
	GetCurrentSettings() (settings.Settings, error)
	SetSettings(settings settings.Settings) error

	GetBaseUrl() (string, error)
	GetHeaders() (map[string]string, error)
	GetModelName() (string, error)
	GetTemperature() (float64, error)
	GetDefaultInputLanguage() (string, error)
	GetDefaultOutputLanguage() (string, error)
	GetLanguages() ([]string, error)
	GetUseMarkdownForOutput() (bool, error)
}
