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
}

// AppBehaviorConfig — v3 adds HistoryEnabled/HistoryMaxEntries;
// LogDirectory removed (moved to LoggingConfig).
type AppBehaviorConfig struct {
	EnableTaskLogging bool `json:"enableTaskLogging"`
	HistoryEnabled    bool `json:"historyEnabled"`
	HistoryMaxEntries int  `json:"historyMaxEntries"`
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
