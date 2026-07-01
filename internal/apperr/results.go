package apperr

// ─── Domain / data model types ────────────────────────────────────────────
// These are the exact shapes transmitted over the Wails bridge.

type ModelCaps struct {
	MaxPromptTokens      *int  `json:"maxPromptTokens,omitempty"`
	SupportsTemperature  *bool `json:"supportsTemperature,omitempty"`
	SupportsSystemPrompt *bool `json:"supportsSystemPrompt,omitempty"`
}

type ModelInfo struct {
	ID    string     `json:"id"`
	Label string     `json:"label"`
	Caps  *ModelCaps `json:"caps,omitempty"`
}

type ActionMeta struct {
	ID               string   `json:"id"`
	Name             string   `json:"name"`
	Category         string   `json:"category"`
	Family           string   `json:"family"`
	Directive        string   `json:"directive"`
	OrderRank        int      `json:"orderRank"`
	ExclusivityGroup string   `json:"exclusivityGroup"`
	Mergeable        bool     `json:"mergeable"`
	Terminal         bool     `json:"terminal"`
	Requires         []string `json:"requires"`
}

type ChainStep struct {
	ActionID    string `json:"actionId"`
	TargetModel string `json:"targetModel,omitempty"`
	Goal        string `json:"goal,omitempty"`
}

type ChainRequest struct {
	RunID            string      `json:"runId"`
	InputText        string      `json:"inputText"`
	Steps            []ChainStep `json:"steps"`
	InputLanguageID  string      `json:"inputLanguageId"`
	OutputLanguageID string      `json:"outputLanguageId"`
	UseMarkdown      bool        `json:"useMarkdown"`
}

type ChainResult struct {
	FinalText   string `json:"finalText"`
	Completed   int    `json:"completed"`
	FailedIndex *int   `json:"failedIndex,omitempty"`
	Error       string `json:"error,omitempty"`
}

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

type AppBehaviorConfig struct {
	EnableTaskLogging bool `json:"enableTaskLogging"`
	HistoryEnabled    bool `json:"historyEnabled"`
	HistoryMaxEntries int  `json:"historyMaxEntries"`
}

type UIPreferencesConfig struct {
	Theme            string `json:"theme"`
	Layout           string `json:"layout"`
	SidebarCollapsed bool   `json:"sidebarCollapsed"`
	HistoryOpen      bool   `json:"historyOpen"`
	ViewMode         string `json:"viewMode"`
}

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

type Settings struct {
	AvailableProviderConfigs []ProviderConfig    `json:"availableProviderConfigs"`
	CurrentProviderConfig    ProviderConfig      `json:"currentProviderConfig"`
	InferenceBaseConfig      InferenceBaseConfig `json:"inferenceBaseConfig"`
	ModelConfig              ModelConfig         `json:"modelConfig"`
	LanguageConfig           LanguageConfig      `json:"languageConfig"`
	AppBehaviorConfig        AppBehaviorConfig   `json:"appBehaviorConfig"`
}

type AppSettingsMetadata struct {
	AuthSchemes    []string `json:"authSchemes"`
	ProviderKinds  []string `json:"providerKinds"`
	SettingsFolder string   `json:"settingsFolder"`
	DatabaseFile   string   `json:"databaseFile"`
	LogsFolder     string   `json:"logsFolder"`
	AppVersion     string   `json:"appVersion"`
}

type VerifyOutcome struct {
	Check      string `json:"check"`
	OK         bool   `json:"ok"`
	DurationMs int64  `json:"durationMs"`
	ModelCount int    `json:"modelCount,omitempty"`
	Sample     string `json:"sample,omitempty"`
}

type SavedStack struct {
	ID             string   `json:"id"`
	Name           string   `json:"name"`
	Icon           string   `json:"icon"`
	Steps          []string `json:"steps"`
	DefaultFormat  string   `json:"defaultFormat"`
	DefaultInLang  string   `json:"defaultInLang"`
	DefaultOutLang string   `json:"defaultOutLang"`
	CreatedAt      int64    `json:"createdAt"`
	UpdatedAt      int64    `json:"updatedAt"`
}

type AppliedAction struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Category string `json:"category"`
}

type HistoryEntry struct {
	ID           string          `json:"id"`
	CreatedAt    int64           `json:"createdAt"`
	Kind         string          `json:"kind"`
	Title        string          `json:"title"`
	InputText    string          `json:"inputText"`
	OutputText   string          `json:"outputText"`
	Applied      []AppliedAction `json:"applied"`
	ProviderName string          `json:"providerName"`
	Model        string          `json:"model"`
	InputLang    string          `json:"inputLang"`
	OutputLang   string          `json:"outputLang"`
	Format       string          `json:"format"`
	DurationMs   int64           `json:"durationMs"`
	Inferences   int             `json:"inferences"`
	Status       string          `json:"status"`
	ErrorCode    string          `json:"errorCode"`
	FailedIndex  int             `json:"failedIndex"`
}

type PreviewParams struct {
	Model       string   `json:"model"`
	Temperature *float64 `json:"temperature,omitempty"`
	Format      string   `json:"format"`
	InputLang   string   `json:"inputLang,omitempty"`
	OutputLang  string   `json:"outputLang,omitempty"`
	TokenParam  string   `json:"tokenParam"`
	Stream      bool     `json:"stream"`
}

type PreviewGroup struct {
	Index          int             `json:"index"`
	Family         string          `json:"family"`
	AppliedActions []AppliedAction `json:"appliedActions"`
	SystemPrompt   string          `json:"systemPrompt"`
	UserPrompt     string          `json:"userPrompt"`
	Parameters     PreviewParams   `json:"parameters"`
}

type PromptPreview struct {
	Kind       string         `json:"kind"`
	Inferences int            `json:"inferences"`
	Groups     []PreviewGroup `json:"groups"`
	Summary    string         `json:"summary"`
}

type PromptPreviewRequest struct {
	ActionID         string      `json:"actionId,omitempty"`
	Steps            []ChainStep `json:"steps,omitempty"`
	StackID          string      `json:"stackId,omitempty"`
	UseMarkdown      bool        `json:"useMarkdown"`
	InputLanguageID  string      `json:"inputLanguageId"`
	OutputLanguageID string      `json:"outputLanguageId"`
	SampleInput      string      `json:"sampleInput,omitempty"`
}

// SuggestedStack is one recommended stack recipe shown in the Info/About
// guide. ActionIDs and ActionNames are index-aligned; unknown action IDs are
// dropped from both before transmission.
type SuggestedStack struct {
	Name        string   `json:"name"`
	Icon        string   `json:"icon"`
	ActionIDs   []string `json:"actionIds"`
	ActionNames []string `json:"actionNames"`
}

// ProviderPreset is a one-click preset for the New-Provider form. OpenRouter
// reuses the existing "openai" kind; no new provider kind is introduced.
type ProviderPreset struct {
	Name           string `json:"name"`
	Kind           string `json:"kind"`
	BaseURL        string `json:"baseUrl"`
	AuthScheme     string `json:"authScheme"`
	CompletionPath string `json:"completionPath"`
	ModelsPath     string `json:"modelsPath"`
	APIKeyEnvVar   string `json:"apiKeyEnvVar"`
	Headers        string `json:"headers"`
}

// ─── Result envelope types ────────────────────────────────────────────────
// Bound handler methods return these directly — no separate error return.

type SuggestedStacksResult struct {
	Data  []SuggestedStack `json:"data,omitempty"`
	Error *WireError       `json:"error,omitempty"`
}

type ProviderPresetsResult struct {
	Data  []ProviderPreset `json:"data,omitempty"`
	Error *WireError       `json:"error,omitempty"`
}

type VoidResult struct {
	Error *WireError `json:"error,omitempty"`
}

type StringResult struct {
	Data  string     `json:"data"`
	Error *WireError `json:"error,omitempty"`
}

type ModelsResult struct {
	Data  []ModelInfo `json:"data"`
	Error *WireError  `json:"error,omitempty"`
}

type CatalogResult struct {
	Data  []ActionMeta `json:"data"`
	Error *WireError   `json:"error,omitempty"`
}

type SettingsResult struct {
	Data  *Settings  `json:"data,omitempty"`
	Error *WireError `json:"error,omitempty"`
}

type ChainResultEnv struct {
	Data  *ChainResult `json:"data,omitempty"`
	Error *WireError   `json:"error,omitempty"`
}

// StepProgress is emitted as the "chain:progress" Wails event payload per inference group.
type StepProgress struct {
	RunID       string `json:"runId"`
	GroupIndex  int    `json:"groupIndex"`
	TotalGroups int    `json:"totalGroups"`
	Family      string `json:"family"`
	Status      string `json:"status"` // "running" | "done" | "failed"
}

type StacksResult struct {
	Data  []SavedStack `json:"data"`
	Error *WireError   `json:"error,omitempty"`
}

type StackResult struct {
	Data  *SavedStack `json:"data,omitempty"`
	Error *WireError  `json:"error,omitempty"`
}

type HistoryListResult struct {
	Data  []HistoryEntry `json:"data"`
	Error *WireError     `json:"error,omitempty"`
}

type HistoryEntryResult struct {
	Data  *HistoryEntry `json:"data,omitempty"`
	Error *WireError    `json:"error,omitempty"`
}

type PromptPreviewResult struct {
	Data  *PromptPreview `json:"data,omitempty"`
	Error *WireError     `json:"error,omitempty"`
}

type ProviderResult struct {
	Data  *ProviderConfig `json:"data,omitempty"`
	Error *WireError      `json:"error,omitempty"`
}

type ProvidersResult struct {
	Data  []ProviderConfig `json:"data"`
	Error *WireError       `json:"error,omitempty"`
}

type InferenceResult struct {
	Data  *InferenceBaseConfig `json:"data,omitempty"`
	Error *WireError           `json:"error,omitempty"`
}

type ModelConfigResult struct {
	Data  *ModelConfig `json:"data,omitempty"`
	Error *WireError   `json:"error,omitempty"`
}

type AppBehaviorResult struct {
	Data  *AppBehaviorConfig `json:"data,omitempty"`
	Error *WireError         `json:"error,omitempty"`
}

type UIPreferencesResult struct {
	Data  *UIPreferencesConfig `json:"data,omitempty"`
	Error *WireError           `json:"error,omitempty"`
}

type LanguageResult struct {
	Data  *LanguageConfig `json:"data,omitempty"`
	Error *WireError      `json:"error,omitempty"`
}

type LanguagesResult struct {
	Data  []string   `json:"data"`
	Error *WireError `json:"error,omitempty"`
}

type MetadataResult struct {
	Data  *AppSettingsMetadata `json:"data,omitempty"`
	Error *WireError           `json:"error,omitempty"`
}

type VerifyResult struct {
	Data  *VerifyOutcome `json:"data,omitempty"`
	Error *WireError     `json:"error,omitempty"`
}

type LoggingResult struct {
	Data  *LoggingConfig `json:"data,omitempty"`
	Error *WireError     `json:"error,omitempty"`
}
