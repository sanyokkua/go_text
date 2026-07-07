package settings

// ProviderConfig is the v3 domain model — matches the providers table and
// apperr.ProviderConfig exactly. No secrets: APIKeyEnvVar is the env-var name only.
type ProviderConfig struct {
	ID              string            `json:"id"`
	Name            string            `json:"name"`
	Kind            string            `json:"kind"`
	BaseURL         string            `json:"baseUrl"`
	AuthScheme      string            `json:"authScheme"`
	APIKeyEnvVar    string            `json:"apiKeyEnvVar"`
	APIVersion      string            `json:"apiVersion"`
	SelectedModel   string            `json:"selectedModel"`
	CompletionPath  string            `json:"completionPath"`
	ModelsPath      string            `json:"modelsPath"`
	UseCustomModels bool              `json:"useCustomModels"`
	Headers         map[string]string `json:"headers"`
	CustomModels    []string          `json:"customModels"`
	CreatedAt       int64             `json:"createdAt"`
	UpdatedAt       int64             `json:"updatedAt"`
}

type InferenceBaseConfig struct {
	Timeout              int  `json:"timeout"`
	MaxRetries           int  `json:"maxRetries"`
	UseMarkdownForOutput bool `json:"useMarkdownForOutput"`
}

type ModelConfig struct {
	Name               string  `json:"name"`
	UseTemperature     bool    `json:"useTemperature"`
	Temperature        float64 `json:"temperature"`
	UseContextWindow   bool    `json:"useContextWindow"`
	ContextWindow      int     `json:"contextWindow"`
	UseLegacyMaxTokens bool    `json:"useLegacyMaxTokens"`
	UseMaxOutputTokens bool    `json:"useMaxOutputTokens"`
	MaxOutputTokens    int     `json:"maxOutputTokens"`
}

// AppBehaviorConfig — v3 adds HistoryEnabled/HistoryMaxEntries;
// LogDirectory removed (moved to LoggingConfig).
type AppBehaviorConfig struct {
	EnableTaskLogging bool `json:"enableTaskLogging"`
	HistoryEnabled    bool `json:"historyEnabled"`
	HistoryMaxEntries int  `json:"historyMaxEntries"`
}

// UIPreferencesConfig holds persisted UI preferences that must survive restart.
// Theme is "auto" | "light" | "dark". Layout is "side" | "stacked".
// ViewMode is "preview" | "source" | "diff".
type UIPreferencesConfig struct {
	Theme            string `json:"theme"`
	Layout           string `json:"layout"`
	SidebarCollapsed bool   `json:"sidebarCollapsed"`
	HistoryOpen      bool   `json:"historyOpen"`
	ViewMode         string `json:"viewMode"`
}

// AppBarVisibilityConfig holds per-control visibility toggles for the app bar,
// letting users hide controls they don't use. All default to true (visible)
// so existing users see no behavior change on upgrade.
type AppBarVisibilityConfig struct {
	ProviderModelSelectors bool `json:"providerModelSelectors"`
	LanguagePicker         bool `json:"languagePicker"`
	OutputFormatToggle     bool `json:"outputFormatToggle"`
	OutputModeToggle       bool `json:"outputModeToggle"`
	LayoutToggle           bool `json:"layoutToggle"`
	CommandPaletteButton   bool `json:"commandPaletteButton"`
	HistoryButton          bool `json:"historyButton"`
	InfoButton             bool `json:"infoButton"`
}

// LastSelectionConfig persists the last user-selected action or stack so the
// editor can restore it on next launch. Kind is "action" | "stack" | "none".
type LastSelectionConfig struct {
	Kind     string `json:"kind"`
	ActionID string `json:"actionId"`
	StackID  string `json:"stackId"`
}

// WindowSizeConfig holds the persisted native window dimensions.
type WindowSizeConfig struct {
	Width  int `json:"width"`
	Height int `json:"height"`
}

// LoggingConfig maps the log.* KV rows from the settings table.
type LoggingConfig struct {
	LogFileEnabled bool   `json:"logFileEnabled"`
	LogLevel       string `json:"logLevel"`
	LogDirectory   string `json:"logDirectory"`
	LogMaxSizeMB   int    `json:"logMaxSizeMB"`
	LogMaxBackups  int    `json:"logMaxBackups"`
	LogMaxAgeDays  int    `json:"logMaxAgeDays"`
	LogCompress    bool   `json:"logCompress"`
}

type LanguageConfig struct {
	Languages             []string `json:"languages"`
	DefaultInputLanguage  string   `json:"defaultInputLanguage"`
	DefaultOutputLanguage string   `json:"defaultOutputLanguage"`
}

// Settings is the aggregate returned by GetSettings.
type Settings struct {
	AvailableProviderConfigs []ProviderConfig    `json:"availableProviderConfigs"`
	CurrentProviderConfig    ProviderConfig      `json:"currentProviderConfig"`
	InferenceBaseConfig      InferenceBaseConfig `json:"inferenceBaseConfig"`
	ModelConfig              ModelConfig         `json:"modelConfig"`
	LanguageConfig           LanguageConfig      `json:"languageConfig"`
	AppBehaviorConfig        AppBehaviorConfig   `json:"appBehaviorConfig"`
}

// AppSettingsMetadata — v3: DB path, AppVersion, AuthSchemes, ProviderKinds.
type AppSettingsMetadata struct {
	AuthSchemes    []string `json:"authSchemes"`
	ProviderKinds  []string `json:"providerKinds"`
	SettingsFolder string   `json:"settingsFolder"`
	DatabaseFile   string   `json:"databaseFile"`
	LogsFolder     string   `json:"logsFolder"`
	AppVersion     string   `json:"appVersion"`
}
