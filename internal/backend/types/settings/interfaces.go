package settings

type SettingsService interface {
	GetSettings() (Settings, error)
	SetSettings(settings Settings) error
}
