package settings

// SettingsRepositoryAPI is the contract for the SQLite settings repository.
// All methods use context.Background() internally — Wails bound callers supply no ctx.
type SettingsRepositoryAPI interface {
	// Provider CRUD
	ListProviders() ([]ProviderConfig, error)
	GetProvider(id string) (*ProviderConfig, error)
	GetCurrentProvider() (*ProviderConfig, error) // nil, nil when no current provider
	CreateProvider(cfg *ProviderConfig) (*ProviderConfig, error)
	UpdateProvider(cfg *ProviderConfig) (*ProviderConfig, error)
	DeleteProvider(id string) error // repoints current if deleted provider was current
	SetCurrentProvider(id string) error

	// KV configuration groups
	GetInferenceConfig() (*InferenceBaseConfig, error)
	UpdateInferenceConfig(cfg *InferenceBaseConfig) error
	GetModelConfig() (*ModelConfig, error)
	UpdateModelConfig(cfg *ModelConfig) error
	GetAppBehaviorConfig() (*AppBehaviorConfig, error)
	UpdateAppBehaviorConfig(cfg *AppBehaviorConfig) error
	GetLoggingConfig() (*LoggingConfig, error)
	UpdateLoggingConfig(cfg *LoggingConfig) error

	// Languages (list from languages table; defaults from lang.* KV settings)
	GetLanguageConfig() (*LanguageConfig, error)
	AddLanguage(name string) error
	RemoveLanguage(name string) error
	SetDefaultInputLanguage(name string) error
	SetDefaultOutputLanguage(name string) error

	// Factory reset: wipes all tables, reseeds defaults
	ResetToDefaults() error
}
