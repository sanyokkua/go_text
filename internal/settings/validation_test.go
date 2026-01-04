package settings

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

// MockLogger is a simple logger for testing that implements the logger interface
type MockLogger struct{}

func (l *MockLogger) Print(message string)   {}
func (l *MockLogger) Trace(message string)   {}
func (l *MockLogger) Debug(message string)   {}
func (l *MockLogger) Info(message string)    {}
func (l *MockLogger) Warning(message string) {}
func (l *MockLogger) Error(message string)   {}
func (l *MockLogger) Fatal(message string)   {}

// Test helper functions for creating test data
func createValidProviderConfig() *ProviderConfig {
	return &ProviderConfig{
		ProviderID:          "test-provider-id",
		ProviderName:        "Test Provider",
		ProviderType:        ProviderTypeOpenAICompatible,
		BaseUrl:             "http://localhost:8080/",
		ModelsEndpoint:      "v1/models",
		CompletionEndpoint:  "v1/chat/completions",
		AuthType:            AuthTypeBearer,
		AuthToken:           "test-token",
		UseAuthTokenFromEnv: false,
		EnvVarTokenName:     "",
		UseCustomHeaders:    false,
		Headers:             nil,
		UseCustomModels:     false,
		CustomModels:        nil,
	}
}

func createValidSettings() *Settings {
	providerConfig := createValidProviderConfig()
	return &Settings{
		AvailableProviderConfigs: []ProviderConfig{*providerConfig},
		CurrentProviderConfig:    *providerConfig,
		InferenceBaseConfig: InferenceBaseConfig{
			Timeout:              60,
			MaxRetries:           3,
			UseMarkdownForOutput: false,
		},
		ModelConfig: ModelConfig{
			Name:           "test-model",
			UseTemperature: true,
			Temperature:    0.5,
		},
		LanguageConfig: LanguageConfig{
			Languages:             []string{"English", "Spanish", "French"},
			DefaultInputLanguage:  "English",
			DefaultOutputLanguage: "Spanish",
		},
	}
}

// Test Validation Functions

func TestValidateBaseURL(t *testing.T) {
	tests := []struct {
		name          string
		baseURL       string
		expectError   bool
		errorContains string
	}{
		{
			name:        "valid_http_url_with_trailing_slash",
			baseURL:     "http://localhost:8080/",
			expectError: false,
		},
		{
			name:        "valid_https_url_with_trailing_slash",
			baseURL:     "https://api.example.com/",
			expectError: false,
		},
		{
			name:          "empty_url",
			baseURL:       "",
			expectError:   true,
			errorContains: "base URL cannot be empty",
		},
		{
			name:          "missing_trailing_slash",
			baseURL:       "http://localhost:8080",
			expectError:   true,
			errorContains: "base URL must end with a trailing slash",
		},
		{
			name:          "invalid_url_format",
			baseURL:       "not-a-url",
			expectError:   true,
			errorContains: "invalid URL scheme",
		},
		{
			name:          "invalid_scheme",
			baseURL:       "ftp://localhost:8080/",
			expectError:   true,
			errorContains: "invalid URL scheme",
		},
		{
			name:        "url_with_path_and_trailing_slash",
			baseURL:     "http://localhost:8080/api/v1/",
			expectError: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateBaseURL(tt.baseURL)
			if tt.expectError {
				assert.Error(t, err)
				if tt.errorContains != "" {
					assert.Contains(t, err.Error(), tt.errorContains)
				}
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestValidateEndpoint(t *testing.T) {
	tests := []struct {
		name          string
		endpoint      string
		expectError   bool
		errorContains string
	}{
		{
			name:        "empty_endpoint",
			endpoint:    "",
			expectError: false,
		},
		{
			name:        "valid_endpoint",
			endpoint:    "v1/models",
			expectError: false,
		},
		{
			name:          "endpoint_with_leading_slash",
			endpoint:      "/v1/models",
			expectError:   true,
			errorContains: "endpoint must not start with a forward slash",
		},
		{
			name:        "endpoint_with_multiple_segments",
			endpoint:    "api/v1/chat/completions",
			expectError: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateEndpoint(tt.endpoint)
			if tt.expectError {
				assert.Error(t, err)
				if tt.errorContains != "" {
					assert.Contains(t, err.Error(), tt.errorContains)
				}
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestValidateProviderConfig(t *testing.T) {
	tests := []struct {
		name          string
		config        *ProviderConfig
		expectError   bool
		errorContains string
	}{
		{
			name:        "valid_config",
			config:      createValidProviderConfig(),
			expectError: false,
		},
		{
			name:          "nil_config",
			config:        nil,
			expectError:   true,
			errorContains: "provider config is nil",
		},
		{
			name: "empty_provider_name",
			config: &ProviderConfig{
				ProviderID:          "test-id",
				ProviderName:        "",
				ProviderType:        ProviderTypeOpenAICompatible,
				BaseUrl:             "http://localhost:8080/",
				ModelsEndpoint:      "v1/models",
				CompletionEndpoint:  "v1/chat/completions",
				AuthType:            AuthTypeBearer,
				AuthToken:           "test-token",
				UseAuthTokenFromEnv: false,
			},
			expectError:   true,
			errorContains: "provider name cannot be empty",
		},
		{
			name: "invalid_provider_type",
			config: &ProviderConfig{
				ProviderID:          "test-id",
				ProviderName:        "Test Provider",
				ProviderType:        "invalid-type",
				BaseUrl:             "http://localhost:8080/",
				ModelsEndpoint:      "v1/models",
				CompletionEndpoint:  "v1/chat/completions",
				AuthType:            AuthTypeBearer,
				AuthToken:           "test-token",
				UseAuthTokenFromEnv: false,
			},
			expectError:   true,
			errorContains: "invalid provider type",
		},
		{
			name: "invalid_base_url",
			config: &ProviderConfig{
				ProviderID:          "test-id",
				ProviderName:        "Test Provider",
				ProviderType:        ProviderTypeOpenAICompatible,
				BaseUrl:             "invalid-url",
				ModelsEndpoint:      "v1/models",
				CompletionEndpoint:  "v1/chat/completions",
				AuthType:            AuthTypeBearer,
				AuthToken:           "test-token",
				UseAuthTokenFromEnv: false,
			},
			expectError:   true,
			errorContains: "invalid base URL",
		},
		{
			name: "empty_completion_endpoint",
			config: &ProviderConfig{
				ProviderID:          "test-id",
				ProviderName:        "Test Provider",
				ProviderType:        ProviderTypeOpenAICompatible,
				BaseUrl:             "http://localhost:8080/",
				ModelsEndpoint:      "v1/models",
				CompletionEndpoint:  "",
				AuthType:            AuthTypeBearer,
				AuthToken:           "test-token",
				UseAuthTokenFromEnv: false,
			},
			expectError:   true,
			errorContains: "completion endpoint cannot be empty",
		},
		{
			name: "invalid_completion_endpoint",
			config: &ProviderConfig{
				ProviderID:          "test-id",
				ProviderName:        "Test Provider",
				ProviderType:        ProviderTypeOpenAICompatible,
				BaseUrl:             "http://localhost:8080/",
				ModelsEndpoint:      "v1/models",
				CompletionEndpoint:  "/v1/chat/completions",
				AuthType:            AuthTypeBearer,
				AuthToken:           "test-token",
				UseAuthTokenFromEnv: false,
			},
			expectError:   true,
			errorContains: "invalid completion endpoint",
		},
		{
			name: "invalid_auth_type",
			config: &ProviderConfig{
				ProviderID:          "test-id",
				ProviderName:        "Test Provider",
				ProviderType:        ProviderTypeOpenAICompatible,
				BaseUrl:             "http://localhost:8080/",
				ModelsEndpoint:      "v1/models",
				CompletionEndpoint:  "v1/chat/completions",
				AuthType:            "invalid-auth",
				AuthToken:           "test-token",
				UseAuthTokenFromEnv: false,
			},
			expectError:   true,
			errorContains: "invalid auth type",
		},
		{
			name: "missing_models_endpoint_when_not_using_custom_models",
			config: &ProviderConfig{
				ProviderID:          "test-id",
				ProviderName:        "Test Provider",
				ProviderType:        ProviderTypeOpenAICompatible,
				BaseUrl:             "http://localhost:8080/",
				ModelsEndpoint:      "",
				CompletionEndpoint:  "v1/chat/completions",
				AuthType:            AuthTypeBearer,
				AuthToken:           "test-token",
				UseAuthTokenFromEnv: false,
				UseCustomModels:     false,
			},
			expectError:   true,
			errorContains: "models endpoint required when not using custom models",
		},
		{
			name: "missing_env_var_name_when_using_env_token",
			config: &ProviderConfig{
				ProviderID:          "test-id",
				ProviderName:        "Test Provider",
				ProviderType:        ProviderTypeOpenAICompatible,
				BaseUrl:             "http://localhost:8080/",
				ModelsEndpoint:      "v1/models",
				CompletionEndpoint:  "v1/chat/completions",
				AuthType:            AuthTypeBearer,
				AuthToken:           "",
				UseAuthTokenFromEnv: true,
				EnvVarTokenName:     "",
			},
			expectError:   true,
			errorContains: "environment variable name required when loading token from environment",
		},
		{
			name: "missing_auth_token_when_not_using_env",
			config: &ProviderConfig{
				ProviderID:          "test-id",
				ProviderName:        "Test Provider",
				ProviderType:        ProviderTypeOpenAICompatible,
				BaseUrl:             "http://localhost:8080/",
				ModelsEndpoint:      "v1/models",
				CompletionEndpoint:  "v1/chat/completions",
				AuthType:            AuthTypeBearer,
				AuthToken:           "",
				UseAuthTokenFromEnv: false,
			},
			expectError:   true,
			errorContains: "auth token required for auth type",
		},
		{
			name: "empty_custom_models_when_using_custom_models",
			config: &ProviderConfig{
				ProviderID:          "test-id",
				ProviderName:        "Test Provider",
				ProviderType:        ProviderTypeOpenAICompatible,
				BaseUrl:             "http://localhost:8080/",
				ModelsEndpoint:      "v1/models",
				CompletionEndpoint:  "v1/chat/completions",
				AuthType:            AuthTypeBearer,
				AuthToken:           "test-token",
				UseAuthTokenFromEnv: false,
				UseCustomModels:     true,
				CustomModels:        []string{},
			},
			expectError:   true,
			errorContains: "custom models required when using custom models",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateProviderConfig(tt.config)
			if tt.expectError {
				assert.Error(t, err)
				if tt.errorContains != "" {
					assert.Contains(t, err.Error(), tt.errorContains)
				}
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestValidateSettings(t *testing.T) {
	tests := []struct {
		name          string
		settings      Settings
		expectError   bool
		errorContains string
	}{
		{
			name:        "valid_settings",
			settings:    *createValidSettings(),
			expectError: false,
		},
		{
			name: "duplicate_provider_names",
			settings: Settings{
				AvailableProviderConfigs: []ProviderConfig{
					{
						ProviderID:         "id1",
						ProviderName:       "Duplicate Name",
						ProviderType:       ProviderTypeOpenAICompatible,
						BaseUrl:            "http://localhost:8080/",
						ModelsEndpoint:     "v1/models",
						CompletionEndpoint: "v1/chat/completions",
						AuthType:           AuthTypeBearer,
						AuthToken:          "token1",
					},
					{
						ProviderID:         "id2",
						ProviderName:       "Duplicate Name",
						ProviderType:       ProviderTypeOllama,
						BaseUrl:            "http://localhost:8081/",
						ModelsEndpoint:     "v1/models",
						CompletionEndpoint: "v1/chat/completions",
						AuthType:           AuthTypeBearer,
						AuthToken:          "token2",
					},
				},
				CurrentProviderConfig: ProviderConfig{
					ProviderID:         "id1",
					ProviderName:       "Duplicate Name",
					ProviderType:       ProviderTypeOpenAICompatible,
					BaseUrl:            "http://localhost:8080/",
					ModelsEndpoint:     "v1/models",
					CompletionEndpoint: "v1/chat/completions",
					AuthType:           AuthTypeBearer,
					AuthToken:          "token1",
				},
				InferenceBaseConfig: InferenceBaseConfig{
					Timeout:              60,
					MaxRetries:           3,
					UseMarkdownForOutput: false,
				},
				ModelConfig: ModelConfig{
					Name:           "test-model",
					UseTemperature: true,
					Temperature:    0.5,
				},
				LanguageConfig: LanguageConfig{
					Languages:             []string{"English", "Spanish"},
					DefaultInputLanguage:  "English",
					DefaultOutputLanguage: "Spanish",
				},
			},
			expectError:   true,
			errorContains: "duplicate provider name",
		},
		{
			name: "current_provider_not_in_available_providers",
			settings: Settings{
				AvailableProviderConfigs: []ProviderConfig{
					{
						ProviderID:         "id1",
						ProviderName:       "Available Provider",
						ProviderType:       ProviderTypeOpenAICompatible,
						BaseUrl:            "http://localhost:8080/",
						ModelsEndpoint:     "v1/models",
						CompletionEndpoint: "v1/chat/completions",
						AuthType:           AuthTypeBearer,
						AuthToken:          "token1",
					},
				},
				CurrentProviderConfig: ProviderConfig{
					ProviderID:         "id2",
					ProviderName:       "Not Available Provider",
					ProviderType:       ProviderTypeOllama,
					BaseUrl:            "http://localhost:8081/",
					ModelsEndpoint:     "v1/models",
					CompletionEndpoint: "v1/chat/completions",
					AuthType:           AuthTypeBearer,
					AuthToken:          "token2",
				},
				InferenceBaseConfig: InferenceBaseConfig{
					Timeout:              60,
					MaxRetries:           3,
					UseMarkdownForOutput: false,
				},
				ModelConfig: ModelConfig{
					Name:           "test-model",
					UseTemperature: true,
					Temperature:    0.5,
				},
				LanguageConfig: LanguageConfig{
					Languages:             []string{"English", "Spanish"},
					DefaultInputLanguage:  "English",
					DefaultOutputLanguage: "Spanish",
				},
			},
			expectError:   true,
			errorContains: "current provider \"Not Available Provider\" not found in available providers",
		},
		{
			name: "empty_current_provider_name",
			settings: Settings{
				AvailableProviderConfigs: []ProviderConfig{
					{
						ProviderID:         "id1",
						ProviderName:       "Available Provider",
						ProviderType:       ProviderTypeOpenAICompatible,
						BaseUrl:            "http://localhost:8080/",
						ModelsEndpoint:     "v1/models",
						CompletionEndpoint: "v1/chat/completions",
						AuthType:           AuthTypeBearer,
						AuthToken:          "token1",
					},
				},
				CurrentProviderConfig: ProviderConfig{
					ProviderName: "",
				},
				InferenceBaseConfig: InferenceBaseConfig{
					Timeout:              60,
					MaxRetries:           3,
					UseMarkdownForOutput: false,
				},
				ModelConfig: ModelConfig{
					Name:           "test-model",
					UseTemperature: true,
					Temperature:    0.5,
				},
				LanguageConfig: LanguageConfig{
					Languages:             []string{"English", "Spanish"},
					DefaultInputLanguage:  "English",
					DefaultOutputLanguage: "Spanish",
				},
			},
			expectError:   true,
			errorContains: "current provider name cannot be empty",
		},
		{
			name: "negative_timeout",
			settings: Settings{
				AvailableProviderConfigs: []ProviderConfig{*createValidProviderConfig()},
				CurrentProviderConfig:    *createValidProviderConfig(),
				InferenceBaseConfig: InferenceBaseConfig{
					Timeout:              -1,
					MaxRetries:           3,
					UseMarkdownForOutput: false,
				},
				ModelConfig: ModelConfig{
					Name:           "test-model",
					UseTemperature: true,
					Temperature:    0.5,
				},
				LanguageConfig: LanguageConfig{
					Languages:             []string{"English", "Spanish"},
					DefaultInputLanguage:  "English",
					DefaultOutputLanguage: "Spanish",
				},
			},
			expectError:   true,
			errorContains: "timeout must be non-negative",
		},
		{
			name: "negative_max_retries",
			settings: Settings{
				AvailableProviderConfigs: []ProviderConfig{*createValidProviderConfig()},
				CurrentProviderConfig:    *createValidProviderConfig(),
				InferenceBaseConfig: InferenceBaseConfig{
					Timeout:              60,
					MaxRetries:           -1,
					UseMarkdownForOutput: false,
				},
				ModelConfig: ModelConfig{
					Name:           "test-model",
					UseTemperature: true,
					Temperature:    0.5,
				},
				LanguageConfig: LanguageConfig{
					Languages:             []string{"English", "Spanish"},
					DefaultInputLanguage:  "English",
					DefaultOutputLanguage: "Spanish",
				},
			},
			expectError:   true,
			errorContains: "max retries must be non-negative",
		},
		{
			name: "empty_model_name",
			settings: Settings{
				AvailableProviderConfigs: []ProviderConfig{*createValidProviderConfig()},
				CurrentProviderConfig:    *createValidProviderConfig(),
				InferenceBaseConfig: InferenceBaseConfig{
					Timeout:              60,
					MaxRetries:           3,
					UseMarkdownForOutput: false,
				},
				ModelConfig: ModelConfig{
					Name:           "",
					UseTemperature: true,
					Temperature:    0.5,
				},
				LanguageConfig: LanguageConfig{
					Languages:             []string{"English", "Spanish"},
					DefaultInputLanguage:  "English",
					DefaultOutputLanguage: "Spanish",
				},
			},
			expectError:   true,
			errorContains: "model name cannot be empty",
		},
		{
			name: "invalid_temperature_range",
			settings: Settings{
				AvailableProviderConfigs: []ProviderConfig{*createValidProviderConfig()},
				CurrentProviderConfig:    *createValidProviderConfig(),
				InferenceBaseConfig: InferenceBaseConfig{
					Timeout:              60,
					MaxRetries:           3,
					UseMarkdownForOutput: false,
				},
				ModelConfig: ModelConfig{
					Name:           "test-model",
					UseTemperature: true,
					Temperature:    3.0,
				},
				LanguageConfig: LanguageConfig{
					Languages:             []string{"English", "Spanish"},
					DefaultInputLanguage:  "English",
					DefaultOutputLanguage: "Spanish",
				},
			},
			expectError:   true,
			errorContains: "temperature must be between 0 and 2 when enabled",
		},
		{
			name: "empty_languages_list",
			settings: Settings{
				AvailableProviderConfigs: []ProviderConfig{*createValidProviderConfig()},
				CurrentProviderConfig:    *createValidProviderConfig(),
				InferenceBaseConfig: InferenceBaseConfig{
					Timeout:              60,
					MaxRetries:           3,
					UseMarkdownForOutput: false,
				},
				ModelConfig: ModelConfig{
					Name:           "test-model",
					UseTemperature: true,
					Temperature:    0.5,
				},
				LanguageConfig: LanguageConfig{
					Languages:             []string{},
					DefaultInputLanguage:  "English",
					DefaultOutputLanguage: "Spanish",
				},
			},
			expectError:   true,
			errorContains: "languages list cannot be empty",
		},
		{
			name: "default_input_language_not_in_list",
			settings: Settings{
				AvailableProviderConfigs: []ProviderConfig{*createValidProviderConfig()},
				CurrentProviderConfig:    *createValidProviderConfig(),
				InferenceBaseConfig: InferenceBaseConfig{
					Timeout:              60,
					MaxRetries:           3,
					UseMarkdownForOutput: false,
				},
				ModelConfig: ModelConfig{
					Name:           "test-model",
					UseTemperature: true,
					Temperature:    0.5,
				},
				LanguageConfig: LanguageConfig{
					Languages:             []string{"English", "Spanish"},
					DefaultInputLanguage:  "French",
					DefaultOutputLanguage: "Spanish",
				},
			},
			expectError:   true,
			errorContains: "default input language not in supported languages list",
		},
		{
			name: "default_output_language_not_in_list",
			settings: Settings{
				AvailableProviderConfigs: []ProviderConfig{*createValidProviderConfig()},
				CurrentProviderConfig:    *createValidProviderConfig(),
				InferenceBaseConfig: InferenceBaseConfig{
					Timeout:              60,
					MaxRetries:           3,
					UseMarkdownForOutput: false,
				},
				ModelConfig: ModelConfig{
					Name:           "test-model",
					UseTemperature: true,
					Temperature:    0.5,
				},
				LanguageConfig: LanguageConfig{
					Languages:             []string{"English", "Spanish"},
					DefaultInputLanguage:  "English",
					DefaultOutputLanguage: "French",
				},
			},
			expectError:   true,
			errorContains: "default output language not in supported languages list",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateSettings(tt.settings)
			if tt.expectError {
				assert.Error(t, err)
				if tt.errorContains != "" {
					assert.Contains(t, err.Error(), tt.errorContains)
				}
			} else {
				assert.NoError(t, err)
			}
		})
	}
}
