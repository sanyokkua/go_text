package frontend

import (
	"errors"
	"fmt"
	"strings"
	"testing"

	"go_text/internal/v2/model"
	"go_text/internal/v2/model/action"
	"go_text/internal/v2/model/llm"
	"go_text/internal/v2/model/settings"
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

// MockSettingsServiceApi for testing
type MockSettingsServiceApi struct {
	currentSettingsResult *settings.Settings
	currentSettingsError  error
}

func (m *MockSettingsServiceApi) GetProviderTypes() ([]string, error) {
	return []string{"custom", "ollama"}, nil
}

func (m *MockSettingsServiceApi) GetCurrentSettings() (*settings.Settings, error) {
	return m.currentSettingsResult, m.currentSettingsError
}

func (m *MockSettingsServiceApi) GetDefaultSettings() (*settings.Settings, error) {
	return &settings.Settings{
		AvailableProviderConfigs: []settings.ProviderConfig{
			{ProviderName: "Default", ProviderType: "custom"},
		},
		CurrentProviderConfig: settings.ProviderConfig{ProviderName: "Default", ProviderType: "custom"},
		LanguageConfig: settings.LanguageConfig{
			Languages:             []string{"English", "French"},
			DefaultInputLanguage:  "English",
			DefaultOutputLanguage: "French",
		},
	}, nil
}

func (m *MockSettingsServiceApi) SaveSettings(settings *settings.Settings) (*settings.Settings, error) {
	return settings, nil
}

func (m *MockSettingsServiceApi) ValidateProvider(config *settings.ProviderConfig) (bool, error) {
	return true, nil
}

func (m *MockSettingsServiceApi) CreateNewProvider(config *settings.ProviderConfig) (*settings.ProviderConfig, error) {
	return config, nil
}

func (m *MockSettingsServiceApi) UpdateProvider(config *settings.ProviderConfig) (*settings.ProviderConfig, error) {
	return config, nil
}

func (m *MockSettingsServiceApi) DeleteProvider(config *settings.ProviderConfig) (bool, error) {
	return true, nil
}

func (m *MockSettingsServiceApi) SelectProvider(config *settings.ProviderConfig) (*settings.ProviderConfig, error) {
	return config, nil
}

func (m *MockSettingsServiceApi) GetModelsList(config *settings.ProviderConfig) ([]string, error) {
	return []string{"llama2", "mistral"}, nil
}

func (m *MockSettingsServiceApi) GetSettingsFilePath() string {
	return "/path/to/settings.json"
}

func (m *MockSettingsServiceApi) ValidateSettings(settings *settings.Settings) error {
	return nil
}

func (m *MockSettingsServiceApi) ValidateBaseUrl(baseUrl string) (bool, error) {
	return true, nil
}

func (m *MockSettingsServiceApi) ValidateEndpoint(endpoint string) (bool, error) {
	return true, nil
}

func (m *MockSettingsServiceApi) ValidateTemperature(temperature float64) (bool, error) {
	return true, nil
}

// MockMapperUtilsApi for testing
type MockMapperUtilsApi struct {
	languageItemsResult []model.LanguageItem
	languageItemResult  model.LanguageItem
}

func (m *MockMapperUtilsApi) MapPromptsToActionItems(prompts []model.Prompt) []action.Action {
	return []action.Action{}
}

func (m *MockMapperUtilsApi) MapLanguageToLanguageItem(language string) model.LanguageItem {
	return m.languageItemResult
}

func (m *MockMapperUtilsApi) MapLanguagesToLanguageItems(languages []string) []model.LanguageItem {
	return m.languageItemsResult
}

func (m *MockMapperUtilsApi) MapModelNames(response *llm.LlmModelListResponse) []string {
	return []string{}
}

// Test NewStateApiService
func TestNewStateApiService(t *testing.T) {
	logger := &MockLogger{}
	settingsService := &MockSettingsServiceApi{}
	mapper := &MockMapperUtilsApi{}

	service := NewStateApiService(logger, settingsService, mapper)

	if service == nil {
		t.Fatal("NewStateApiService returned nil")
	}
}

// Test GetInputLanguages
func TestGetInputLanguages(t *testing.T) {
	tests := []struct {
		name                   string
		currentSettingsResult  *settings.Settings
		currentSettingsError   error
		languageItemsResult    []model.LanguageItem
		expectError            bool
		expectedErrorMsg       string
		expectedInfoLogs       int
		expectedDebugLogs      int
		expectedErrorLogs      int
		expectedLanguagesCount int
	}{
		{
			name: "Successful input languages retrieval with cache",
			currentSettingsResult: &settings.Settings{
				LanguageConfig: settings.LanguageConfig{
					Languages:             []string{"English", "French", "Spanish"},
					DefaultInputLanguage:  "English",
					DefaultOutputLanguage: "French",
				},
			},
			currentSettingsError: nil,
			languageItemsResult: []model.LanguageItem{
				{LanguageId: "English", LanguageText: "English"},
				{LanguageId: "French", LanguageText: "French"},
				{LanguageId: "Spanish", LanguageText: "Spanish"},
			},
			expectError:            false,
			expectedInfoLogs:       2, // Start and success logs
			expectedDebugLogs:      0, // Constructor debug logs
			expectedErrorLogs:      0,
			expectedLanguagesCount: 3,
		},
		{
			name: "Successful input languages retrieval with cache hit",
			currentSettingsResult: &settings.Settings{
				LanguageConfig: settings.LanguageConfig{
					Languages:             []string{"English", "French"},
					DefaultInputLanguage:  "English",
					DefaultOutputLanguage: "French",
				},
			},
			currentSettingsError: nil,
			languageItemsResult: []model.LanguageItem{
				{LanguageId: "English", LanguageText: "English"},
				{LanguageId: "French", LanguageText: "French"},
			},
			expectError:            false,
			expectedInfoLogs:       2, // Start, GetInputLanguages, and success logs
			expectedDebugLogs:      0, // Constructor debug logs
			expectedErrorLogs:      0,
			expectedLanguagesCount: 2,
		},
		{
			name:                   "Current settings retrieval error",
			currentSettingsResult:  nil,
			currentSettingsError:   errors.New("file not found"),
			languageItemsResult:    []model.LanguageItem{},
			expectError:            true,
			expectedErrorMsg:       "failed to retrieve settings",
			expectedInfoLogs:       1, // Only start log
			expectedDebugLogs:      2, // Constructor debug logs
			expectedErrorLogs:      1, // GetInputLanguages and GetOutputLanguages error logs
			expectedLanguagesCount: 0,
		},
		{
			name: "Empty languages in settings",
			currentSettingsResult: &settings.Settings{
				LanguageConfig: settings.LanguageConfig{
					Languages:             []string{},
					DefaultInputLanguage:  "English",
					DefaultOutputLanguage: "French",
				},
			},
			currentSettingsError:   nil,
			languageItemsResult:    []model.LanguageItem{},
			expectError:            false,
			expectedInfoLogs:       2, // Start and success logs
			expectedDebugLogs:      0,
			expectedErrorLogs:      0,
			expectedLanguagesCount: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			logger := &MockLogger{}
			settingsService := &MockSettingsServiceApi{
				currentSettingsResult: tt.currentSettingsResult,
				currentSettingsError:  tt.currentSettingsError,
			}
			mapper := &MockMapperUtilsApi{
				languageItemsResult: tt.languageItemsResult,
			}

			service := NewStateApiService(logger, settingsService, mapper)

			result, err := service.GetInputLanguages()

			// Verify error conditions
			if (err != nil) != tt.expectError {
				t.Errorf("GetInputLanguages() error = %v, expectError %v", err, tt.expectError)
				return
			}

			if tt.expectError {
				if tt.expectedErrorMsg != "" && !containsErrorMessage(err.Error(), tt.expectedErrorMsg) {
					t.Errorf("GetInputLanguages() error = %v, expected to contain %s", err, tt.expectedErrorMsg)
				}

				// Verify error logging occurred
				if len(logger.ErrorMessages) != tt.expectedErrorLogs {
					t.Errorf("Expected %d error logs, got %d: %v", tt.expectedErrorLogs, len(logger.ErrorMessages), logger.ErrorMessages)
				}
			} else {
				// Verify successful result
				if len(result) != tt.expectedLanguagesCount {
					t.Errorf("GetInputLanguages() result length = %d, want %d", len(result), tt.expectedLanguagesCount)
				}

				// Verify info logging occurred
				if len(logger.InfoMessages) != tt.expectedInfoLogs {
					t.Errorf("Expected %d info logs, got %d: %v", tt.expectedInfoLogs, len(logger.InfoMessages), logger.InfoMessages)
				}

				// Verify debug logging occurred
				if len(logger.DebugMessages) != tt.expectedDebugLogs {
					t.Errorf("Expected %d debug logs, got %d: %v", tt.expectedDebugLogs, len(logger.DebugMessages), logger.DebugMessages)
				}

				// Test cache hit - second call should return cached data
				logger.Clear()
				cachedResult, cachedErr := service.GetInputLanguages()

				if cachedErr != nil {
					t.Errorf("GetInputLanguages() cache call error = %v, want nil", cachedErr)
				}

				// Check if results are equivalent (same length and content)
				if len(cachedResult) != len(result) {
					t.Errorf("GetInputLanguages() cache call result length = %d, want %d", len(cachedResult), len(result))
				} else {
					for i := range cachedResult {
						if cachedResult[i] != result[i] {
							t.Errorf("GetInputLanguages() cache call result[%d] = %v, want %v", i, cachedResult[i], result[i])
							break
						}
					}
				}

				// Cache hit should not call the settings service again, so no new debug logs
				if len(logger.DebugMessages) != 0 {
					t.Errorf("Expected 0 debug logs for cache hit, got %d: %v", len(logger.DebugMessages), logger.DebugMessages)
				}
			}
		})
	}
}

// Test GetOutputLanguages
func TestGetOutputLanguages(t *testing.T) {
	tests := []struct {
		name                   string
		currentSettingsResult  *settings.Settings
		currentSettingsError   error
		languageItemsResult    []model.LanguageItem
		expectError            bool
		expectedErrorMsg       string
		expectedInfoLogs       int
		expectedDebugLogs      int
		expectedErrorLogs      int
		expectedLanguagesCount int
	}{
		{
			name: "Successful output languages retrieval",
			currentSettingsResult: &settings.Settings{
				LanguageConfig: settings.LanguageConfig{
					Languages:             []string{"English", "French", "Spanish"},
					DefaultInputLanguage:  "English",
					DefaultOutputLanguage: "French",
				},
			},
			currentSettingsError: nil,
			languageItemsResult: []model.LanguageItem{
				{LanguageId: "English", LanguageText: "English"},
				{LanguageId: "French", LanguageText: "French"},
				{LanguageId: "Spanish", LanguageText: "Spanish"},
			},
			expectError:            false,
			expectedInfoLogs:       4, // Start, GetInputLanguages, and success logs
			expectedDebugLogs:      0, // Constructor debug logs
			expectedErrorLogs:      0,
			expectedLanguagesCount: 3,
		},
		{
			name: "Successful output languages retrieval with cache hit",
			currentSettingsResult: &settings.Settings{
				LanguageConfig: settings.LanguageConfig{
					Languages:             []string{"English", "French"},
					DefaultInputLanguage:  "English",
					DefaultOutputLanguage: "French",
				},
			},
			currentSettingsError: nil,
			languageItemsResult: []model.LanguageItem{
				{LanguageId: "English", LanguageText: "English"},
				{LanguageId: "French", LanguageText: "French"},
			},
			expectError:            false,
			expectedInfoLogs:       4, // Start, GetInputLanguages, and success logs
			expectedDebugLogs:      0, // Constructor debug logs
			expectedErrorLogs:      0,
			expectedLanguagesCount: 2,
		},
		{
			name:                   "Current settings retrieval error",
			currentSettingsResult:  nil,
			currentSettingsError:   errors.New("file not found"),
			languageItemsResult:    []model.LanguageItem{},
			expectError:            true,
			expectedErrorMsg:       "failed to retrieve output languages",
			expectedInfoLogs:       1, // Only start log
			expectedDebugLogs:      0, // Constructor debug logs
			expectedErrorLogs:      2, // GetInputLanguages and GetOutputLanguages error logs
			expectedLanguagesCount: 0,
		},
		{
			name: "Empty languages in settings",
			currentSettingsResult: &settings.Settings{
				LanguageConfig: settings.LanguageConfig{
					Languages:             []string{},
					DefaultInputLanguage:  "English",
					DefaultOutputLanguage: "French",
				},
			},
			currentSettingsError:   nil,
			languageItemsResult:    []model.LanguageItem{},
			expectError:            false,
			expectedInfoLogs:       4, // Start and success logs
			expectedDebugLogs:      0,
			expectedErrorLogs:      0,
			expectedLanguagesCount: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			logger := &MockLogger{}
			settingsService := &MockSettingsServiceApi{
				currentSettingsResult: tt.currentSettingsResult,
				currentSettingsError:  tt.currentSettingsError,
			}
			mapper := &MockMapperUtilsApi{
				languageItemsResult: tt.languageItemsResult,
			}

			service := NewStateApiService(logger, settingsService, mapper)

			result, err := service.GetOutputLanguages()

			// Verify error conditions
			if (err != nil) != tt.expectError {
				t.Errorf("GetOutputLanguages() error = %v, expectError %v", err, tt.expectError)
				return
			}

			if tt.expectError {
				if tt.expectedErrorMsg != "" && !containsErrorMessage(err.Error(), tt.expectedErrorMsg) {
					t.Errorf("GetOutputLanguages() error = %v, expected to contain %s", err, tt.expectedErrorMsg)
				}

				// Verify error logging occurred
				if len(logger.ErrorMessages) != tt.expectedErrorLogs {
					t.Errorf("Expected %d error logs, got %d: %v", tt.expectedErrorLogs, len(logger.ErrorMessages), logger.ErrorMessages)
				}
			} else {
				// Verify successful result
				if len(result) != tt.expectedLanguagesCount {
					t.Errorf("GetOutputLanguages() result length = %d, want %d", len(result), tt.expectedLanguagesCount)
				}

				// Verify info logging occurred
				if len(logger.InfoMessages) != tt.expectedInfoLogs {
					t.Errorf("Expected %d info logs, got %d: %v", tt.expectedInfoLogs, len(logger.InfoMessages), logger.InfoMessages)
				}

				// Verify debug logging occurred
				if len(logger.DebugMessages) != tt.expectedDebugLogs {
					t.Errorf("Expected %d debug logs, got %d: %v", tt.expectedDebugLogs, len(logger.DebugMessages), logger.DebugMessages)
				}

				// Test cache hit - second call should return cached data
				logger.Clear()
				cachedResult, cachedErr := service.GetOutputLanguages()

				if cachedErr != nil {
					t.Errorf("GetOutputLanguages() cache call error = %v, want nil", cachedErr)
				}

				// Check if results are equivalent (same length and content)
				if len(cachedResult) != len(result) {
					t.Errorf("GetOutputLanguages() cache call result length = %d, want %d", len(cachedResult), len(result))
				} else {
					for i := range cachedResult {
						if cachedResult[i] != result[i] {
							t.Errorf("GetOutputLanguages() cache call result[%d] = %v, want %v", i, cachedResult[i], result[i])
							break
						}
					}
				}

				// Cache hit should not call the settings service again, so no new debug logs
				if len(logger.DebugMessages) != 0 {
					t.Errorf("Expected 0 debug logs for cache hit, got %d: %v", len(logger.DebugMessages), logger.DebugMessages)
				}
			}
		})
	}
}

// Test GetDefaultInputLanguage
func TestGetDefaultInputLanguage(t *testing.T) {
	tests := []struct {
		name                  string
		currentSettingsResult *settings.Settings
		currentSettingsError  error
		languageItemResult    model.LanguageItem
		expectError           bool
		expectedErrorMsg      string
		expectedInfoLogs      int
		expectedDebugLogs     int
		expectedErrorLogs     int
		expectedLanguageId    string
	}{
		{
			name: "Successful default input language retrieval",
			currentSettingsResult: &settings.Settings{
				LanguageConfig: settings.LanguageConfig{
					Languages:             []string{"English", "French"},
					DefaultInputLanguage:  "English",
					DefaultOutputLanguage: "French",
				},
			},
			currentSettingsError: nil,
			languageItemResult:   model.LanguageItem{LanguageId: "English", LanguageText: "English"},
			expectError:          false,
			expectedInfoLogs:     2, // Start and success logs
			expectedDebugLogs:    0,
			expectedErrorLogs:    0,
			expectedLanguageId:   "English",
		},
		{
			name:                  "Current settings retrieval error",
			currentSettingsResult: nil,
			currentSettingsError:  errors.New("file not found"),
			languageItemResult:    model.LanguageItem{},
			expectError:           true,
			expectedErrorMsg:      "failed to retrieve settings",
			expectedInfoLogs:      2, // Only start log
			expectedDebugLogs:     0, // Constructor debug logs
			expectedErrorLogs:     1, // GetInputLanguages and GetOutputLanguages error logs
			expectedLanguageId:    "",
		},
		{
			name: "Empty default input language",
			currentSettingsResult: &settings.Settings{
				LanguageConfig: settings.LanguageConfig{
					Languages:             []string{"English", "French"},
					DefaultInputLanguage:  "",
					DefaultOutputLanguage: "French",
				},
			},
			currentSettingsError: nil,
			languageItemResult:   model.LanguageItem{LanguageId: "", LanguageText: ""},
			expectError:          false,
			expectedInfoLogs:     2, // Start and success logs
			expectedDebugLogs:    0,
			expectedErrorLogs:    0,
			expectedLanguageId:   "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			logger := &MockLogger{}
			settingsService := &MockSettingsServiceApi{
				currentSettingsResult: tt.currentSettingsResult,
				currentSettingsError:  tt.currentSettingsError,
			}
			mapper := &MockMapperUtilsApi{
				languageItemResult: tt.languageItemResult,
			}

			service := NewStateApiService(logger, settingsService, mapper)

			result, err := service.GetDefaultInputLanguage()

			// Verify error conditions
			if (err != nil) != tt.expectError {
				t.Errorf("GetDefaultInputLanguage() error = %v, expectError %v", err, tt.expectError)
				return
			}

			if tt.expectError {
				if tt.expectedErrorMsg != "" && !containsErrorMessage(err.Error(), tt.expectedErrorMsg) {
					t.Errorf("GetDefaultInputLanguage() error = %v, expected to contain %s", err, tt.expectedErrorMsg)
				}

				// Verify error logging occurred
				if len(logger.ErrorMessages) != tt.expectedErrorLogs {
					t.Errorf("Expected %d error logs, got %d: %v", tt.expectedErrorLogs, len(logger.ErrorMessages), logger.ErrorMessages)
				}
			} else {
				// Verify successful result
				if result.LanguageId != tt.expectedLanguageId {
					t.Errorf("GetDefaultInputLanguage() result language ID = %s, want %s", result.LanguageId, tt.expectedLanguageId)
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

// Test GetDefaultOutputLanguage
func TestGetDefaultOutputLanguage(t *testing.T) {
	tests := []struct {
		name                  string
		currentSettingsResult *settings.Settings
		currentSettingsError  error
		languageItemResult    model.LanguageItem
		expectError           bool
		expectedErrorMsg      string
		expectedInfoLogs      int
		expectedDebugLogs     int
		expectedErrorLogs     int
		expectedLanguageId    string
	}{
		{
			name: "Successful default output language retrieval",
			currentSettingsResult: &settings.Settings{
				LanguageConfig: settings.LanguageConfig{
					Languages:             []string{"English", "French"},
					DefaultInputLanguage:  "English",
					DefaultOutputLanguage: "French",
				},
			},
			currentSettingsError: nil,
			languageItemResult:   model.LanguageItem{LanguageId: "French", LanguageText: "French"},
			expectError:          false,
			expectedInfoLogs:     2, // Start and success logs
			expectedDebugLogs:    0,
			expectedErrorLogs:    0,
			expectedLanguageId:   "French",
		},
		{
			name:                  "Current settings retrieval error",
			currentSettingsResult: nil,
			currentSettingsError:  errors.New("file not found"),
			languageItemResult:    model.LanguageItem{},
			expectError:           true,
			expectedErrorMsg:      "failed to retrieve settings",
			expectedInfoLogs:      1, // Only start log
			expectedDebugLogs:     0, // Constructor debug logs
			expectedErrorLogs:     1, // GetInputLanguages and GetOutputLanguages error logs
			expectedLanguageId:    "",
		},
		{
			name: "Empty default output language",
			currentSettingsResult: &settings.Settings{
				LanguageConfig: settings.LanguageConfig{
					Languages:             []string{"English", "French"},
					DefaultInputLanguage:  "English",
					DefaultOutputLanguage: "",
				},
			},
			currentSettingsError: nil,
			languageItemResult:   model.LanguageItem{LanguageId: "", LanguageText: ""},
			expectError:          false,
			expectedInfoLogs:     2, // Start and success logs
			expectedDebugLogs:    0,
			expectedErrorLogs:    0,
			expectedLanguageId:   "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			logger := &MockLogger{}
			settingsService := &MockSettingsServiceApi{
				currentSettingsResult: tt.currentSettingsResult,
				currentSettingsError:  tt.currentSettingsError,
			}
			mapper := &MockMapperUtilsApi{
				languageItemResult: tt.languageItemResult,
			}

			service := NewStateApiService(logger, settingsService, mapper)

			result, err := service.GetDefaultOutputLanguage()

			// Verify error conditions
			if (err != nil) != tt.expectError {
				t.Errorf("GetDefaultOutputLanguage() error = %v, expectError %v", err, tt.expectError)
				return
			}

			if tt.expectError {
				if tt.expectedErrorMsg != "" && !containsErrorMessage(err.Error(), tt.expectedErrorMsg) {
					t.Errorf("GetDefaultOutputLanguage() error = %v, expected to contain %s", err, tt.expectedErrorMsg)
				}

				// Verify error logging occurred
				if len(logger.ErrorMessages) != tt.expectedErrorLogs {
					t.Errorf("Expected %d error logs, got %d: %v", tt.expectedErrorLogs, len(logger.ErrorMessages), logger.ErrorMessages)
				}
			} else {
				// Verify successful result
				if result.LanguageId != tt.expectedLanguageId {
					t.Errorf("GetDefaultOutputLanguage() result language ID = %s, want %s", result.LanguageId, tt.expectedLanguageId)
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

// Test StateApi interface implementation
func TestStateApiInterface(t *testing.T) {
	t.Run("Service should implement StateApi interface", func(t *testing.T) {
		logger := &MockLogger{}
		settingsService := &MockSettingsServiceApi{}
		mapper := &MockMapperUtilsApi{}

		service := NewStateApiService(logger, settingsService, mapper)

		if service == nil {
			t.Fatal("NewStateApiService returned nil")
		}

		var _ = service
	})
}

// Helper function to check if error message contains expected substring
func containsErrorMessage(actual, expected string) bool {
	return len(actual) >= len(expected) && (actual == expected || len(actual) > len(expected) && actual[:len(expected)] == expected || strings.Contains(actual, expected))
}
