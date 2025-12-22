package frontend

import (
	"errors"
	"fmt"
	"go_text/backend/v2/model/settings"
	"strings"
	"testing"
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
	providerTypesResult    []string
	providerTypesError     error
	currentSettingsResult  *settings.Settings
	currentSettingsError   error
	defaultSettingsResult  *settings.Settings
	defaultSettingsError   error
	saveSettingsResult     *settings.Settings
	saveSettingsError      error
	validateProviderResult bool
	validateProviderError  error
	createProviderResult   *settings.ProviderConfig
	createProviderError    error
	updateProviderResult   *settings.ProviderConfig
	updateProviderError    error
	deleteProviderResult   bool
	deleteProviderError    error
	selectProviderResult   *settings.ProviderConfig
	selectProviderError    error
	modelsListResult       []string
	modelsListError        error
	settingsFilePath       string
}

func (m *MockSettingsServiceApi) GetProviderTypes() ([]string, error) {
	return m.providerTypesResult, m.providerTypesError
}

func (m *MockSettingsServiceApi) GetCurrentSettings() (*settings.Settings, error) {
	return m.currentSettingsResult, m.currentSettingsError
}

func (m *MockSettingsServiceApi) GetDefaultSettings() (*settings.Settings, error) {
	return m.defaultSettingsResult, m.defaultSettingsError
}

func (m *MockSettingsServiceApi) SaveSettings(settings *settings.Settings) (*settings.Settings, error) {
	return m.saveSettingsResult, m.saveSettingsError
}

func (m *MockSettingsServiceApi) ValidateProvider(config *settings.ProviderConfig, validateHttpCall bool, modelName string) (bool, error) {
	return m.validateProviderResult, m.validateProviderError
}

func (m *MockSettingsServiceApi) CreateNewProvider(config *settings.ProviderConfig, modelName string) (*settings.ProviderConfig, error) {
	return m.createProviderResult, m.createProviderError
}

func (m *MockSettingsServiceApi) UpdateProvider(config *settings.ProviderConfig) (*settings.ProviderConfig, error) {
	return m.updateProviderResult, m.updateProviderError
}

func (m *MockSettingsServiceApi) DeleteProvider(config *settings.ProviderConfig) (bool, error) {
	return m.deleteProviderResult, m.deleteProviderError
}

func (m *MockSettingsServiceApi) SelectProvider(config *settings.ProviderConfig) (*settings.ProviderConfig, error) {
	return m.selectProviderResult, m.selectProviderError
}

func (m *MockSettingsServiceApi) GetModelsList(config *settings.ProviderConfig) ([]string, error) {
	return m.modelsListResult, m.modelsListError
}

func (m *MockSettingsServiceApi) GetSettingsFilePath() string {
	return m.settingsFilePath
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

// Test NewSettingsApi
func TestNewSettingsApi(t *testing.T) {
	logger := &MockLogger{}
	settingsService := &MockSettingsServiceApi{}

	service := NewSettingsApi(logger, settingsService)

	if service == nil {
		t.Fatal("NewSettingsApi returned nil")
	}
}

// Test GetProviderTypes
func TestGetProviderTypes(t *testing.T) {
	tests := []struct {
		name                  string
		providerTypesResult   []string
		providerTypesError    error
		expectError           bool
		expectedErrorMsg      string
		expectedInfoLogs      int
		expectedDebugLogs     int
		expectedErrorLogs     int
		expectedProviderTypes int
	}{
		{
			name:                  "Successful provider types retrieval",
			providerTypesResult:   []string{"custom", "ollama", "openai"},
			providerTypesError:    nil,
			expectError:           false,
			expectedInfoLogs:      2, // Start and success logs
			expectedDebugLogs:     0, // Constructor debug logs
			expectedErrorLogs:     0,
			expectedProviderTypes: 3,
		},
		{
			name:                  "Provider types retrieval error",
			providerTypesResult:   []string{},
			providerTypesError:    errors.New("database connection failed"),
			expectError:           true,
			expectedErrorMsg:      "failed to retrieve provider types",
			expectedInfoLogs:      1, // Only start log
			expectedDebugLogs:     2, // Constructor debug logs
			expectedErrorLogs:     1, // Error log
			expectedProviderTypes: 0,
		},
		{
			name:                  "Empty provider types",
			providerTypesResult:   []string{},
			providerTypesError:    nil,
			expectError:           false,
			expectedInfoLogs:      2, // Start and success logs
			expectedDebugLogs:     0, // Constructor debug logs
			expectedErrorLogs:     0,
			expectedProviderTypes: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			logger := &MockLogger{}
			settingsService := &MockSettingsServiceApi{
				providerTypesResult: tt.providerTypesResult,
				providerTypesError:  tt.providerTypesError,
			}

			service := NewSettingsApi(logger, settingsService)

			result, err := service.GetProviderTypes()

			// Verify error conditions
			if (err != nil) != tt.expectError {
				t.Errorf("GetProviderTypes() error = %v, expectError %v", err, tt.expectError)
				return
			}

			if tt.expectError {
				if tt.expectedErrorMsg != "" && !containsErrorMessage(err.Error(), tt.expectedErrorMsg) {
					t.Errorf("GetProviderTypes() error = %v, expected to contain %s", err, tt.expectedErrorMsg)
				}

				// Verify error logging occurred
				if len(logger.ErrorMessages) != tt.expectedErrorLogs {
					t.Errorf("Expected %d error logs, got %d: %v", tt.expectedErrorLogs, len(logger.ErrorMessages), logger.ErrorMessages)
				}
			} else {
				// Verify successful result
				if len(result) != tt.expectedProviderTypes {
					t.Errorf("GetProviderTypes() result length = %d, want %d", len(result), tt.expectedProviderTypes)
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

// Test GetCurrentSettings
func TestGetCurrentSettings(t *testing.T) {
	tests := []struct {
		name                  string
		currentSettingsResult *settings.Settings
		currentSettingsError  error
		expectError           bool
		expectedErrorMsg      string
		expectedInfoLogs      int
		expectedDebugLogs     int
		expectedErrorLogs     int
	}{
		{
			name: "Successful current settings retrieval",
			currentSettingsResult: &settings.Settings{
				AvailableProviderConfigs: []settings.ProviderConfig{
					{ProviderName: "Ollama", ProviderType: "ollama"},
				},
				CurrentProviderConfig: settings.ProviderConfig{ProviderName: "Ollama", ProviderType: "ollama"},
			},
			currentSettingsError: nil,
			expectError:          false,
			expectedInfoLogs:     2, // Start and success logs
			expectedDebugLogs:    0, // Constructor debug logs
			expectedErrorLogs:    0,
		},
		{
			name:                  "Current settings retrieval error",
			currentSettingsResult: nil,
			currentSettingsError:  errors.New("file not found"),
			expectError:           true,
			expectedErrorMsg:      "failed to retrieve current settings",
			expectedInfoLogs:      1, // Only start log
			expectedDebugLogs:     0, // Constructor debug logs
			expectedErrorLogs:     1, // Error log
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			logger := &MockLogger{}
			settingsService := &MockSettingsServiceApi{
				currentSettingsResult: tt.currentSettingsResult,
				currentSettingsError:  tt.currentSettingsError,
			}

			service := NewSettingsApi(logger, settingsService)

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
				if result != tt.currentSettingsResult {
					t.Errorf("GetCurrentSettings() result = %v, want %v", result, tt.currentSettingsResult)
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

// Test GetDefaultSettings
func TestGetDefaultSettings(t *testing.T) {
	tests := []struct {
		name                  string
		defaultSettingsResult *settings.Settings
		defaultSettingsError  error
		expectError           bool
		expectedErrorMsg      string
		expectedInfoLogs      int
		expectedDebugLogs     int
		expectedErrorLogs     int
	}{
		{
			name: "Successful default settings retrieval",
			defaultSettingsResult: &settings.Settings{
				AvailableProviderConfigs: []settings.ProviderConfig{
					{ProviderName: "Default", ProviderType: "custom"},
				},
				CurrentProviderConfig: settings.ProviderConfig{ProviderName: "Default", ProviderType: "custom"},
			},
			defaultSettingsError: nil,
			expectError:          false,
			expectedInfoLogs:     0,
			expectedDebugLogs:    2, // Constructor + method debug logs
			expectedErrorLogs:    0,
		},
		{
			name:                  "Default settings retrieval error",
			defaultSettingsResult: nil,
			defaultSettingsError:  errors.New("configuration error"),
			expectError:           true,
			expectedErrorMsg:      "failed to retrieve default settings",
			expectedInfoLogs:      0,
			expectedDebugLogs:     1, // Constructor + method debug logs // Only start debug log
			expectedErrorLogs:     1, // Error log
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			logger := &MockLogger{}
			settingsService := &MockSettingsServiceApi{
				defaultSettingsResult: tt.defaultSettingsResult,
				defaultSettingsError:  tt.defaultSettingsError,
			}

			service := NewSettingsApi(logger, settingsService)

			result, err := service.GetDefaultSettings()

			// Verify error conditions
			if (err != nil) != tt.expectError {
				t.Errorf("GetDefaultSettings() error = %v, expectError %v", err, tt.expectError)
				return
			}

			if tt.expectError {
				if tt.expectedErrorMsg != "" && !containsErrorMessage(err.Error(), tt.expectedErrorMsg) {
					t.Errorf("GetDefaultSettings() error = %v, expected to contain %s", err, tt.expectedErrorMsg)
				}

				// Verify error logging occurred
				if len(logger.ErrorMessages) != tt.expectedErrorLogs {
					t.Errorf("Expected %d error logs, got %d: %v", tt.expectedErrorLogs, len(logger.ErrorMessages), logger.ErrorMessages)
				}
			} else {
				// Verify successful result
				if result != tt.defaultSettingsResult {
					t.Errorf("GetDefaultSettings() result = %v, want %v", result, tt.defaultSettingsResult)
				}

				// Verify debug logging occurred
				if len(logger.DebugMessages) != tt.expectedDebugLogs {
					t.Errorf("Expected %d debug logs, got %d: %v", tt.expectedDebugLogs, len(logger.DebugMessages), logger.DebugMessages)
				}
			}
		})
	}
}

// Test SaveSettings
func TestSaveSettings(t *testing.T) {
	tests := []struct {
		name               string
		settings           *settings.Settings
		saveSettingsResult *settings.Settings
		saveSettingsError  error
		expectError        bool
		expectedErrorMsg   string
		expectedInfoLogs   int
		expectedDebugLogs  int
		expectedErrorLogs  int
	}{
		{
			name: "Successful settings save",
			settings: &settings.Settings{
				AvailableProviderConfigs: []settings.ProviderConfig{
					{ProviderName: "Ollama", ProviderType: "ollama"},
				},
				CurrentProviderConfig: settings.ProviderConfig{ProviderName: "Ollama", ProviderType: "ollama"},
			},
			saveSettingsResult: &settings.Settings{
				AvailableProviderConfigs: []settings.ProviderConfig{
					{ProviderName: "Ollama", ProviderType: "ollama"},
				},
				CurrentProviderConfig: settings.ProviderConfig{ProviderName: "Ollama", ProviderType: "ollama"},
			},
			saveSettingsError: nil,
			expectError:       false,
			expectedInfoLogs:  2, // Start and success logs
			expectedDebugLogs: 0, // Constructor debug logs
			expectedErrorLogs: 0,
		},
		{
			name:               "Nil settings",
			settings:           nil,
			saveSettingsResult: nil,
			saveSettingsError:  nil,
			expectError:        true,
			expectedErrorMsg:   "settings object cannot be nil",
			expectedInfoLogs:   1, // Only start log
			expectedDebugLogs:  0, // Constructor debug logs
			expectedErrorLogs:  1, // Error log
		},
		{
			name: "Settings save error",
			settings: &settings.Settings{
				AvailableProviderConfigs: []settings.ProviderConfig{
					{ProviderName: "Ollama", ProviderType: "ollama"},
				},
				CurrentProviderConfig: settings.ProviderConfig{ProviderName: "Ollama", ProviderType: "ollama"},
			},
			saveSettingsResult: nil,
			saveSettingsError:  errors.New("permission denied"),
			expectError:        true,
			expectedErrorMsg:   "failed to save settings",
			expectedInfoLogs:   1, // Only start log
			expectedDebugLogs:  0,
			expectedErrorLogs:  1, // Error log
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			logger := &MockLogger{}
			settingsService := &MockSettingsServiceApi{
				saveSettingsResult: tt.saveSettingsResult,
				saveSettingsError:  tt.saveSettingsError,
			}

			service := NewSettingsApi(logger, settingsService)

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
				if result != tt.saveSettingsResult {
					t.Errorf("SaveSettings() result = %v, want %v", result, tt.saveSettingsResult)
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
		name                   string
		config                 *settings.ProviderConfig
		validateProviderResult bool
		validateProviderError  error
		expectError            bool
		expectedErrorMsg       string
		expectedInfoLogs       int
		expectedDebugLogs      int
		expectedErrorLogs      int
	}{
		{
			name: "Successful provider validation",
			config: &settings.ProviderConfig{
				ProviderName:       "Ollama",
				ProviderType:       "ollama",
				BaseUrl:            "http://localhost:11434",
				ModelsEndpoint:     "/v1/models",
				CompletionEndpoint: "/v1/chat/completions",
			},
			validateProviderResult: true,
			validateProviderError:  nil,
			expectError:            false,
			expectedInfoLogs:       0,
			expectedDebugLogs:      2, // Constructor + method debug logs
			expectedErrorLogs:      0,
		},
		{
			name:                   "Nil config",
			config:                 nil,
			validateProviderResult: false,
			validateProviderError:  nil,
			expectError:            true,
			expectedErrorMsg:       "invalid input",
			expectedInfoLogs:       0,
			expectedDebugLogs:      0, // Constructor debug logs
			expectedErrorLogs:      1, // Error log (but will panic due to bug in service)
		},
		{
			name: "Provider validation error",
			config: &settings.ProviderConfig{
				ProviderName:       "Ollama",
				ProviderType:       "ollama",
				BaseUrl:            "http://localhost:11434",
				ModelsEndpoint:     "/v1/models",
				CompletionEndpoint: "/v1/chat/completions",
			},
			validateProviderResult: false,
			validateProviderError:  errors.New("invalid base URL"),
			expectError:            true,
			expectedErrorMsg:       "provider validation failed",
			expectedInfoLogs:       0,
			expectedDebugLogs:      1, // Constructor + method debug logs // Only start debug log
			expectedErrorLogs:      1, // Error log
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			logger := &MockLogger{}
			settingsService := &MockSettingsServiceApi{
				validateProviderResult: tt.validateProviderResult,
				validateProviderError:  tt.validateProviderError,
			}

			service := NewSettingsApi(logger, settingsService)

			result, err := service.ValidateProvider(tt.config, false, "test")

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
				if result != tt.validateProviderResult {
					t.Errorf("ValidateProvider() result = %v, want %v", result, tt.validateProviderResult)
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
		name                 string
		config               *settings.ProviderConfig
		createProviderResult *settings.ProviderConfig
		createProviderError  error
		expectError          bool
		expectedErrorMsg     string
		expectedInfoLogs     int
		expectedDebugLogs    int
		expectedErrorLogs    int
	}{
		{
			name: "Successful provider creation",
			config: &settings.ProviderConfig{
				ProviderName:       "New Provider",
				ProviderType:       "custom",
				BaseUrl:            "http://localhost:8080",
				ModelsEndpoint:     "/v1/models",
				CompletionEndpoint: "/v1/chat/completions",
			},
			createProviderResult: &settings.ProviderConfig{
				ProviderName:       "New Provider",
				ProviderType:       "custom",
				BaseUrl:            "http://localhost:8080",
				ModelsEndpoint:     "/v1/models",
				CompletionEndpoint: "/v1/chat/completions",
			},
			createProviderError: nil,
			expectError:         false,
			expectedInfoLogs:    2, // Start and success logs
			expectedDebugLogs:   0,
			expectedErrorLogs:   0,
		},
		{
			name:                 "Nil config",
			config:               nil,
			createProviderResult: nil,
			createProviderError:  nil,
			expectError:          true,
			expectedErrorMsg:     "provider config cannot be nil",
			expectedInfoLogs:     1, // Only start log
			expectedDebugLogs:    2, // Constructor debug logs
			expectedErrorLogs:    1, // Error log
		},
		{
			name: "Provider creation error",
			config: &settings.ProviderConfig{
				ProviderName:       "New Provider",
				ProviderType:       "custom",
				BaseUrl:            "http://localhost:8080",
				ModelsEndpoint:     "/v1/models",
				CompletionEndpoint: "/v1/chat/completions",
			},
			createProviderResult: nil,
			createProviderError:  errors.New("duplicate provider name"),
			expectError:          true,
			expectedErrorMsg:     "failed to create provider",
			expectedInfoLogs:     1, // Only start log
			expectedDebugLogs:    0,
			expectedErrorLogs:    1, // Error log
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			logger := &MockLogger{}
			settingsService := &MockSettingsServiceApi{
				createProviderResult: tt.createProviderResult,
				createProviderError:  tt.createProviderError,
			}

			service := NewSettingsApi(logger, settingsService)

			result, err := service.CreateNewProvider(tt.config, "test")

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
				if result != tt.createProviderResult {
					t.Errorf("CreateNewProvider() result = %v, want %v", result, tt.createProviderResult)
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
		name                 string
		config               *settings.ProviderConfig
		updateProviderResult *settings.ProviderConfig
		updateProviderError  error
		expectError          bool
		expectedErrorMsg     string
		expectedInfoLogs     int
		expectedDebugLogs    int
		expectedErrorLogs    int
	}{
		{
			name: "Successful provider update",
			config: &settings.ProviderConfig{
				ProviderName:       "Ollama",
				ProviderType:       "ollama",
				BaseUrl:            "http://localhost:11434",
				ModelsEndpoint:     "/v1/models",
				CompletionEndpoint: "/v1/chat/completions",
			},
			updateProviderResult: &settings.ProviderConfig{
				ProviderName:       "Ollama",
				ProviderType:       "ollama",
				BaseUrl:            "http://localhost:11434",
				ModelsEndpoint:     "/v1/models",
				CompletionEndpoint: "/v1/chat/completions",
			},
			updateProviderError: nil,
			expectError:         false,
			expectedInfoLogs:    2, // Start and success logs
			expectedDebugLogs:   0,
			expectedErrorLogs:   0,
		},
		{
			name:                 "Nil config",
			config:               nil,
			updateProviderResult: nil,
			updateProviderError:  nil,
			expectError:          true,
			expectedErrorMsg:     "provider config cannot be nil",
			expectedInfoLogs:     1, // Only start log
			expectedDebugLogs:    0, // Constructor debug logs
			expectedErrorLogs:    1, // Error log
		},
		{
			name: "Provider update error",
			config: &settings.ProviderConfig{
				ProviderName:       "Ollama",
				ProviderType:       "ollama",
				BaseUrl:            "http://localhost:11434",
				ModelsEndpoint:     "/v1/models",
				CompletionEndpoint: "/v1/chat/completions",
			},
			updateProviderResult: nil,
			updateProviderError:  errors.New("provider not found"),
			expectError:          true,
			expectedErrorMsg:     "failed to update provider",
			expectedInfoLogs:     1, // Only start log
			expectedDebugLogs:    0,
			expectedErrorLogs:    1, // Error log
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			logger := &MockLogger{}
			settingsService := &MockSettingsServiceApi{
				updateProviderResult: tt.updateProviderResult,
				updateProviderError:  tt.updateProviderError,
			}

			service := NewSettingsApi(logger, settingsService)

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
				if result != tt.updateProviderResult {
					t.Errorf("UpdateProvider() result = %v, want %v", result, tt.updateProviderResult)
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
		name                 string
		config               *settings.ProviderConfig
		deleteProviderResult bool
		deleteProviderError  error
		expectError          bool
		expectedErrorMsg     string
		expectedInfoLogs     int
		expectedDebugLogs    int
		expectedErrorLogs    int
	}{
		{
			name: "Successful provider deletion",
			config: &settings.ProviderConfig{
				ProviderName: "LM Studio",
				ProviderType: "custom",
			},
			deleteProviderResult: true,
			deleteProviderError:  nil,
			expectError:          false,
			expectedInfoLogs:     2, // Start and success logs
			expectedDebugLogs:    0,
			expectedErrorLogs:    0,
		},
		{
			name:                 "Nil config",
			config:               nil,
			deleteProviderResult: false,
			deleteProviderError:  nil,
			expectError:          true,
			expectedErrorMsg:     "provider config cannot be nil",
			expectedInfoLogs:     1, // Only start log
			expectedDebugLogs:    0, // Constructor debug logs
			expectedErrorLogs:    1, // Error log
		},
		{
			name: "Provider deletion error",
			config: &settings.ProviderConfig{
				ProviderName: "LM Studio",
				ProviderType: "custom",
			},
			deleteProviderResult: false,
			deleteProviderError:  errors.New("provider not found"),
			expectError:          true,
			expectedErrorMsg:     "failed to delete provider",
			expectedInfoLogs:     1, // Only start log
			expectedDebugLogs:    0,
			expectedErrorLogs:    1, // Error log
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			logger := &MockLogger{}
			settingsService := &MockSettingsServiceApi{
				deleteProviderResult: tt.deleteProviderResult,
				deleteProviderError:  tt.deleteProviderError,
			}

			service := NewSettingsApi(logger, settingsService)

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
				if result != tt.deleteProviderResult {
					t.Errorf("DeleteProvider() result = %v, want %v", result, tt.deleteProviderResult)
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
		name                 string
		config               *settings.ProviderConfig
		selectProviderResult *settings.ProviderConfig
		selectProviderError  error
		expectError          bool
		expectedErrorMsg     string
		expectedInfoLogs     int
		expectedDebugLogs    int
		expectedErrorLogs    int
	}{
		{
			name: "Successful provider selection",
			config: &settings.ProviderConfig{
				ProviderName:       "LM Studio",
				ProviderType:       "custom",
				BaseUrl:            "http://localhost:1234",
				ModelsEndpoint:     "/v1/models",
				CompletionEndpoint: "/v1/chat/completions",
			},
			selectProviderResult: &settings.ProviderConfig{
				ProviderName:       "LM Studio",
				ProviderType:       "custom",
				BaseUrl:            "http://localhost:1234",
				ModelsEndpoint:     "/v1/models",
				CompletionEndpoint: "/v1/chat/completions",
			},
			selectProviderError: nil,
			expectError:         false,
			expectedInfoLogs:    2, // Start and success logs
			expectedDebugLogs:   0,
			expectedErrorLogs:   0,
		},
		{
			name:                 "Nil config",
			config:               nil,
			selectProviderResult: nil,
			selectProviderError:  nil,
			expectError:          true,
			expectedErrorMsg:     "provider config cannot be nil",
			expectedInfoLogs:     1, // Only start log
			expectedDebugLogs:    2, // Constructor debug logs
			expectedErrorLogs:    1, // Error log
		},
		{
			name: "Provider selection error",
			config: &settings.ProviderConfig{
				ProviderName:       "LM Studio",
				ProviderType:       "custom",
				BaseUrl:            "http://localhost:1234",
				ModelsEndpoint:     "/v1/models",
				CompletionEndpoint: "/v1/chat/completions",
			},
			selectProviderResult: nil,
			selectProviderError:  errors.New("provider not found"),
			expectError:          true,
			expectedErrorMsg:     "failed to select provider",
			expectedInfoLogs:     1, // Only start log
			expectedDebugLogs:    0,
			expectedErrorLogs:    1, // Error log
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			logger := &MockLogger{}
			settingsService := &MockSettingsServiceApi{
				selectProviderResult: tt.selectProviderResult,
				selectProviderError:  tt.selectProviderError,
			}

			service := NewSettingsApi(logger, settingsService)

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
				if result != tt.selectProviderResult {
					t.Errorf("SelectProvider() result = %v, want %v", result, tt.selectProviderResult)
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
		name                string
		config              *settings.ProviderConfig
		modelsListResult    []string
		modelsListError     error
		expectError         bool
		expectedErrorMsg    string
		expectedInfoLogs    int
		expectedDebugLogs   int
		expectedErrorLogs   int
		expectedModelsCount int
	}{
		{
			name: "Successful models list retrieval",
			config: &settings.ProviderConfig{
				ProviderName:       "Ollama",
				ProviderType:       "ollama",
				BaseUrl:            "http://localhost:11434",
				ModelsEndpoint:     "/v1/models",
				CompletionEndpoint: "/v1/chat/completions",
			},
			modelsListResult:    []string{"llama2", "mistral", "phi"},
			modelsListError:     nil,
			expectError:         false,
			expectedInfoLogs:    2, // Start and success logs
			expectedDebugLogs:   0,
			expectedErrorLogs:   0,
			expectedModelsCount: 3,
		},
		{
			name:                "Nil config",
			config:              nil,
			modelsListResult:    []string{},
			modelsListError:     nil,
			expectError:         true,
			expectedErrorMsg:    "provider config cannot be nil",
			expectedInfoLogs:    1, // Only start log
			expectedDebugLogs:   2, // Constructor debug logs
			expectedErrorLogs:   1, // Error log
			expectedModelsCount: 0,
		},
		{
			name: "Models list retrieval error",
			config: &settings.ProviderConfig{
				ProviderName:       "Ollama",
				ProviderType:       "ollama",
				BaseUrl:            "http://localhost:11434",
				ModelsEndpoint:     "/v1/models",
				CompletionEndpoint: "/v1/chat/completions",
			},
			modelsListResult:    []string{},
			modelsListError:     errors.New("connection refused"),
			expectError:         true,
			expectedErrorMsg:    "failed to retrieve models",
			expectedInfoLogs:    1, // Only start log
			expectedDebugLogs:   0,
			expectedErrorLogs:   1, // Error log
			expectedModelsCount: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			logger := &MockLogger{}
			settingsService := &MockSettingsServiceApi{
				modelsListResult: tt.modelsListResult,
				modelsListError:  tt.modelsListError,
			}

			service := NewSettingsApi(logger, settingsService)

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
				if len(result) != tt.expectedModelsCount {
					t.Errorf("GetModelsList() result length = %d, want %d", len(result), tt.expectedModelsCount)
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
	tests := []struct {
		name              string
		settingsFilePath  string
		expectedInfoLogs  int
		expectedDebugLogs int
		expectedErrorLogs int
	}{
		{
			name:              "Successful settings file path retrieval",
			settingsFilePath:  "/path/to/settings.json",
			expectedInfoLogs:  0,
			expectedDebugLogs: 2, // Constructor + method debug logs
			expectedErrorLogs: 0,
		},
		{
			name:              "Empty settings file path",
			settingsFilePath:  "",
			expectedInfoLogs:  0,
			expectedDebugLogs: 2, // Constructor + method debug logs
			expectedErrorLogs: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			logger := &MockLogger{}
			settingsService := &MockSettingsServiceApi{
				settingsFilePath: tt.settingsFilePath,
			}

			service := NewSettingsApi(logger, settingsService)

			result := service.GetSettingsFilePath()

			// Verify successful result
			if result != tt.settingsFilePath {
				t.Errorf("GetSettingsFilePath() result = %s, want %s", result, tt.settingsFilePath)
			}

			// Verify debug logging occurred
			if len(logger.DebugMessages) != tt.expectedDebugLogs {
				t.Errorf("Expected %d debug logs, got %d: %v", tt.expectedDebugLogs, len(logger.DebugMessages), logger.DebugMessages)
			}
		})
	}
}

// Test SettingsApi interface implementation
func TestSettingsApiInterface(t *testing.T) {
	t.Run("Service should implement SettingsApi interface", func(t *testing.T) {
		logger := &MockLogger{}
		settingsService := &MockSettingsServiceApi{}

		service := NewSettingsApi(logger, settingsService)

		if service == nil {
			t.Fatal("NewSettingsApi returned nil")
		}

		var _ = service
	})
}

// Helper function to check if error message contains expected substring
func containsErrorMessage(actual, expected string) bool {
	return len(actual) >= len(expected) && (actual == expected || len(actual) > len(expected) && actual[:len(expected)] == expected || strings.Contains(actual, expected))
}
