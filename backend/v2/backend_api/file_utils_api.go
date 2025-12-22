package backend_api

import "go_text/backend/v2/model/settings"

type FileUtilsApi interface {
	InitAndGetAppSettingsFolder() (string, error)
	InitDefaultSettingsIfAbsent() error
	SaveSettings(settingsObj *settings.Settings) error
	LoadSettings() (*settings.Settings, error)
	GetSettingsFilePath() string
}
