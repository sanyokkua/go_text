package settings

type ProviderType string
type AuthType string

const (
	ProviderTypeOpenAICompatible ProviderType = "open-ai-compatible"
	ProviderTypeOllama           ProviderType = "ollama"
)
const (
	AuthTypeNone   AuthType = "none"
	AuthTypeApiKey AuthType = "api-key"
	AuthTypeBearer AuthType = "bearer"
)

var ProviderTypes = []ProviderType{ProviderTypeOpenAICompatible, ProviderTypeOllama}
var AuthTypes = []AuthType{AuthTypeNone, AuthTypeApiKey, AuthTypeBearer}

type ProviderConfig struct {
	// Generated on the backend side, unique
	ProviderID string `json:"providerId"`
	// Set by User, should be unique
	ProviderName string `json:"providerName"`
	// Required
	ProviderType ProviderType `json:"providerType"`
	// Required, can be http or https, should end with /, like http://localhost:8080/, or http://localhost:8080/api/v1/
	BaseUrl string `json:"baseUrl"`
	// Optional, but is required if UseCustomModels is false, should not start with /, should be like api/models or api/v1/models
	ModelsEndpoint string `json:"modelsEndpoint"`
	// Required, should not start with /, should be like api/completion or api/v1/chatcompletion
	CompletionEndpoint string `json:"completionEndpoint"`
	// Required, default AuthTypeNone
	AuthType AuthType `json:"authType"`
	// Optional
	AuthToken string `json:"authToken"`
	// Default false, but if it is true - EnvVarTokenName shouldn't be empty
	LoadAuthTokenFromEnv bool `json:"loadAuthTokenFromEnv"`
	// Optional, but if LoadAuthTokenFromEnv is true - should present
	EnvVarTokenName string `json:"envVarTokenName"`
	// Default false
	UseCustomHeaders bool `json:"useCustomHeaders"`
	// Optional, default empty
	Headers map[string]string `json:"headers"`
	// Default false, but if it is true - CustomModels shouldn't be empty
	UseCustomModels bool `json:"useCustomModels"`
	// Optional
	CustomModels []string `json:"customModels"`
}

type InferenceBaseConfig struct {
	// Optional, default 30 seconds (timeout int value is seconds)
	Timeout int `json:"timeout"`
	// Optional, default 3 retry
	MaxRetries int `json:"maxRetries"`
	// Tell LLM to return output as Markdown
	UseMarkdownForOutput bool `json:"useMarkdownForOutput"`
}

type ModelConfig struct {
	// Required, non empty
	Name string `json:"name"`
	// Default is false, but if true - Temperature should be set
	UseTemperature bool `json:"useTemperature"`
	// Optional, but can be from 0 to 2
	// 0.0 - 0.5	Deterministic, focused, accurate
	// 0.6 - 1.0	Balanced creativity and coherence
	// 1.1 - 2.0	Random, diverse, creative
	Temperature float64 `json:"temperature"`
}

type LanguageConfig struct {
	// Required, non empty
	Languages []string `json:"languages"`
	// Required, non empty
	DefaultInputLanguage string `json:"defaultInputLanguage"`
	// Required, non empty
	DefaultOutputLanguage string `json:"defaultOutputLanguage"`
}

// Settings - main struct that Will be saved to Hard Drive
type Settings struct {
	AvailableProviderConfigs []ProviderConfig    `json:"availableProviderConfigs"`
	CurrentProviderConfig    ProviderConfig      `json:"currentProviderConfig"`
	InferenceBaseConfig      InferenceBaseConfig `json:"inferenceBaseConfig"`
	ModelConfig              ModelConfig         `json:"modelConfig"`
	LanguageConfig           LanguageConfig      `json:"languageConfig"`
}

// AppSettingsMetadata - Will be passed to the frontend, kind of wrapper with additional fields used by UI
type AppSettingsMetadata struct {
	AuthTypes      []AuthType     `json:"authTypes"`
	ProviderTypes  []ProviderType `json:"providerTypes"`
	SettingsFolder string         `json:"settingsFolder"`
	SettingsFile   string         `json:"settingsFile"`
}
