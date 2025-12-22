package settings

import (
	"errors"
	"fmt"
	"strings"
	"testing"

	"go_text/backend/v2/constant"
	"go_text/backend/v2/model"
	"go_text/backend/v2/model/action"
	"go_text/backend/v2/model/llm"
	"go_text/backend/v2/model/settings"
)

// MockLogger for testing
type MockLogger struct {
	InfoMessages  []string
	DebugMessages []string
	ErrorMessages []string
	WarnMessages  []string
}

func (m *MockLogger) LogInfo(msg string, keysAndValues ...interface{}) {
	m.InfoMessages = append(m.InfoMessages, fmt.Sprintf(msg, keysAndValues...))
}

func (m *MockLogger) LogDebug(msg string, keysAndValues ...interface{}) {
	m.DebugMessages = append(m.DebugMessages, fmt.Sprintf(msg, keysAndValues...))
}

func (m *MockLogger) LogWarn(msg string, keysAndValues ...interface{}) {
	m.WarnMessages = append(m.WarnMessages, fmt.Sprintf(msg, keysAndValues...))
}

func (m *MockLogger) LogError(msg string, keysAndValues ...interface{}) {
	m.ErrorMessages = append(m.ErrorMessages, fmt.Sprintf(msg, keysAndValues...))
}

func (m *MockLogger) Clear() {
	m.InfoMessages = nil
	m.DebugMessages = nil
	m.ErrorMessages = nil
	m.WarnMessages = nil
}

// MockFileUtilsService for testing
type MockFileUtilsService struct {
	loadSettingsResult *settings.Settings
	loadSettingsError  error
	saveSettingsError  error
	settingsFilePath   string
}

func (m *MockFileUtilsService) InitAndGetAppSettingsFolder() (string, error) {
	return "/tmp/test", nil
}

func (m *MockFileUtilsService) InitDefaultSettingsIfAbsent() error {
	return nil
}

func (m *MockFileUtilsService) LoadSettings() (*settings.Settings, error) {
	return m.loadSettingsResult, m.loadSettingsError
}

func (m *MockFileUtilsService) SaveSettings(settings *settings.Settings) error {
	return m.saveSettingsError
}

func (m *MockFileUtilsService) GetSettingsFilePath() string {
	return m.settingsFilePath
}

// MockLlmHttpApi for testing
type MockLlmHttpApi struct {
	modelsListResult []llm.LlmModel
	modelsListError  error
}

func (m *MockLlmHttpApi) ModelListRequest(baseUrl, endpoint string, headers map[string]string) (*llm.LlmModelListResponse, error) {
	return &llm.LlmModelListResponse{Data: m.modelsListResult}, m.modelsListError
}

func (m *MockLlmHttpApi) CompletionRequest(baseUrl, endpoint string, headers map[string]string, request *llm.ChatCompletionRequest) (*llm.ChatCompletionResponse, error) {
	return &llm.ChatCompletionResponse{}, nil
}

// MockMapperUtils for testing
type MockMapperUtils struct {
	modelNamesResult []string
}

func (m *MockMapperUtils) MapPromptsToActionItems(prompts []model.Prompt) []action.Action {
	return []action.Action{}
}

func (m *MockMapperUtils) MapLanguageToLanguageItem(language string) model.LanguageItem {
	return model.LanguageItem{LanguageId: language, LanguageText: language}
}

func (m *MockMapperUtils) MapLanguagesToLanguageItems(languages []string) []model.LanguageItem {
	result := make([]model.LanguageItem, len(languages))
	for i, lang := range languages {
		result[i] = model.LanguageItem{LanguageId: lang, LanguageText: lang}
	}
	return result
}

func (m *MockMapperUtils) MapModelNames(response *llm.LlmModelListResponse) []string {
	return m.modelNamesResult
}

// Test GetProviderTypes
func TestGetProviderTypes(t *testing.T) {
	logger := &MockLogger{}
	fileUtils := &MockFileUtilsService{}
	llmHttpApi := &MockLlmHttpApi{}
	mapper := &MockMapperUtils{}

	service := NewSettingsService(logger, fileUtils, llmHttpApi, mapper)

	result, err := service.GetProviderTypes()

	if err != nil {
		t.Errorf("GetProviderTypes() error = %v, want nil", err)
	}

	expectedTypes := []string{
		string(settings.ProviderTypeCustom),
		string(settings.ProviderTypeOllama),
	}

	if len(result) != len(expectedTypes) {
		t.Errorf("GetProviderTypes() result length = %d, want %d", len(result), len(expectedTypes))
	}

	for i, expectedType := range expectedTypes {
		if result[i] != expectedType {
			t.Errorf("GetProviderTypes() result[%d] = %s, want %s", i, result[i], expectedType)
		}
	}

	// Verify debug logs
	if len(logger.DebugMessages) != 2 {
		t.Errorf("Expected 2 debug logs, got %d: %v", len(logger.DebugMessages), logger.DebugMessages)
	}
}

// Test GetCurrentSettings
func TestGetCurrentSettings(t *testing.T) {
	tests := []struct {
		name               string
		loadSettingsResult *settings.Settings
		loadSettingsError  error
		expectError        bool
		expectedErrorMsg   string
		expectedInfoLogs   int
		expectedDebugLogs  int
		expectedErrorLogs  int
	}{
		{
			name:               "Successful settings load",
			loadSettingsResult: &constant.DefaultSetting,
			loadSettingsError:  nil,
			expectError:        false,
			expectedInfoLogs:   2, // Start and success logs
			expectedDebugLogs:  0,
			expectedErrorLogs:  0,
		},
		{
			name:               "Settings load error",
			loadSettingsResult: nil,
			loadSettingsError:  errors.New("file not found"),
			expectError:        true,
			expectedErrorMsg:   "failed to load application settings",
			expectedInfoLogs:   1, // Only start log
			expectedDebugLogs:  0,
			expectedErrorLogs:  1,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			logger := &MockLogger{}
			fileUtils := &MockFileUtilsService{
				loadSettingsResult: tt.loadSettingsResult,
				loadSettingsError:  tt.loadSettingsError,
			}
			llmHttpApi := &MockLlmHttpApi{}
			mapper := &MockMapperUtils{}

			service := NewSettingsService(logger, fileUtils, llmHttpApi, mapper)

			result, err := service.GetCurrentSettings()

			// Verify error conditions
			if (err != nil) != tt.expectError {
				t.Errorf("GetCurrentSettings() error = %v, expectError %v", err, tt.expectError)
				return
			}

			if tt.expectError {
				if tt.expectedErrorMsg != "" && !containsErrorMessage(err.Error(), tt.expectedErrorMsg) {
					t.Errorf("GetCurrentSettings() error = %v, expected to contain %s", err, tt.expectedErrorMsg)
				}

				// Verify error logging occurred
				if len(logger.ErrorMessages) != tt.expectedErrorLogs {
					t.Errorf("Expected %d error logs, got %d: %v", tt.expectedErrorLogs, len(logger.ErrorMessages), logger.ErrorMessages)
				}
			} else {
				// Verify successful result
				if result != tt.loadSettingsResult {
					t.Errorf("GetCurrentSettings() result = %v, want %v", result, tt.loadSettingsResult)
				}

				// Verify info logging occurred
				if len(logger.InfoMessages) != tt.expectedInfoLogs {
					t.Errorf("Expected %d info logs, got %d: %v", tt.expectedInfoLogs, len(logger.InfoMessages), logger.InfoMessages)
				}
			}

			// Verify debug logging occurred
			if len(logger.DebugMessages) != tt.expectedDebugLogs {
				t.Errorf("Expected %d debug logs, got %d: %v", tt.expectedDebugLogs, len(logger.DebugMessages), logger.DebugMessages)
			}
		})
	}
}

// Test GetDefaultSettings
func TestGetDefaultSettings(t *testing.T) {
	logger := &MockLogger{}
	fileUtils := &MockFileUtilsService{}
	llmHttpApi := &MockLlmHttpApi{}
	mapper := &MockMapperUtils{}

	service := NewSettingsService(logger, fileUtils, llmHttpApi, mapper)

	result, err := service.GetDefaultSettings()

	if err != nil {
		t.Errorf("GetDefaultSettings() error = %v, want nil", err)
	}

	if result == nil {
		t.Errorf("GetDefaultSettings() result = nil, want non-nil")
	}

	// Verify it returns the default settings
	expected := constant.DefaultSetting
	if result.CurrentProviderConfig.ProviderName != expected.CurrentProviderConfig.ProviderName {
		t.Errorf("GetDefaultSettings() current provider = %s, want %s", result.CurrentProviderConfig.ProviderName, expected.CurrentProviderConfig.ProviderName)
	}

	// Verify debug logs
	if len(logger.DebugMessages) != 2 {
		t.Errorf("Expected 2 debug logs, got %d: %v", len(logger.DebugMessages), logger.DebugMessages)
	}
}

// Test SaveSettings
func TestSaveSettings(t *testing.T) {
	tests := []struct {
		name              string
		settings          *settings.Settings
		saveSettingsError error
		expectError       bool
		expectedErrorMsg  string
		expectedInfoLogs  int
		expectedDebugLogs int
		expectedErrorLogs int
	}{
		{
			name:              "Successful settings save",
			settings:          &constant.DefaultSetting,
			saveSettingsError: nil,
			expectError:       false,
			expectedInfoLogs:  2,  // Start and success logs
			expectedDebugLogs: 23, // Validation (many steps) and save debug logs
			expectedErrorLogs: 0,
		},
		{
			name:              "Nil settings",
			settings:          nil,
			saveSettingsError: nil,
			expectError:       true,
			expectedErrorMsg:  "settings cannot be nil",
			expectedInfoLogs:  1, // Only start log
			expectedDebugLogs: 0,
			expectedErrorLogs: 1,
		},
		{
			name:              "Settings save error",
			settings:          &constant.DefaultSetting,
			saveSettingsError: errors.New("permission denied"),
			expectError:       true,
			expectedErrorMsg:  "failed to persist settings",
			expectedInfoLogs:  1, // Only start log
			expectedDebugLogs: 2, // Validation and save debug logs
			expectedErrorLogs: 1, // Error log
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			logger := &MockLogger{}
			fileUtils := &MockFileUtilsService{
				saveSettingsError: tt.saveSettingsError,
			}
			llmHttpApi := &MockLlmHttpApi{}
			mapper := &MockMapperUtils{}

			service := NewSettingsService(logger, fileUtils, llmHttpApi, mapper)

			result, err := service.SaveSettings(tt.settings)

			// Verify error conditions
			if (err != nil) != tt.expectError {
				t.Errorf("SaveSettings() error = %v, expectError %v", err, tt.expectError)
				return
			}

			if tt.expectError {
				if tt.expectedErrorMsg != "" && !containsErrorMessage(err.Error(), tt.expectedErrorMsg) {
					t.Errorf("SaveSettings() error = %v, expected to contain %s", err, tt.expectedErrorMsg)
				}

				// Verify error logging occurred
				if len(logger.ErrorMessages) != tt.expectedErrorLogs {
					t.Errorf("Expected %d error logs, got %d: %v", tt.expectedErrorLogs, len(logger.ErrorMessages), logger.ErrorMessages)
				}
			} else {
				// Verify successful result
				if result != tt.settings {
					t.Errorf("SaveSettings() result = %v, want %v", result, tt.settings)
				}

				// Verify info logging occurred
				if len(logger.InfoMessages) != tt.expectedInfoLogs {
					t.Errorf("Expected %d info logs, got %d: %v", tt.expectedInfoLogs, len(logger.InfoMessages), logger.InfoMessages)
				}

				// Verify debug logging occurred
				if len(logger.DebugMessages) != tt.expectedDebugLogs {
					t.Errorf("Expected %d debug logs, got %d: %v", tt.expectedDebugLogs, len(logger.DebugMessages), logger.DebugMessages)
				}
			}
		})
	}
}

// Test ValidateProvider
func TestValidateProvider(t *testing.T) {
	tests := []struct {
		name              string
		config            *settings.ProviderConfig
		expectValid       bool
		expectError       bool
		expectedErrorMsg  string
		expectedDebugLogs int
		expectedErrorLogs int
	}{
		{
			name: "Valid provider",
			config: &settings.ProviderConfig{
				ProviderName:       "Test Provider",
				ProviderType:       settings.ProviderTypeCustom,
				BaseUrl:            "http://localhost:11434",
				ModelsEndpoint:     "/v1/models",
				CompletionEndpoint: "/v1/chat/completions",
				Headers:            map[string]string{},
			},
			expectValid:       true,
			expectError:       false,
			expectedDebugLogs: 2, // Start and success debug logs
			expectedErrorLogs: 0,
		},
		{
			name:              "Nil config",
			config:            nil,
			expectValid:       false,
			expectError:       true,
			expectedErrorMsg:  "provider config is nil",
			expectedDebugLogs: 0,
			expectedErrorLogs: 1, // Error log
		},
		{
			name: "Empty provider name",
			config: &settings.ProviderConfig{
				ProviderName:       "",
				ProviderType:       settings.ProviderTypeCustom,
				BaseUrl:            "http://localhost:11434",
				ModelsEndpoint:     "/v1/models",
				CompletionEndpoint: "/v1/chat/completions",
			},
			expectValid:       false,
			expectError:       true,
			expectedErrorMsg:  "provider name cannot be blank",
			expectedDebugLogs: 0,
			expectedErrorLogs: 1, // Error log
		},
		{
			name: "Empty provider type",
			config: &settings.ProviderConfig{
				ProviderName:       "Test Provider",
				ProviderType:       "",
				BaseUrl:            "http://localhost:11434",
				ModelsEndpoint:     "/v1/models",
				CompletionEndpoint: "/v1/chat/completions",
			},
			expectValid:       false,
			expectError:       true,
			expectedErrorMsg:  "provider type cannot be blank",
			expectedDebugLogs: 0,
			expectedErrorLogs: 1, // Error log
		},
		{
			name: "Empty base URL",
			config: &settings.ProviderConfig{
				ProviderName:       "Test Provider",
				ProviderType:       settings.ProviderTypeCustom,
				BaseUrl:            "",
				ModelsEndpoint:     "/v1/models",
				CompletionEndpoint: "/v1/chat/completions",
			},
			expectValid:       false,
			expectError:       true,
			expectedErrorMsg:  "baseUrl cannot be blank",
			expectedDebugLogs: 0,
			expectedErrorLogs: 1, // Error log
		},
		{
			name: "Invalid base URL (no protocol)",
			config: &settings.ProviderConfig{
				ProviderName:       "Test Provider",
				ProviderType:       settings.ProviderTypeCustom,
				BaseUrl:            "localhost:11434",
				ModelsEndpoint:     "/v1/models",
				CompletionEndpoint: "/v1/chat/completions",
			},
			expectValid:       false,
			expectError:       true,
			expectedErrorMsg:  "baseUrl must start with http:// or https://",
			expectedDebugLogs: 0,
			expectedErrorLogs: 1, // Error log
		},
		{
			name: "Empty models endpoint",
			config: &settings.ProviderConfig{
				ProviderName:       "Test Provider",
				ProviderType:       settings.ProviderTypeCustom,
				BaseUrl:            "http://localhost:11434",
				ModelsEndpoint:     "",
				CompletionEndpoint: "/v1/chat/completions",
			},
			expectValid:       false,
			expectError:       true,
			expectedErrorMsg:  "models endpoint cannot be blank",
			expectedDebugLogs: 0,
			expectedErrorLogs: 1, // Error log
		},
		{
			name: "Invalid models endpoint (no leading slash)",
			config: &settings.ProviderConfig{
				ProviderName:       "Test Provider",
				ProviderType:       settings.ProviderTypeCustom,
				BaseUrl:            "http://localhost:11434",
				ModelsEndpoint:     "v1/models",
				CompletionEndpoint: "/v1/chat/completions",
			},
			expectValid:       false,
			expectError:       true,
			expectedErrorMsg:  "models endpoint must start with /",
			expectedDebugLogs: 0,
			expectedErrorLogs: 1, // Error log
		},
		{
			name: "Empty completion endpoint",
			config: &settings.ProviderConfig{
				ProviderName:       "Test Provider",
				ProviderType:       settings.ProviderTypeCustom,
				BaseUrl:            "http://localhost:11434",
				ModelsEndpoint:     "/v1/models",
				CompletionEndpoint: "",
			},
			expectValid:       false,
			expectError:       true,
			expectedErrorMsg:  "completion endpoint cannot be blank",
			expectedDebugLogs: 0,
			expectedErrorLogs: 1, // Error log
		},
		{
			name: "Invalid completion endpoint (no leading slash)",
			config: &settings.ProviderConfig{
				ProviderName:       "Test Provider",
				ProviderType:       settings.ProviderTypeCustom,
				BaseUrl:            "http://localhost:11434",
				ModelsEndpoint:     "/v1/models",
				CompletionEndpoint: "v1/chat/completions",
			},
			expectValid:       false,
			expectError:       true,
			expectedErrorMsg:  "completion endpoint must start with /",
			expectedDebugLogs: 0,
			expectedErrorLogs: 1, // Error log
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			logger := &MockLogger{}
			fileUtils := &MockFileUtilsService{}
			llmHttpApi := &MockLlmHttpApi{}
			mapper := &MockMapperUtils{}

			service := NewSettingsService(logger, fileUtils, llmHttpApi, mapper)

			result, err := service.ValidateProvider(tt.config)

			// Verify error conditions
			if (err != nil) != tt.expectError {
				t.Errorf("ValidateProvider() error = %v, expectError %v", err, tt.expectError)
				return
			}

			if tt.expectError {
				if tt.expectedErrorMsg != "" && !containsErrorMessage(err.Error(), tt.expectedErrorMsg) {
					t.Errorf("ValidateProvider() error = %v, expected to contain %s", err, tt.expectedErrorMsg)
				}

				// Verify error logging occurred
				if len(logger.ErrorMessages) != tt.expectedErrorLogs {
					t.Errorf("Expected %d error logs, got %d: %v", tt.expectedErrorLogs, len(logger.ErrorMessages), logger.ErrorMessages)
				}
			} else {
				// Verify successful result
				if result != tt.expectValid {
					t.Errorf("ValidateProvider() result = %v, want %v", result, tt.expectValid)
				}

				// Verify debug logging occurred
				if len(logger.DebugMessages) != tt.expectedDebugLogs {
					t.Errorf("Expected %d debug logs, got %d: %v", tt.expectedDebugLogs, len(logger.DebugMessages), logger.DebugMessages)
				}
			}
		})
	}
}

// Test CreateNewProvider
func TestCreateNewProvider(t *testing.T) {
	tests := []struct {
		name               string
		config             *settings.ProviderConfig
		loadSettingsResult *settings.Settings
		loadSettingsError  error
		saveSettingsError  error
		expectError        bool
		expectedErrorMsg   string
		expectedInfoLogs   int
		expectedDebugLogs  int
		expectedErrorLogs  int
	}{
		{
			name: "Successful provider creation",
			config: &settings.ProviderConfig{
				ProviderName:       "New Provider",
				ProviderType:       settings.ProviderTypeCustom,
				BaseUrl:            "http://localhost:8080",
				ModelsEndpoint:     "/v1/models",
				CompletionEndpoint: "/v1/chat/completions",
			},
			loadSettingsResult: &settings.Settings{
				AvailableProviderConfigs: []settings.ProviderConfig{
					constant.OllamaConfig,
				},
				CurrentProviderConfig: constant.OllamaConfig,
				ModelConfig: settings.LlmModelConfig{
					ModelName:            "llama2",
					IsTemperatureEnabled: true,
					Temperature:          0.5,
				},
				LanguageConfig: settings.LanguageConfig{
					Languages:             []string{"English", "French"},
					DefaultInputLanguage:  "English",
					DefaultOutputLanguage: "French",
				},
			},
			loadSettingsError: nil,
			saveSettingsError: nil,
			expectError:       false,
			expectedInfoLogs:  6,  // Multiple info logs from nested service calls
			expectedDebugLogs: 27, // Many debug logs from comprehensive validation
			expectedErrorLogs: 0,
		},

		{
			name: "Duplicate provider name",
			config: &settings.ProviderConfig{
				ProviderName:       "Ollama",
				ProviderType:       settings.ProviderTypeCustom,
				BaseUrl:            "http://localhost:8080",
				ModelsEndpoint:     "/v1/models",
				CompletionEndpoint: "/v1/chat/completions",
			},
			loadSettingsResult: &constant.DefaultSetting,
			loadSettingsError:  nil,
			saveSettingsError:  nil,
			expectError:        true,
			expectedErrorMsg:   "provider with name 'Ollama' already exists",
			expectedInfoLogs:   1, // Only start log
			expectedDebugLogs:  3, // Validation, load, check debug logs
			expectedErrorLogs:  1, // Error log
		},
		{
			name: "Invalid provider config",
			config: &settings.ProviderConfig{
				ProviderName:       "New Provider",
				ProviderType:       settings.ProviderTypeCustom,
				BaseUrl:            "", // Invalid
				ModelsEndpoint:     "/v1/models",
				CompletionEndpoint: "/v1/chat/completions",
			},
			loadSettingsResult: &constant.DefaultSetting,
			loadSettingsError:  nil,
			saveSettingsError:  nil,
			expectError:        true,
			expectedErrorMsg:   "baseUrl cannot be blank",
			expectedInfoLogs:   1, // Only start log
			expectedDebugLogs:  2, // Validation and load debug logs
			expectedErrorLogs:  2, // Error log
		},
		{
			name: "Settings load error",
			config: &settings.ProviderConfig{
				ProviderName:       "New Provider",
				ProviderType:       settings.ProviderTypeCustom,
				BaseUrl:            "http://localhost:8080",
				ModelsEndpoint:     "/v1/models",
				CompletionEndpoint: "/v1/chat/completions",
			},
			loadSettingsResult: nil,
			loadSettingsError:  errors.New("file not found"),
			saveSettingsError:  nil,
			expectError:        true,
			expectedErrorMsg:   "failed to load settings",
			expectedInfoLogs:   1, // Only start log
			expectedDebugLogs:  2, // Validation and load debug logs
			expectedErrorLogs:  2, // Error log
		},
		{
			name: "Settings save error",
			config: &settings.ProviderConfig{
				ProviderName:       "New Provider",
				ProviderType:       settings.ProviderTypeCustom,
				BaseUrl:            "http://localhost:8080",
				ModelsEndpoint:     "/v1/models",
				CompletionEndpoint: "/v1/chat/completions",
			},
			loadSettingsResult: &constant.DefaultSetting,
			loadSettingsError:  nil,
			saveSettingsError:  errors.New("permission denied"),
			expectError:        true,
			expectedErrorMsg:   "failed to persist settings",
			expectedInfoLogs:   1, // Only start log
			expectedDebugLogs:  5, // Validation, load, check, add, save debug logs
			expectedErrorLogs:  2, // Error log
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			logger := &MockLogger{}
			fileUtils := &MockFileUtilsService{
				loadSettingsResult: tt.loadSettingsResult,
				loadSettingsError:  tt.loadSettingsError,
				saveSettingsError:  tt.saveSettingsError,
			}
			llmHttpApi := &MockLlmHttpApi{}
			mapper := &MockMapperUtils{}

			service := NewSettingsService(logger, fileUtils, llmHttpApi, mapper)

			result, err := service.CreateNewProvider(tt.config)

			// Verify error conditions
			if (err != nil) != tt.expectError {
				t.Errorf("CreateNewProvider() error = %v, expectError %v", err, tt.expectError)
				return
			}

			if tt.expectError {
				if tt.expectedErrorMsg != "" && !containsErrorMessage(err.Error(), tt.expectedErrorMsg) {
					t.Errorf("CreateNewProvider() error = %v, expected to contain %s", err, tt.expectedErrorMsg)
				}

				// Verify error logging occurred
				if len(logger.ErrorMessages) != tt.expectedErrorLogs {
					t.Errorf("Expected %d error logs, got %d: %v", tt.expectedErrorLogs, len(logger.ErrorMessages), logger.ErrorMessages)
				}
			} else {
				// Verify successful result
				if result != tt.config {
					t.Errorf("CreateNewProvider() result = %v, want %v", result, tt.config)
				}

				// Verify info logging occurred
				if len(logger.InfoMessages) != tt.expectedInfoLogs {
					t.Errorf("Expected %d info logs, got %d: %v", tt.expectedInfoLogs, len(logger.InfoMessages), logger.InfoMessages)
				}

				// Verify debug logging occurred
				if len(logger.DebugMessages) != tt.expectedDebugLogs {
					t.Errorf("Expected %d debug logs, got %d: %v", tt.expectedDebugLogs, len(logger.DebugMessages), logger.DebugMessages)
				}
			}
		})
	}
}

// Test UpdateProvider
func TestUpdateProvider(t *testing.T) {
	tests := []struct {
		name               string
		config             *settings.ProviderConfig
		loadSettingsResult *settings.Settings
		loadSettingsError  error
		saveSettingsError  error
		expectError        bool
		expectedErrorMsg   string
		expectedInfoLogs   int
		expectedDebugLogs  int
		expectedErrorLogs  int
	}{
		{
			name: "Successful provider update",
			config: &settings.ProviderConfig{
				ProviderName:       "Ollama",
				ProviderType:       settings.ProviderTypeOllama,
				BaseUrl:            "http://localhost:11434",
				ModelsEndpoint:     "/v1/models",
				CompletionEndpoint: "/v1/chat/completions",
			},
			loadSettingsResult: &constant.DefaultSetting,
			loadSettingsError:  nil,
			saveSettingsError:  nil,
			expectError:        false,
			expectedInfoLogs:   6,  // Start, load settings, save settings, and success logs
			expectedDebugLogs:  33, // Validation, load, search, save (with nested validation) debug logs
			expectedErrorLogs:  0,
		},
		{
			name:               "Nil config",
			config:             nil,
			loadSettingsResult: &constant.DefaultSetting,
			loadSettingsError:  nil,
			saveSettingsError:  nil,
			expectError:        true,
			expectedErrorMsg:   "provider config cannot be nil",
			expectedInfoLogs:   1, // Only start log
			expectedDebugLogs:  0,
			expectedErrorLogs:  1, // Error log
		},
		{
			name: "Provider not found",
			config: &settings.ProviderConfig{
				ProviderName:       "NonExistent",
				ProviderType:       settings.ProviderTypeCustom,
				BaseUrl:            "http://localhost:8080",
				ModelsEndpoint:     "/v1/models",
				CompletionEndpoint: "/v1/chat/completions",
			},
			loadSettingsResult: &constant.DefaultSetting,
			loadSettingsError:  nil,
			saveSettingsError:  nil,
			expectError:        true,
			expectedErrorMsg:   "provider with name 'NonExistent' not found",
			expectedInfoLogs:   1, // Only start log
			expectedDebugLogs:  3, // Validation, load, search debug logs
			expectedErrorLogs:  1, // Error log
		},
		{
			name: "Invalid provider config",
			config: &settings.ProviderConfig{
				ProviderName:       "Ollama",
				ProviderType:       settings.ProviderTypeOllama,
				BaseUrl:            "", // Invalid
				ModelsEndpoint:     "/v1/models",
				CompletionEndpoint: "/v1/chat/completions",
			},
			loadSettingsResult: &constant.DefaultSetting,
			loadSettingsError:  nil,
			saveSettingsError:  nil,
			expectError:        true,
			expectedErrorMsg:   "baseUrl cannot be blank",
			expectedInfoLogs:   1, // Only start log
			expectedDebugLogs:  2, // Validation and load debug logs
			expectedErrorLogs:  2, // Error log
		},
		{
			name: "Settings load error",
			config: &settings.ProviderConfig{
				ProviderName:       "Ollama",
				ProviderType:       settings.ProviderTypeOllama,
				BaseUrl:            "http://localhost:11434",
				ModelsEndpoint:     "/v1/models",
				CompletionEndpoint: "/v1/chat/completions",
			},
			loadSettingsResult: nil,
			loadSettingsError:  errors.New("file not found"),
			saveSettingsError:  nil,
			expectError:        true,
			expectedErrorMsg:   "failed to load settings",
			expectedInfoLogs:   1, // Only start log
			expectedDebugLogs:  2, // Validation and load debug logs
			expectedErrorLogs:  2, // Error log
		},
		{
			name: "Settings save error",
			config: &settings.ProviderConfig{
				ProviderName:       "Ollama",
				ProviderType:       settings.ProviderTypeOllama,
				BaseUrl:            "http://localhost:11434",
				ModelsEndpoint:     "/v1/models",
				CompletionEndpoint: "/v1/chat/completions",
			},
			loadSettingsResult: &constant.DefaultSetting,
			loadSettingsError:  nil,
			saveSettingsError:  errors.New("permission denied"),
			expectError:        true,
			expectedErrorMsg:   "failed to persist settings",
			expectedInfoLogs:   1, // Only start log
			expectedDebugLogs:  4, // Validation, load, search, save debug logs
			expectedErrorLogs:  2, // Error log
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			logger := &MockLogger{}
			fileUtils := &MockFileUtilsService{
				loadSettingsResult: tt.loadSettingsResult,
				loadSettingsError:  tt.loadSettingsError,
				saveSettingsError:  tt.saveSettingsError,
			}
			llmHttpApi := &MockLlmHttpApi{}
			mapper := &MockMapperUtils{}

			service := NewSettingsService(logger, fileUtils, llmHttpApi, mapper)

			result, err := service.UpdateProvider(tt.config)

			// Verify error conditions
			if (err != nil) != tt.expectError {
				t.Errorf("UpdateProvider() error = %v, expectError %v", err, tt.expectError)
				return
			}

			if tt.expectError {
				if tt.expectedErrorMsg != "" && !containsErrorMessage(err.Error(), tt.expectedErrorMsg) {
					t.Errorf("UpdateProvider() error = %v, expected to contain %s", err, tt.expectedErrorMsg)
				}

				// Verify error logging occurred
				if len(logger.ErrorMessages) != tt.expectedErrorLogs {
					t.Errorf("Expected %d error logs, got %d: %v", tt.expectedErrorLogs, len(logger.ErrorMessages), logger.ErrorMessages)
				}
			} else {
				// Verify successful result
				if result != tt.config {
					t.Errorf("UpdateProvider() result = %v, want %v", result, tt.config)
				}

				// Verify info logging occurred
				if len(logger.InfoMessages) != tt.expectedInfoLogs {
					t.Errorf("Expected %d info logs, got %d: %v", tt.expectedInfoLogs, len(logger.InfoMessages), logger.InfoMessages)
				}

				// Verify debug logging occurred
				if len(logger.DebugMessages) != tt.expectedDebugLogs {
					t.Errorf("Expected %d debug logs, got %d: %v", tt.expectedDebugLogs, len(logger.DebugMessages), logger.DebugMessages)
				}
			}
		})
	}
}

// Test DeleteProvider
func TestDeleteProvider(t *testing.T) {
	tests := []struct {
		name               string
		config             *settings.ProviderConfig
		loadSettingsResult *settings.Settings
		loadSettingsError  error
		saveSettingsError  error
		expectError        bool
		expectedErrorMsg   string
		expectedInfoLogs   int
		expectedDebugLogs  int
		expectedErrorLogs  int
	}{
		{
			name: "Successful provider deletion",
			config: &settings.ProviderConfig{
				ProviderName: "LM Studio",
			},
			loadSettingsResult: &settings.Settings{
				AvailableProviderConfigs: []settings.ProviderConfig{
					constant.OllamaConfig,
					constant.LMStudioConfig,
				},
				CurrentProviderConfig: constant.OllamaConfig,
				LanguageConfig: settings.LanguageConfig{
					Languages:             []string{"Lang1", "Lang2"},
					DefaultInputLanguage:  "Lang1",
					DefaultOutputLanguage: "Lang2",
				},
			},
			loadSettingsError: nil,
			saveSettingsError: nil,
			expectError:       false,
			expectedInfoLogs:  6,  // Start and success logs
			expectedDebugLogs: 20, // Load, check, search, remove, save debug logs
			expectedErrorLogs: 0,
		},
		{
			name:               "Nil config",
			config:             nil,
			loadSettingsResult: &constant.DefaultSetting,
			loadSettingsError:  nil,
			saveSettingsError:  nil,
			expectError:        true,
			expectedErrorMsg:   "provider config cannot be nil",
			expectedInfoLogs:   1, // Only start log
			expectedDebugLogs:  0,
			expectedErrorLogs:  1, // Error log
		},
		{
			name: "Empty provider name",
			config: &settings.ProviderConfig{
				ProviderName: "",
			},
			loadSettingsResult: &constant.DefaultSetting,
			loadSettingsError:  nil,
			saveSettingsError:  nil,
			expectError:        true,
			expectedErrorMsg:   "provider name cannot be empty",
			expectedInfoLogs:   1, // Only start log
			expectedDebugLogs:  0,
			expectedErrorLogs:  1, // Error log
		},
		{
			name: "Delete current active provider",
			config: &settings.ProviderConfig{
				ProviderName: "Ollama",
			},
			loadSettingsResult: &constant.DefaultSetting,
			loadSettingsError:  nil,
			saveSettingsError:  nil,
			expectError:        true,
			expectedErrorMsg:   "cannot delete currently active provider",
			expectedInfoLogs:   1, // Only start log
			expectedDebugLogs:  2, // Load and check debug logs
			expectedErrorLogs:  1, // Error log
		},
		{
			name: "Provider not found",
			config: &settings.ProviderConfig{
				ProviderName: "NonExistent",
			},
			loadSettingsResult: &constant.DefaultSetting,
			loadSettingsError:  nil,
			saveSettingsError:  nil,
			expectError:        true,
			expectedErrorMsg:   "provider with name 'NonExistent' not found",
			expectedInfoLogs:   1, // Only start log
			expectedDebugLogs:  3, // Load, check, search debug logs
			expectedErrorLogs:  1, // Error log
		},
		{
			name: "Settings load error",
			config: &settings.ProviderConfig{
				ProviderName: "LM Studio",
			},
			loadSettingsResult: nil,
			loadSettingsError:  errors.New("file not found"),
			saveSettingsError:  nil,
			expectError:        true,
			expectedErrorMsg:   "failed to load settings",
			expectedInfoLogs:   1, // Only start log
			expectedDebugLogs:  2, // Load and check debug logs
			expectedErrorLogs:  2, // Error log
		},
		{
			name: "Settings save error",
			config: &settings.ProviderConfig{
				ProviderName: "LM Studio",
			},
			loadSettingsResult: &settings.Settings{
				AvailableProviderConfigs: []settings.ProviderConfig{
					constant.OllamaConfig,
					constant.LMStudioConfig,
				},
				CurrentProviderConfig: constant.OllamaConfig,
			},
			loadSettingsError: nil,
			saveSettingsError: errors.New("permission denied"),
			expectError:       true,
			expectedErrorMsg:  "failed to persist settings",
			expectedInfoLogs:  1, // Only start log
			expectedDebugLogs: 5, // Load, check, search, remove, save debug logs
			expectedErrorLogs: 3, // Error log
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			logger := &MockLogger{}
			fileUtils := &MockFileUtilsService{
				loadSettingsResult: tt.loadSettingsResult,
				loadSettingsError:  tt.loadSettingsError,
				saveSettingsError:  tt.saveSettingsError,
			}
			llmHttpApi := &MockLlmHttpApi{}
			mapper := &MockMapperUtils{}

			service := NewSettingsService(logger, fileUtils, llmHttpApi, mapper)

			result, err := service.DeleteProvider(tt.config)

			// Verify error conditions
			if (err != nil) != tt.expectError {
				t.Errorf("DeleteProvider() error = %v, expectError %v", err, tt.expectError)
				return
			}

			if tt.expectError {
				if tt.expectedErrorMsg != "" && !containsErrorMessage(err.Error(), tt.expectedErrorMsg) {
					t.Errorf("DeleteProvider() error = %v, expected to contain %s", err, tt.expectedErrorMsg)
				}

				// Verify error logging occurred
				if len(logger.ErrorMessages) != tt.expectedErrorLogs {
					t.Errorf("Expected %d error logs, got %d: %v", tt.expectedErrorLogs, len(logger.ErrorMessages), logger.ErrorMessages)
				}
			} else {
				// Verify successful result
				if result != true {
					t.Errorf("DeleteProvider() result = %v, want true", result)
				}

				// Verify info logging occurred
				if len(logger.InfoMessages) != tt.expectedInfoLogs {
					t.Errorf("Expected %d info logs, got %d: %v", tt.expectedInfoLogs, len(logger.InfoMessages), logger.InfoMessages)
				}

				// Verify debug logging occurred
				if len(logger.DebugMessages) != tt.expectedDebugLogs {
					t.Errorf("Expected %d debug logs, got %d: %v", tt.expectedDebugLogs, len(logger.DebugMessages), logger.DebugMessages)
				}
			}
		})
	}
}

// Test SelectProvider
func TestSelectProvider(t *testing.T) {
	tests := []struct {
		name               string
		config             *settings.ProviderConfig
		loadSettingsResult *settings.Settings
		loadSettingsError  error
		saveSettingsError  error
		expectError        bool
		expectedErrorMsg   string
		expectedInfoLogs   int
		expectedDebugLogs  int
		expectedErrorLogs  int
	}{
		{
			name: "Successful provider selection",
			config: &settings.ProviderConfig{
				ProviderName:       "LM Studio",
				ProviderType:       settings.ProviderTypeCustom,
				BaseUrl:            "http://localhost:1234",
				ModelsEndpoint:     "/v1/models",
				CompletionEndpoint: "/v1/chat/completions",
			},
			loadSettingsResult: &constant.DefaultSetting,
			loadSettingsError:  nil,
			saveSettingsError:  nil,
			expectError:        false,
			expectedInfoLogs:   6,  // Start and success logs
			expectedDebugLogs:  33, // Validation, load, search, save debug logs
			expectedErrorLogs:  0,
		},
		{
			name:               "Nil config",
			config:             nil,
			loadSettingsResult: &constant.DefaultSetting,
			loadSettingsError:  nil,
			saveSettingsError:  nil,
			expectError:        true,
			expectedErrorMsg:   "provider config cannot be nil",
			expectedInfoLogs:   1, // Only start log
			expectedDebugLogs:  0,
			expectedErrorLogs:  1, // Error log
		},
		{
			name: "Provider not found",
			config: &settings.ProviderConfig{
				ProviderName:       "NonExistent",
				ProviderType:       settings.ProviderTypeCustom,
				BaseUrl:            "http://localhost:8080",
				ModelsEndpoint:     "/v1/models",
				CompletionEndpoint: "/v1/chat/completions",
			},
			loadSettingsResult: &constant.DefaultSetting,
			loadSettingsError:  nil,
			saveSettingsError:  nil,
			expectError:        true,
			expectedErrorMsg:   "provider with name 'NonExistent' not found",
			expectedInfoLogs:   1, // Only start log
			expectedDebugLogs:  3, // Validation, load, search debug logs
			expectedErrorLogs:  1, // Error log
		},
		{
			name: "Invalid provider config",
			config: &settings.ProviderConfig{
				ProviderName:       "LM Studio",
				ProviderType:       settings.ProviderTypeCustom,
				BaseUrl:            "", // Invalid
				ModelsEndpoint:     "/v1/models",
				CompletionEndpoint: "/v1/chat/completions",
			},
			loadSettingsResult: &constant.DefaultSetting,
			loadSettingsError:  nil,
			saveSettingsError:  nil,
			expectError:        true,
			expectedErrorMsg:   "baseUrl cannot be blank",
			expectedInfoLogs:   1, // Only start log
			expectedDebugLogs:  2, // Validation and load debug logs
			expectedErrorLogs:  2, // Error log
		},
		{
			name: "Settings load error",
			config: &settings.ProviderConfig{
				ProviderName:       "LM Studio",
				ProviderType:       settings.ProviderTypeCustom,
				BaseUrl:            "http://localhost:1234",
				ModelsEndpoint:     "/v1/models",
				CompletionEndpoint: "/v1/chat/completions",
			},
			loadSettingsResult: nil,
			loadSettingsError:  errors.New("file not found"),
			saveSettingsError:  nil,
			expectError:        true,
			expectedErrorMsg:   "failed to load settings",
			expectedInfoLogs:   1, // Only start log
			expectedDebugLogs:  2, // Validation and load debug logs
			expectedErrorLogs:  2, // Error log
		},
		{
			name: "Settings save error",
			config: &settings.ProviderConfig{
				ProviderName:       "LM Studio",
				ProviderType:       settings.ProviderTypeCustom,
				BaseUrl:            "http://localhost:1234",
				ModelsEndpoint:     "/v1/models",
				CompletionEndpoint: "/v1/chat/completions",
			},
			loadSettingsResult: &constant.DefaultSetting,
			loadSettingsError:  nil,
			saveSettingsError:  errors.New("permission denied"),
			expectError:        true,
			expectedErrorMsg:   "failed to persist settings",
			expectedInfoLogs:   1, // Only start log
			expectedDebugLogs:  4, // Validation, load, search, save debug logs
			expectedErrorLogs:  2, // Error log
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			logger := &MockLogger{}
			fileUtils := &MockFileUtilsService{
				loadSettingsResult: tt.loadSettingsResult,
				loadSettingsError:  tt.loadSettingsError,
				saveSettingsError:  tt.saveSettingsError,
			}
			llmHttpApi := &MockLlmHttpApi{}
			mapper := &MockMapperUtils{}

			service := NewSettingsService(logger, fileUtils, llmHttpApi, mapper)

			result, err := service.SelectProvider(tt.config)

			// Verify error conditions
			if (err != nil) != tt.expectError {
				t.Errorf("SelectProvider() error = %v, expectError %v", err, tt.expectError)
				return
			}

			if tt.expectError {
				if tt.expectedErrorMsg != "" && !containsErrorMessage(err.Error(), tt.expectedErrorMsg) {
					t.Errorf("SelectProvider() error = %v, expected to contain %s", err, tt.expectedErrorMsg)
				}

				// Verify error logging occurred
				if len(logger.ErrorMessages) != tt.expectedErrorLogs {
					t.Errorf("Expected %d error logs, got %d: %v", tt.expectedErrorLogs, len(logger.ErrorMessages), logger.ErrorMessages)
				}
			} else {
				// Verify successful result
				if result != tt.config {
					t.Errorf("SelectProvider() result = %v, want %v", result, tt.config)
				}

				// Verify info logging occurred
				if len(logger.InfoMessages) != tt.expectedInfoLogs {
					t.Errorf("Expected %d info logs, got %d: %v", tt.expectedInfoLogs, len(logger.InfoMessages), logger.InfoMessages)
				}

				// Verify debug logging occurred
				if len(logger.DebugMessages) != tt.expectedDebugLogs {
					t.Errorf("Expected %d debug logs, got %d: %v", tt.expectedDebugLogs, len(logger.DebugMessages), logger.DebugMessages)
				}
			}
		})
	}
}

// Test GetModelsList
func TestGetModelsList(t *testing.T) {
	tests := []struct {
		name              string
		config            *settings.ProviderConfig
		modelsListResult  []llm.LlmModel
		modelsListError   error
		modelNamesResult  []string
		expectError       bool
		expectedErrorMsg  string
		expectedInfoLogs  int
		expectedDebugLogs int
		expectedErrorLogs int
	}{
		{
			name: "Successful models list retrieval",
			config: &settings.ProviderConfig{
				ProviderName:       "Ollama",
				ProviderType:       settings.ProviderTypeOllama,
				BaseUrl:            "http://localhost:11434",
				ModelsEndpoint:     "/v1/models",
				CompletionEndpoint: "/v1/chat/completions",
			},
			modelsListResult: []llm.LlmModel{
				{ID: "llama2", Name: stringPtr("llama2")},
				{ID: "mistral", Name: stringPtr("mistral")},
			},
			modelNamesResult:  []string{"llama2", "mistral"},
			modelsListError:   nil,
			expectError:       false,
			expectedInfoLogs:  2, // Start and success logs
			expectedDebugLogs: 3, // Validation and models debug logs
			expectedErrorLogs: 0,
		},
		{
			name:              "Nil config",
			config:            nil,
			modelsListResult:  []llm.LlmModel{},
			modelNamesResult:  []string{},
			modelsListError:   nil,
			expectError:       true,
			expectedErrorMsg:  "provider config cannot be nil",
			expectedInfoLogs:  1, // Only start log
			expectedDebugLogs: 0,
			expectedErrorLogs: 1, // Error log
		},
		{
			name: "Invalid provider config",
			config: &settings.ProviderConfig{
				ProviderName:       "Ollama",
				ProviderType:       settings.ProviderTypeOllama,
				BaseUrl:            "", // Invalid
				ModelsEndpoint:     "/v1/models",
				CompletionEndpoint: "/v1/chat/completions",
			},
			modelsListResult:  []llm.LlmModel{},
			modelNamesResult:  []string{},
			modelsListError:   nil,
			expectError:       true,
			expectedErrorMsg:  "baseUrl cannot be blank",
			expectedInfoLogs:  1, // Only start log
			expectedDebugLogs: 1, // Validation debug log
			expectedErrorLogs: 2, // Error log
		},
		{
			name: "Models list request error",
			config: &settings.ProviderConfig{
				ProviderName:       "Ollama",
				ProviderType:       settings.ProviderTypeOllama,
				BaseUrl:            "http://localhost:11434",
				ModelsEndpoint:     "/v1/models",
				CompletionEndpoint: "/v1/chat/completions",
			},
			modelsListResult:  []llm.LlmModel{},
			modelNamesResult:  []string{},
			modelsListError:   errors.New("connection refused"),
			expectError:       true,
			expectedErrorMsg:  "failed to get models list",
			expectedInfoLogs:  1, // Only start log
			expectedDebugLogs: 2, // Validation and models debug logs
			expectedErrorLogs: 1, // Error log
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			logger := &MockLogger{}
			fileUtils := &MockFileUtilsService{}
			llmHttpApi := &MockLlmHttpApi{
				modelsListResult: tt.modelsListResult,
				modelsListError:  tt.modelsListError,
			}
			mapper := &MockMapperUtils{
				modelNamesResult: tt.modelNamesResult,
			}

			service := NewSettingsService(logger, fileUtils, llmHttpApi, mapper)

			result, err := service.GetModelsList(tt.config)

			// Verify error conditions
			if (err != nil) != tt.expectError {
				t.Errorf("GetModelsList() error = %v, expectError %v", err, tt.expectError)
				return
			}

			if tt.expectError {
				if tt.expectedErrorMsg != "" && !containsErrorMessage(err.Error(), tt.expectedErrorMsg) {
					t.Errorf("GetModelsList() error = %v, expected to contain %s", err, tt.expectedErrorMsg)
				}

				// Verify error logging occurred
				if len(logger.ErrorMessages) != tt.expectedErrorLogs {
					t.Errorf("Expected %d error logs, got %d: %v", tt.expectedErrorLogs, len(logger.ErrorMessages), logger.ErrorMessages)
				}
			} else {
				// Verify successful result
				if len(result) != len(tt.modelNamesResult) {
					t.Errorf("GetModelsList() result length = %d, want %d", len(result), len(tt.modelNamesResult))
				}

				for i, expectedName := range tt.modelNamesResult {
					if result[i] != expectedName {
						t.Errorf("GetModelsList() result[%d] = %s, want %s", i, result[i], expectedName)
					}
				}

				// Verify info logging occurred
				if len(logger.InfoMessages) != tt.expectedInfoLogs {
					t.Errorf("Expected %d info logs, got %d: %v", tt.expectedInfoLogs, len(logger.InfoMessages), logger.InfoMessages)
				}

				// Verify debug logging occurred
				if len(logger.DebugMessages) != tt.expectedDebugLogs {
					t.Errorf("Expected %d debug logs, got %d: %v", tt.expectedDebugLogs, len(logger.DebugMessages), logger.DebugMessages)
				}
			}
		})
	}
}

// Test GetSettingsFilePath
func TestGetSettingsFilePath(t *testing.T) {
	logger := &MockLogger{}
	fileUtils := &MockFileUtilsService{
		settingsFilePath: "/path/to/settings.json",
	}
	llmHttpApi := &MockLlmHttpApi{}
	mapper := &MockMapperUtils{}

	service := NewSettingsService(logger, fileUtils, llmHttpApi, mapper)

	result := service.GetSettingsFilePath()

	if result != "/path/to/settings.json" {
		t.Errorf("GetSettingsFilePath() result = %s, want /path/to/settings.json", result)
	}

	// Verify debug logs
	if len(logger.DebugMessages) != 2 {
		t.Errorf("Expected 2 debug logs, got %d: %v", len(logger.DebugMessages), logger.DebugMessages)
	}
}

// Test ValidateSettings
func TestValidateSettings(t *testing.T) {
	tests := []struct {
		name              string
		settings          *settings.Settings
		expectError       bool
		expectedErrorMsg  string
		expectedDebugLogs int
		expectedErrorLogs int
	}{
		{
			name:              "Valid settings",
			settings:          &constant.DefaultSetting,
			expectError:       false,
			expectedDebugLogs: 24, // All validation steps
			expectedErrorLogs: 0,
		},
		{
			name:              "Nil settings",
			settings:          nil,
			expectError:       true,
			expectedErrorMsg:  "settings cannot be nil",
			expectedDebugLogs: 0,
			expectedErrorLogs: 1, // Error log
		},
		{
			name: "Invalid current provider",
			settings: &settings.Settings{
				AvailableProviderConfigs: []settings.ProviderConfig{
					constant.OllamaConfig,
				},
				CurrentProviderConfig: settings.ProviderConfig{
					ProviderName:       "", // Invalid
					ProviderType:       settings.ProviderTypeCustom,
					BaseUrl:            "http://localhost:11434",
					ModelsEndpoint:     "/v1/models",
					CompletionEndpoint: "/v1/chat/completions",
				},
			},
			expectError:       true,
			expectedErrorMsg:  "provider name cannot be blank",
			expectedDebugLogs: 1, // Start debug log
			expectedErrorLogs: 2, // Error log
		},
		{
			name: "Invalid available provider",
			settings: &settings.Settings{
				AvailableProviderConfigs: []settings.ProviderConfig{
					{
						ProviderName:       "Invalid Provider",
						ProviderType:       settings.ProviderTypeCustom,
						BaseUrl:            "", // Invalid
						ModelsEndpoint:     "/v1/models",
						CompletionEndpoint: "/v1/chat/completions",
					},
				},
				CurrentProviderConfig: constant.OllamaConfig,
			},
			expectError:       true,
			expectedErrorMsg:  "baseUrl cannot be blank",
			expectedDebugLogs: 2, // Start and current provider debug logs
			expectedErrorLogs: 2, // Error log
		},
		{
			name: "Invalid temperature",
			settings: &settings.Settings{
				AvailableProviderConfigs: []settings.ProviderConfig{
					constant.OllamaConfig,
				},
				CurrentProviderConfig: constant.OllamaConfig,
				ModelConfig: settings.LlmModelConfig{
					ModelName:            "llama2",
					IsTemperatureEnabled: true,
					Temperature:          2.0, // Invalid (max is 1.0)
				},
			},
			expectError:       true,
			expectedErrorMsg:  "temperature must be between 0 and 1",
			expectedDebugLogs: 5, // Start, current provider, available providers, model config, temperature debug logs
			expectedErrorLogs: 2, // Error log
		},
		{
			name: "No languages configured",
			settings: &settings.Settings{
				AvailableProviderConfigs: []settings.ProviderConfig{
					constant.OllamaConfig,
				},
				CurrentProviderConfig: constant.OllamaConfig,
				LanguageConfig: settings.LanguageConfig{
					Languages:             []string{}, // Invalid
					DefaultInputLanguage:  "English",
					DefaultOutputLanguage: "Ukrainian",
				},
			},
			expectError:       true,
			expectedErrorMsg:  "at least one language must be configured",
			expectedDebugLogs: 6, // Start, current provider, available providers, model config, language config debug logs
			expectedErrorLogs: 1, // Error log
		},
		{
			name: "Default input language not in available languages",
			settings: &settings.Settings{
				AvailableProviderConfigs: []settings.ProviderConfig{
					constant.OllamaConfig,
				},
				CurrentProviderConfig: constant.OllamaConfig,
				LanguageConfig: settings.LanguageConfig{
					Languages:             []string{"English", "French"},
					DefaultInputLanguage:  "Spanish", // Not in available languages
					DefaultOutputLanguage: "English",
				},
			},
			expectError:       true,
			expectedErrorMsg:  "default input language 'Spanish' not found in available languages",
			expectedDebugLogs: 7, // All validation steps up to default language check
			expectedErrorLogs: 1, // Error log
		},
		{
			name: "Default output language not in available languages",
			settings: &settings.Settings{
				AvailableProviderConfigs: []settings.ProviderConfig{
					constant.OllamaConfig,
				},
				CurrentProviderConfig: constant.OllamaConfig,
				LanguageConfig: settings.LanguageConfig{
					Languages:             []string{"English", "French"},
					DefaultInputLanguage:  "English",
					DefaultOutputLanguage: "Spanish", // Not in available languages
				},
			},
			expectError:       true,
			expectedErrorMsg:  "default output language 'Spanish' not found in available languages",
			expectedDebugLogs: 7, // All validation steps up to default language check
			expectedErrorLogs: 1, // Error log
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			logger := &MockLogger{}
			fileUtils := &MockFileUtilsService{}
			llmHttpApi := &MockLlmHttpApi{}
			mapper := &MockMapperUtils{}

			service := NewSettingsService(logger, fileUtils, llmHttpApi, mapper)

			err := service.ValidateSettings(tt.settings)

			// Verify error conditions
			if (err != nil) != tt.expectError {
				t.Errorf("ValidateSettings() error = %v, expectError %v", err, tt.expectError)
				return
			}

			if tt.expectError {
				if tt.expectedErrorMsg != "" && !containsErrorMessage(err.Error(), tt.expectedErrorMsg) {
					t.Errorf("ValidateSettings() error = %v, expected to contain %s", err, tt.expectedErrorMsg)
				}

				// Verify error logging occurred
				if len(logger.ErrorMessages) != tt.expectedErrorLogs {
					t.Errorf("Expected %d error logs, got %d: %v", tt.expectedErrorLogs, len(logger.ErrorMessages), logger.ErrorMessages)
				}
			} else {
				// Verify debug logging occurred
				if len(logger.DebugMessages) != tt.expectedDebugLogs {
					t.Errorf("Expected %d debug logs, got %d: %v", tt.expectedDebugLogs, len(logger.DebugMessages), logger.DebugMessages)
				}
			}
		})
	}
}

// Test ValidateBaseUrl
func TestValidateBaseUrl(t *testing.T) {
	tests := []struct {
		name              string
		baseUrl           string
		expectValid       bool
		expectError       bool
		expectedErrorMsg  string
		expectedDebugLogs int
		expectedErrorLogs int
	}{
		{
			name:              "Valid HTTP URL",
			baseUrl:           "http://localhost:11434",
			expectValid:       true,
			expectError:       false,
			expectedDebugLogs: 2, // Start and success debug logs
			expectedErrorLogs: 0,
		},
		{
			name:              "Valid HTTPS URL",
			baseUrl:           "https://api.example.com",
			expectValid:       true,
			expectError:       false,
			expectedDebugLogs: 2, // Start and success debug logs
			expectedErrorLogs: 0,
		},
		{
			name:              "Empty URL",
			baseUrl:           "",
			expectValid:       false,
			expectError:       true,
			expectedErrorMsg:  "baseUrl cannot be blank",
			expectedDebugLogs: 0,
			expectedErrorLogs: 1, // Error log
		},
		{
			name:              "URL without protocol",
			baseUrl:           "localhost:11434",
			expectValid:       false,
			expectError:       true,
			expectedErrorMsg:  "baseUrl must start with http:// or https://",
			expectedDebugLogs: 0,
			expectedErrorLogs: 1, // Error log
		},
		{
			name:              "URL with whitespace",
			baseUrl:           "  http://localhost:11434  ",
			expectValid:       false,
			expectError:       true,
			expectedErrorMsg:  "baseUrl must start with http:// or https://",
			expectedDebugLogs: 0,
			expectedErrorLogs: 1, // Error log
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			logger := &MockLogger{}
			fileUtils := &MockFileUtilsService{}
			llmHttpApi := &MockLlmHttpApi{}
			mapper := &MockMapperUtils{}

			service := NewSettingsService(logger, fileUtils, llmHttpApi, mapper)

			result, err := service.ValidateBaseUrl(tt.baseUrl)

			// Verify error conditions
			if (err != nil) != tt.expectError {
				t.Errorf("ValidateBaseUrl() error = %v, expectError %v", err, tt.expectError)
				return
			}

			if tt.expectError {
				if tt.expectedErrorMsg != "" && !containsErrorMessage(err.Error(), tt.expectedErrorMsg) {
					t.Errorf("ValidateBaseUrl() error = %v, expected to contain %s", err, tt.expectedErrorMsg)
				}

				// Verify error logging occurred
				if len(logger.ErrorMessages) != tt.expectedErrorLogs {
					t.Errorf("Expected %d error logs, got %d: %v", tt.expectedErrorLogs, len(logger.ErrorMessages), logger.ErrorMessages)
				}
			} else {
				// Verify successful result
				if result != tt.expectValid {
					t.Errorf("ValidateBaseUrl() result = %v, want %v", result, tt.expectValid)
				}

				// Verify debug logging occurred
				if len(logger.DebugMessages) != tt.expectedDebugLogs {
					t.Errorf("Expected %d debug logs, got %d: %v", tt.expectedDebugLogs, len(logger.DebugMessages), logger.DebugMessages)
				}
			}
		})
	}
}

// Test ValidateEndpoint
func TestValidateEndpoint(t *testing.T) {
	tests := []struct {
		name              string
		endpoint          string
		expectValid       bool
		expectError       bool
		expectedErrorMsg  string
		expectedDebugLogs int
		expectedErrorLogs int
	}{
		{
			name:              "Valid endpoint",
			endpoint:          "/v1/models",
			expectValid:       true,
			expectError:       false,
			expectedDebugLogs: 2, // Start and success debug logs
			expectedErrorLogs: 0,
		},
		{
			name:              "Empty endpoint",
			endpoint:          "",
			expectValid:       false,
			expectError:       true,
			expectedErrorMsg:  "endpoint cannot be blank",
			expectedDebugLogs: 0,
			expectedErrorLogs: 1, // Error log
		},
		{
			name:              "Endpoint without leading slash",
			endpoint:          "v1/models",
			expectValid:       false,
			expectError:       true,
			expectedErrorMsg:  "endpoint must start with /",
			expectedDebugLogs: 0,
			expectedErrorLogs: 1, // Error log
		},
		{
			name:              "Endpoint with whitespace",
			endpoint:          "  /v1/models  ",
			expectValid:       false,
			expectError:       true,
			expectedErrorMsg:  "endpoint must start with /",
			expectedDebugLogs: 0,
			expectedErrorLogs: 1, // Error log
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			logger := &MockLogger{}
			fileUtils := &MockFileUtilsService{}
			llmHttpApi := &MockLlmHttpApi{}
			mapper := &MockMapperUtils{}

			service := NewSettingsService(logger, fileUtils, llmHttpApi, mapper)

			result, err := service.ValidateEndpoint(tt.endpoint)

			// Verify error conditions
			if (err != nil) != tt.expectError {
				t.Errorf("ValidateEndpoint() error = %v, expectError %v", err, tt.expectError)
				return
			}

			if tt.expectError {
				if tt.expectedErrorMsg != "" && !containsErrorMessage(err.Error(), tt.expectedErrorMsg) {
					t.Errorf("ValidateEndpoint() error = %v, expected to contain %s", err, tt.expectedErrorMsg)
				}

				// Verify error logging occurred
				if len(logger.ErrorMessages) != tt.expectedErrorLogs {
					t.Errorf("Expected %d error logs, got %d: %v", tt.expectedErrorLogs, len(logger.ErrorMessages), logger.ErrorMessages)
				}
			} else {
				// Verify successful result
				if result != tt.expectValid {
					t.Errorf("ValidateEndpoint() result = %v, want %v", result, tt.expectValid)
				}

				// Verify debug logging occurred
				if len(logger.DebugMessages) != tt.expectedDebugLogs {
					t.Errorf("Expected %d debug logs, got %d: %v", tt.expectedDebugLogs, len(logger.DebugMessages), logger.DebugMessages)
				}
			}
		})
	}
}

// Test ValidateTemperature
func TestValidateTemperature(t *testing.T) {
	tests := []struct {
		name              string
		temperature       float64
		expectValid       bool
		expectError       bool
		expectedErrorMsg  string
		expectedDebugLogs int
		expectedErrorLogs int
	}{
		{
			name:              "Valid temperature (0.0)",
			temperature:       0.0,
			expectValid:       true,
			expectError:       false,
			expectedDebugLogs: 2, // Start and success debug logs
			expectedErrorLogs: 0,
		},
		{
			name:              "Valid temperature (1.0)",
			temperature:       1.0,
			expectValid:       true,
			expectError:       false,
			expectedDebugLogs: 2, // Start and success debug logs
			expectedErrorLogs: 0,
		},
		{
			name:              "Valid temperature (2.0)",
			temperature:       2.0,
			expectValid:       true,
			expectError:       true,
			expectedDebugLogs: 2, // Start and success debug logs
			expectedErrorLogs: 1,
		},
		{
			name:              "Temperature below minimum",
			temperature:       -1.0,
			expectValid:       false,
			expectError:       true,
			expectedErrorMsg:  "temperature must be between 0 and 1",
			expectedDebugLogs: 0,
			expectedErrorLogs: 1, // Error log
		},
		{
			name:              "Temperature above maximum",
			temperature:       3.0,
			expectValid:       false,
			expectError:       true,
			expectedErrorMsg:  "temperature must be between 0 and 1",
			expectedDebugLogs: 0,
			expectedErrorLogs: 1, // Error log
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			logger := &MockLogger{}
			fileUtils := &MockFileUtilsService{}
			llmHttpApi := &MockLlmHttpApi{}
			mapper := &MockMapperUtils{}

			service := NewSettingsService(logger, fileUtils, llmHttpApi, mapper)

			result, err := service.ValidateTemperature(tt.temperature)

			// Verify error conditions
			if (err != nil) != tt.expectError {
				t.Errorf("ValidateTemperature() error = %v, expectError %v", err, tt.expectError)
				return
			}

			if tt.expectError {
				if tt.expectedErrorMsg != "" && !containsErrorMessage(err.Error(), tt.expectedErrorMsg) {
					t.Errorf("ValidateTemperature() error = %v, expected to contain %s", err, tt.expectedErrorMsg)
				}

				// Verify error logging occurred
				if len(logger.ErrorMessages) != tt.expectedErrorLogs {
					t.Errorf("Expected %d error logs, got %d: %v", tt.expectedErrorLogs, len(logger.ErrorMessages), logger.ErrorMessages)
				}
			} else {
				// Verify successful result
				if result != tt.expectValid {
					t.Errorf("ValidateTemperature() result = %v, want %v", result, tt.expectValid)
				}

				// Verify debug logging occurred
				if len(logger.DebugMessages) != tt.expectedDebugLogs {
					t.Errorf("Expected %d debug logs, got %d: %v", tt.expectedDebugLogs, len(logger.DebugMessages), logger.DebugMessages)
				}
			}
		})
	}
}

// Test SettingsServiceApi interface implementation
func TestSettingsServiceApiInterface(t *testing.T) {
	t.Run("Service should implement SettingsServiceApi interface", func(t *testing.T) {
		logger := &MockLogger{}
		fileUtils := &MockFileUtilsService{}
		llmHttpApi := &MockLlmHttpApi{}
		mapper := &MockMapperUtils{}

		service := NewSettingsService(logger, fileUtils, llmHttpApi, mapper)

		if service == nil {
			t.Fatal("NewSettingsService returned nil")
		}

		var _ = service
	})
}

// Helper function to create string pointers
func stringPtr(s string) *string {
	return &s
}

// Helper function to check if error message contains expected substring
func containsErrorMessage(actual, expected string) bool {
	return len(actual) >= len(expected) && (actual == expected || len(actual) > len(expected) && actual[:len(expected)] == expected || strings.Contains(actual, expected))
}
