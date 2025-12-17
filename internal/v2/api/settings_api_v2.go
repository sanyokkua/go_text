package api

import (
	"go_text/internal/v2/model/settings"
)

type SettingsApi interface {
	GetProviderTypes() ([]string, error)

	GetCurrentSettings() (*settings.Settings, error)
	GetDefaultSettings() (*settings.Settings, error)
	SaveSettings(settings *settings.Settings) (*settings.Settings, error)

	ValidateProvider(config *settings.ProviderConfig) (bool, error)
	CreateNewProvider(config *settings.ProviderConfig) (*settings.ProviderConfig, error)
	UpdateProvider(config *settings.ProviderConfig) (*settings.ProviderConfig, error)
	DeleteProvider(config *settings.ProviderConfig) (bool, error)
	SelectProvider(config *settings.ProviderConfig) (*settings.ProviderConfig, error)

	GetModelsList(config *settings.ProviderConfig) ([]string, error)

	GetSettingsFilePath() string
}
