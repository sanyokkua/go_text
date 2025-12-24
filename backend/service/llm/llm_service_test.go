package llm

import (
	"errors"
	"fmt"
	"go_text/backend/model"
	"go_text/backend/model/action"
	llm2 "go_text/backend/model/llm"
	"go_text/backend/model/settings"
	"strings"
	"testing"
)

// MockLogger for testing
type MockLogger struct {
	TraceMessages []string
	InfoMessages  []string
	DebugMessages []string
	ErrorMessages []string
}

func (m *MockLogger) Fatal(message string) {
	// Implement if needed
}

func (m *MockLogger) Error(message string) {
	m.ErrorMessages = append(m.ErrorMessages, message)
}

func (m *MockLogger) Warning(message string) {
	m.DebugMessages = append(m.DebugMessages, "[WARNING] "+message)
}

func (m *MockLogger) Info(message string) {
	m.InfoMessages = append(m.InfoMessages, message)
}

func (m *MockLogger) Debug(message string) {
	m.DebugMessages = append(m.DebugMessages, message)
}

func (m *MockLogger) Trace(message string) {
	m.TraceMessages = append(m.TraceMessages, message)
}

func (m *MockLogger) Print(message string) {
	// Implement if needed
}

func (m *MockLogger) LogInfo(msg string, keysAndValues ...interface{}) {
	m.InfoMessages = append(m.InfoMessages, fmt.Sprintf(msg, keysAndValues...))
}

func (m *MockLogger) LogDebug(msg string, keysAndValues ...interface{}) {
	m.DebugMessages = append(m.DebugMessages, fmt.Sprintf(msg, keysAndValues...))
}

func (m *MockLogger) LogWarn(msg string, keysAndValues ...interface{}) {
	// Not used in current implementation
}

func (m *MockLogger) LogError(msg string, keysAndValues ...interface{}) {
	m.ErrorMessages = append(m.ErrorMessages, fmt.Sprintf(msg, keysAndValues...))
}

func (m *MockLogger) Clear() {
	m.InfoMessages = nil
	m.DebugMessages = nil
	m.ErrorMessages = nil
}

// MockLlmHttpApi for testing
type MockLlmHttpApi struct {
	ModelListResponse  *llm2.LlmModelListResponse
	ModelListError     error
	CompletionResponse *llm2.ChatCompletionResponse
	CompletionError    error
}

func (m *MockLlmHttpApi) ModelListRequest(baseUrl, endpoint string, headers map[string]string) (*llm2.LlmModelListResponse, error) {
	return m.ModelListResponse, m.ModelListError
}

func (m *MockLlmHttpApi) CompletionRequest(baseUrl, endpoint string, headers map[string]string, request *llm2.ChatCompletionRequest) (*llm2.ChatCompletionResponse, error) {
	return m.CompletionResponse, m.CompletionError
}

// MockSettingsService for testing
type MockSettingsService struct {
	CurrentSettings *settings.Settings
	SettingsError   error
}

func (m *MockSettingsService) GetCurrentSettings() (*settings.Settings, error) {
	return m.CurrentSettings, m.SettingsError
}

func (m *MockSettingsService) GetProviderTypes() ([]string, error) {
	return []string{}, nil // Not used in tests
}

func (m *MockSettingsService) GetDefaultSettings() (*settings.Settings, error) {
	return &settings.Settings{}, nil // Not used in tests
}

func (m *MockSettingsService) SaveSettings(settings *settings.Settings) (*settings.Settings, error) {
	return settings, nil // Not used in tests
}

func (m *MockSettingsService) ValidateProvider(config *settings.ProviderConfig, validateHttpCall bool, modelName string) (bool, error) {
	return true, nil // Not used in tests
}

func (m *MockSettingsService) CreateNewProvider(config *settings.ProviderConfig, modelName string) (*settings.ProviderConfig, error) {
	return config, nil // Not used in tests
}

func (m *MockSettingsService) UpdateProvider(config *settings.ProviderConfig) (*settings.ProviderConfig, error) {
	return config, nil // Not used in tests
}

func (m *MockSettingsService) DeleteProvider(config *settings.ProviderConfig) (bool, error) {
	return true, nil // Not used in tests
}

func (m *MockSettingsService) GetModelsList(config *settings.ProviderConfig) ([]string, error) {
	return []string{}, nil // Not used in tests
}

func (m *MockSettingsService) GetSettingsFilePath() string {
	return "" // Not used in tests
}

func (m *MockSettingsService) ValidateSettings(settings *settings.Settings) error {
	return nil // Not used in tests
}

func (m *MockSettingsService) ValidateBaseUrl(baseUrl string) (bool, error) {
	return true, nil // Not used in tests
}

func (m *MockSettingsService) ValidateEndpoint(endpoint string) (bool, error) {
	return true, nil // Not used in tests
}

func (m *MockSettingsService) ValidateTemperature(temperature float64) (bool, error) {
	return true, nil // Not used in tests
}

func (m *MockSettingsService) SelectProvider(config *settings.ProviderConfig) (*settings.ProviderConfig, error) {
	return config, nil // Not used in tests
}

// MockMapper for testing
type MockMapper struct {
	ModelNames []string
}

func (m *MockMapper) MapModelNames(response *llm2.LlmModelListResponse) []string {
	return m.ModelNames
}

func (m *MockMapper) MapLanguageToLanguageItem(language string) model.LanguageItem {
	return model.LanguageItem{
		LanguageId:   language,
		LanguageText: language,
	}
}

func (m *MockMapper) MapLanguagesToLanguageItems(languages []string) []model.LanguageItem {
	var items = make([]model.LanguageItem, 0)
	for _, lang := range languages {
		items = append(items, m.MapLanguageToLanguageItem(lang))
	}
	return items
}

func (m *MockMapper) MapPromptsToActionItems(prompts []model.Prompt) []action.Action {
	var items = make([]action.Action, 0)
	for _, prompt := range prompts {
		if prompt.ID != "" && prompt.Name != "" {
			items = append(items, action.Action{
				ID:   prompt.ID,
				Text: prompt.Name,
			})
		}
	}
	return items
}

// TestGetModelsList tests the GetModelsList method
func TestGetModelsList(t *testing.T) {
	tests := []struct {
		name              string
		settings          *settings.Settings
		settingsError     error
		modelListResponse *llm2.LlmModelListResponse
		modelListError    error
		mappedModelNames  []string
		expectError       bool
		expectedErrorMsg  string
	}{
		{
			name: "Successful model list retrieval",
			settings: &settings.Settings{
				CurrentProviderConfig: settings.ProviderConfig{
					BaseUrl:        "http://localhost:11434",
					ModelsEndpoint: "/v1/models",
					Headers:        map[string]string{},
				},
			},
			settingsError: nil,
			modelListResponse: &llm2.LlmModelListResponse{
				Data: []llm2.LlmModel{
					{ID: "model1"},
					{ID: "model2"},
					{ID: "model3"},
				},
			},
			modelListError:   nil,
			mappedModelNames: []string{"model1", "model2", "model3"},
			expectError:      false,
		},
		{
			name:              "Settings service error",
			settings:          nil,
			settingsError:     errors.New("settings unavailable"),
			modelListResponse: nil,
			modelListError:    nil,
			mappedModelNames:  nil,
			expectError:       true,
			expectedErrorMsg:  "failed to retrieve application settings",
		},
		{
			name: "HTTP API error",
			settings: &settings.Settings{
				CurrentProviderConfig: settings.ProviderConfig{
					BaseUrl:        "http://localhost:11434",
					ModelsEndpoint: "/v1/models",
					Headers:        map[string]string{},
				},
			},
			settingsError:     nil,
			modelListResponse: nil,
			modelListError:    errors.New("connection failed"),
			mappedModelNames:  nil,
			expectError:       true,
			expectedErrorMsg:  "failed to retrieve model list from provider",
		},
		{
			name: "Empty model list",
			settings: &settings.Settings{
				CurrentProviderConfig: settings.ProviderConfig{
					BaseUrl:        "http://localhost:11434",
					ModelsEndpoint: "/v1/models",
					Headers:        map[string]string{},
				},
			},
			settingsError: nil,
			modelListResponse: &llm2.LlmModelListResponse{
				Data: []llm2.LlmModel{},
			},
			modelListError:   nil,
			mappedModelNames: []string{},
			expectError:      false,
		},
		{
			name: "Models with blank IDs filtered by mapper",
			settings: &settings.Settings{
				CurrentProviderConfig: settings.ProviderConfig{
					BaseUrl:        "http://localhost:11434",
					ModelsEndpoint: "/v1/models",
					Headers:        map[string]string{},
				},
			},
			settingsError: nil,
			modelListResponse: &llm2.LlmModelListResponse{
				Data: []llm2.LlmModel{
					{ID: "model1"},
					{ID: ""},
					{ID: "model2"},
				},
			},
			modelListError:   nil,
			mappedModelNames: []string{"model1", "model2"},
			expectError:      false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			logger := &MockLogger{}
			llmHttpApi := &MockLlmHttpApi{
				ModelListResponse: tt.modelListResponse,
				ModelListError:    tt.modelListError,
			}
			settingsService := &MockSettingsService{
				CurrentSettings: tt.settings,
				SettingsError:   tt.settingsError,
			}
			mapper := &MockMapper{
				ModelNames: tt.mappedModelNames,
			}

			service := NewLlmApiService(logger, llmHttpApi, settingsService, mapper)
			result, err := service.GetModelsList()

			if (err != nil) != tt.expectError {
				t.Errorf("GetModelsList() error = %v, expectError %v", err, tt.expectError)
				return
			}

			if tt.expectError {
				if err != nil && !strings.Contains(err.Error(), tt.expectedErrorMsg) {
					t.Errorf("GetModelsList() error = %v, expected to contain %s", err, tt.expectedErrorMsg)
				}
				// Verify error logging
				if len(logger.ErrorMessages) == 0 {
					t.Error("Expected error logging to occur")
				}
			} else {
				if len(result) != len(tt.mappedModelNames) {
					t.Errorf("GetModelsList() result length = %d, want %d", len(result), len(tt.mappedModelNames))
				}

				for i, model := range result {
					if model != tt.mappedModelNames[i] {
						t.Errorf("GetModelsList() model %d = %s, want %s", i, model, tt.mappedModelNames[i])
					}
				}

				// Verify info logging
				if len(logger.InfoMessages) == 0 {
					t.Error("Expected info logging to occur")
				}

				// Verify trace logging
				if len(logger.TraceMessages) == 0 {
					t.Error("Expected trace logging to occur")
				}
			}
		})
	}
}

// TestGetCompletionResponse tests the GetCompletionResponse method
func TestGetCompletionResponse(t *testing.T) {
	tests := []struct {
		name               string
		settings           *settings.Settings
		settingsError      error
		completionResponse *llm2.ChatCompletionResponse
		completionError    error
		request            *llm2.ChatCompletionRequest
		expectError        bool
		expectedErrorMsg   string
		expectedResult     string
	}{
		{
			name: "Successful completion",
			settings: &settings.Settings{
				CurrentProviderConfig: settings.ProviderConfig{
					BaseUrl:            "http://localhost:11434",
					CompletionEndpoint: "/v1/chat/completions",
					Headers:            map[string]string{},
				},
			},
			settingsError: nil,
			completionResponse: &llm2.ChatCompletionResponse{
				Choices: []llm2.Choice{
					{
						Message: llm2.Message{
							Content: "Hello, world!",
						},
					},
				},
			},
			completionError: nil,
			request: &llm2.ChatCompletionRequest{
				Messages: []llm2.Message{
					{Role: "user", Content: "Hello"},
				},
			},
			expectError:    false,
			expectedResult: "Hello, world!",
		},
		{
			name:               "Settings service error",
			settings:           nil,
			settingsError:      errors.New("settings unavailable"),
			completionResponse: nil,
			completionError:    nil,
			request: &llm2.ChatCompletionRequest{
				Messages: []llm2.Message{
					{Role: "user", Content: "Hello"},
				},
			},
			expectError:      true,
			expectedErrorMsg: "failed to retrieve application settings",
		},
		{
			name: "HTTP API error",
			settings: &settings.Settings{
				CurrentProviderConfig: settings.ProviderConfig{
					BaseUrl:            "http://localhost:11434",
					CompletionEndpoint: "/v1/chat/completions",
					Headers:            map[string]string{},
				},
			},
			settingsError:      nil,
			completionResponse: nil,
			completionError:    errors.New("connection failed"),
			request: &llm2.ChatCompletionRequest{
				Messages: []llm2.Message{
					{Role: "user", Content: "Hello"},
				},
			},
			expectError:      true,
			expectedErrorMsg: "chat completion request failed",
		},
		{
			name: "Empty choices in response",
			settings: &settings.Settings{
				CurrentProviderConfig: settings.ProviderConfig{
					BaseUrl:            "http://localhost:11434",
					CompletionEndpoint: "/v1/chat/completions",
					Headers:            map[string]string{},
				},
			},
			settingsError: nil,
			completionResponse: &llm2.ChatCompletionResponse{
				Choices: []llm2.Choice{},
			},
			completionError: nil,
			request: &llm2.ChatCompletionRequest{
				Messages: []llm2.Message{
					{Role: "user", Content: "Hello"},
				},
			},
			expectError:      true,
			expectedErrorMsg: "no choices returned in the completion response",
		},
		{
			name: "Long response",
			settings: &settings.Settings{
				CurrentProviderConfig: settings.ProviderConfig{
					BaseUrl:            "http://localhost:11434",
					CompletionEndpoint: "/v1/chat/completions",
					Headers:            map[string]string{},
				},
			},
			settingsError: nil,
			completionResponse: &llm2.ChatCompletionResponse{
				Choices: []llm2.Choice{
					{
						Message: llm2.Message{
							Content: "This is a very long response with multiple sentences and paragraphs. " +
								"It contains a lot of text to test how the service handles larger responses. " +
								"The response should be processed correctly and returned in full.",
						},
					},
				},
			},
			completionError: nil,
			request: &llm2.ChatCompletionRequest{
				Messages: []llm2.Message{
					{Role: "user", Content: "Generate long text"},
				},
			},
			expectError: false,
			expectedResult: "This is a very long response with multiple sentences and paragraphs. " +
				"It contains a lot of text to test how the service handles larger responses. " +
				"The response should be processed correctly and returned in full.",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			logger := &MockLogger{}
			llmHttpApi := &MockLlmHttpApi{
				CompletionResponse: tt.completionResponse,
				CompletionError:    tt.completionError,
			}
			settingsService := &MockSettingsService{
				CurrentSettings: tt.settings,
				SettingsError:   tt.settingsError,
			}
			mapper := &MockMapper{}

			service := NewLlmApiService(logger, llmHttpApi, settingsService, mapper)
			result, err := service.GetCompletionResponse(tt.request)

			if (err != nil) != tt.expectError {
				t.Errorf("GetCompletionResponse() error = %v, expectError %v", err, tt.expectError)
				return
			}

			if tt.expectError {
				if err != nil && !strings.Contains(err.Error(), tt.expectedErrorMsg) {
					t.Errorf("GetCompletionResponse() error = %v, expected to contain %s", err, tt.expectedErrorMsg)
				}
				// Verify error logging
				if len(logger.ErrorMessages) == 0 {
					t.Error("Expected error logging to occur")
				}
			} else {
				if result != tt.expectedResult {
					t.Errorf("GetCompletionResponse() result = %s, want %s", result, tt.expectedResult)
				}

				// Verify info logging
				if len(logger.InfoMessages) == 0 {
					t.Error("Expected info logging to occur")
				}

				// Verify trace logging
				if len(logger.TraceMessages) == 0 {
					t.Error("Expected trace logging to occur")
				}
			}
		})
	}
}

// TestLlmServiceInterface tests that the service implements the interface correctly
func TestLlmServiceInterface(t *testing.T) {
	t.Run("Service should implement LlmApi interface", func(t *testing.T) {
		logger := &MockLogger{}
		llmHttpApi := &MockLlmHttpApi{}
		settingsService := &MockSettingsService{}
		mapper := &MockMapper{}

		service := NewLlmApiService(logger, llmHttpApi, settingsService, mapper)

		if service == nil {
			t.Fatal("NewLlmApiService returned nil")
		}

		var _ = service
	})
}
