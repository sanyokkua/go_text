package completion

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

// MockStringUtils for testing
type MockStringUtils struct {
	isBlankStringResult bool
	sanitizeResult      string
	sanitizeError       error
	buildPromptResult   string
	buildPromptError    error
}

func (m *MockStringUtils) IsBlankString(value string) bool {
	if m.isBlankStringResult {
		return true
	}
	return strings.TrimSpace(value) == ""
}

func (m *MockStringUtils) SanitizeReasoningBlock(llmResponse string) (string, error) {
	return m.sanitizeResult, m.sanitizeError
}

func (m *MockStringUtils) BuildPrompt(promptTemplate, category string, actionRequest *action.ActionRequest, useMarkdown bool) (string, error) {
	return m.buildPromptResult, m.buildPromptError
}

func (m *MockStringUtils) ReplaceTemplateParameter(template, value, prompt string) (string, error) {
	return prompt, nil // Simple implementation for testing
}

// MockPromptService for testing
type MockPromptService struct {
	promptResult       *model.Prompt
	promptError        error
	systemPromptResult string
	systemPromptError  error
	buildPromptResult  string
	buildPromptError   error
	appPromptsResult   *model.AppPrompts
}

func (m *MockPromptService) GetAppPrompts() *model.AppPrompts {
	return m.appPromptsResult
}

func (m *MockPromptService) GetPrompt(promptID string) (model.Prompt, error) {
	if m.promptResult != nil {
		return *m.promptResult, m.promptError
	}
	return model.Prompt{}, m.promptError
}

func (m *MockPromptService) GetPromptsCategories() []string {
	return []string{constant.PromptCategoryTranslation, constant.PromptCategoryProofread}
}

func (m *MockPromptService) GetUserPromptsForCategory(category string) ([]model.Prompt, error) {
	return []model.Prompt{}, nil
}

func (m *MockPromptService) GetSystemPrompt(category string) (string, error) {
	return m.systemPromptResult, m.systemPromptError
}

func (m *MockPromptService) BuildPrompt(promptTemplate, category string, actionRequest *action.ActionRequest, useMarkdown bool) (string, error) {
	return m.buildPromptResult, m.buildPromptError
}

// MockSettingsService for testing
type MockSettingsService struct {
	settingsResult *settings.Settings
	settingsError  error
}

func (m *MockSettingsService) GetCurrentSettings() (*settings.Settings, error) {
	return m.settingsResult, m.settingsError
}

func (m *MockSettingsService) GetProviderTypes() ([]string, error) {
	return []string{}, nil
}

func (m *MockSettingsService) GetDefaultSettings() (*settings.Settings, error) {
	return &settings.Settings{}, nil
}

func (m *MockSettingsService) SaveSettings(settings *settings.Settings) (*settings.Settings, error) {
	return settings, nil
}

func (m *MockSettingsService) ValidateProvider(config *settings.ProviderConfig) (bool, error) {
	return true, nil
}

func (m *MockSettingsService) CreateNewProvider(config *settings.ProviderConfig) (*settings.ProviderConfig, error) {
	return config, nil
}

func (m *MockSettingsService) UpdateProvider(config *settings.ProviderConfig) (*settings.ProviderConfig, error) {
	return config, nil
}

func (m *MockSettingsService) DeleteProvider(config *settings.ProviderConfig) (bool, error) {
	return true, nil
}

func (m *MockSettingsService) GetModelsList(config *settings.ProviderConfig) ([]string, error) {
	return []string{}, nil
}

func (m *MockSettingsService) GetSettingsFilePath() string {
	return ""
}

func (m *MockSettingsService) ValidateSettings(settings *settings.Settings) error {
	return nil
}

func (m *MockSettingsService) ValidateBaseUrl(baseUrl string) (bool, error) {
	return true, nil
}

func (m *MockSettingsService) ValidateEndpoint(endpoint string) (bool, error) {
	return true, nil
}

func (m *MockSettingsService) ValidateTemperature(temperature float64) (bool, error) {
	return true, nil
}

func (m *MockSettingsService) SelectProvider(config *settings.ProviderConfig) (*settings.ProviderConfig, error) {
	return config, nil
}

// MockLlmService for testing
type MockLlmService struct {
	modelsListResult []string
	modelsListError  error
	completionResult string
	completionError  error
}

func (m *MockLlmService) GetModelsList() ([]string, error) {
	return m.modelsListResult, m.modelsListError
}

func (m *MockLlmService) GetCompletionResponse(request *llm.ChatCompletionRequest) (string, error) {
	return m.completionResult, m.completionError
}

// Test ProcessAction
func TestProcessAction(t *testing.T) {
	tests := []struct {
		name                string
		actionRequest       action.ActionRequest
		mockStringUtils     MockStringUtils
		mockPromptService   MockPromptService
		mockSettingsService MockSettingsService
		mockLlmService      MockLlmService
		expectedResult      string
		expectError         bool
		expectedErrorMsg    string
		expectedInfoLogs    int
		expectedDebugLogs   int
		expectedErrorLogs   int
		expectedWarnLogs    int
	}{
		{
			name: "Successful action processing",
			actionRequest: action.ActionRequest{
				ID:               "test-action",
				InputText:        "Test input",
				InputLanguageID:  "en",
				OutputLanguageID: "fr",
			},
			mockStringUtils: MockStringUtils{
				isBlankStringResult: false,
				sanitizeResult:      "Cleaned result",
				buildPromptResult:   "Built prompt",
			},
			mockPromptService: MockPromptService{
				promptResult: &model.Prompt{
					ID:       "test-action",
					Name:     "Test Action",
					Category: constant.PromptCategoryTranslation,
					Value:    "{{user_text}}",
				},
				systemPromptResult: "You are a helpful assistant",
			},
			mockSettingsService: MockSettingsService{
				settingsResult: &settings.Settings{
					AvailableProviderConfigs: []settings.ProviderConfig{
						{
							ProviderName:       "Test Provider",
							ProviderType:       settings.ProviderTypeCustom,
							BaseUrl:            "http://localhost:11434",
							ModelsEndpoint:     "/v1/models",
							CompletionEndpoint: "/v1/chat/completions",
							Headers:            map[string]string{},
						},
					},
					CurrentProviderConfig: settings.ProviderConfig{
						ProviderName:       "Test Provider",
						ProviderType:       settings.ProviderTypeCustom,
						BaseUrl:            "http://localhost:11434",
						ModelsEndpoint:     "/v1/models",
						CompletionEndpoint: "/v1/chat/completions",
						Headers:            map[string]string{},
					},
					ModelConfig: settings.LlmModelConfig{
						ModelName:            "test-model",
						IsTemperatureEnabled: true,
						Temperature:          0.5,
					},
					LanguageConfig: settings.LanguageConfig{
						Languages:             []string{"English", "French"},
						DefaultInputLanguage:  "English",
						DefaultOutputLanguage: "French",
					},
					UseMarkdownForOutput: false,
				},
			},
			mockLlmService: MockLlmService{
				modelsListResult: []string{"test-model", "other-model"},
				completionResult: "Raw LLM response with <think>thoughts</think>",
			},
			expectedResult:    "Cleaned result",
			expectError:       false,
			expectedInfoLogs:  4, // Start, settings loaded, LLM success, completion logs
			expectedDebugLogs: 3, // Prompt retrieved, system prompt retrieved, user prompt built
			expectedErrorLogs: 0,
			expectedWarnLogs:  0,
		},
		{
			name: "Empty action ID",
			actionRequest: action.ActionRequest{
				ID: "",
			},
			mockStringUtils: MockStringUtils{
				isBlankStringResult: true,
			},
			mockPromptService:   MockPromptService{},
			mockSettingsService: MockSettingsService{},
			mockLlmService:      MockLlmService{},
			expectedResult:      "",
			expectError:         true,
			expectedErrorMsg:    "action id is blank",
			expectedInfoLogs:    1, // Only start log
			expectedDebugLogs:   0,
			expectedErrorLogs:   1, // Error log
			expectedWarnLogs:    0,
		},
		{
			name: "Prompt service error",
			actionRequest: action.ActionRequest{
				ID: "test-action",
			},
			mockStringUtils: MockStringUtils{
				isBlankStringResult: false,
			},
			mockPromptService: MockPromptService{
				promptError: errors.New("prompt not found"),
			},
			mockSettingsService: MockSettingsService{},
			mockLlmService:      MockLlmService{},
			expectedResult:      "",
			expectError:         true,
			expectedErrorMsg:    "failed to GetPrompt",
			expectedInfoLogs:    1, // Only start log
			expectedDebugLogs:   0,
			expectedErrorLogs:   1, // Error log
			expectedWarnLogs:    0,
		},
		{
			name: "System prompt error",
			actionRequest: action.ActionRequest{
				ID: "test-action",
			},
			mockStringUtils: MockStringUtils{
				isBlankStringResult: false,
			},
			mockPromptService: MockPromptService{
				promptResult: &model.Prompt{
					ID:       "test-action",
					Name:     "Test Action",
					Category: constant.PromptCategoryTranslation,
					Value:    "{{user_text}}",
				},
				systemPromptError: errors.New("system prompt failed"),
			},
			mockSettingsService: MockSettingsService{},
			mockLlmService:      MockLlmService{},
			expectedResult:      "",
			expectError:         true,
			expectedErrorMsg:    "failed to GetSystemPrompt",
			expectedInfoLogs:    1, // Only start log
			expectedDebugLogs:   1, // Prompt retrieved debug log
			expectedErrorLogs:   1, // Error log
			expectedWarnLogs:    0,
		},
		{
			name: "Settings service error",
			actionRequest: action.ActionRequest{
				ID: "test-action",
			},
			mockStringUtils: MockStringUtils{
				isBlankStringResult: false,
			},
			mockPromptService: MockPromptService{
				promptResult: &model.Prompt{
					ID:       "test-action",
					Name:     "Test Action",
					Category: constant.PromptCategoryTranslation,
					Value:    "{{user_text}}",
				},
				systemPromptResult: "You are a helpful assistant",
			},
			mockSettingsService: MockSettingsService{
				settingsError: errors.New("settings unavailable"),
			},
			mockLlmService:    MockLlmService{},
			expectedResult:    "",
			expectError:       true,
			expectedErrorMsg:  "failed to load settings",
			expectedInfoLogs:  1, // Only start log
			expectedDebugLogs: 2, // Prompt retrieved and system prompt debug logs
			expectedErrorLogs: 1, // Error log
			expectedWarnLogs:  0,
		},
		{
			name: "Empty base URL configuration",
			actionRequest: action.ActionRequest{
				ID:               "test-action",
				InputText:        "Test input",
				InputLanguageID:  "en",
				OutputLanguageID: "fr", // Different languages to avoid same-language optimization
			},
			mockStringUtils: MockStringUtils{
				isBlankStringResult: false,
				buildPromptResult:   "Built prompt",
			},
			mockPromptService: MockPromptService{
				promptResult: &model.Prompt{
					ID:       "test-action",
					Name:     "Test Action",
					Category: constant.PromptCategoryTranslation,
					Value:    "{{user_text}}",
				},
				systemPromptResult: "You are a helpful assistant",
			},
			mockSettingsService: MockSettingsService{
				settingsResult: &settings.Settings{
					CurrentProviderConfig: settings.ProviderConfig{
						BaseUrl:      "",              // Empty base URL
						ProviderName: "Test Provider", // Need to set provider name
					},
				},
			},
			mockLlmService:    MockLlmService{},
			expectedResult:    "",
			expectError:       true,
			expectedErrorMsg:  "provider BaseURL is not configured properly",
			expectedInfoLogs:  2, // Start and settings loaded logs
			expectedDebugLogs: 3, // Prompt, system prompt, and user prompt debug logs
			expectedErrorLogs: 1, // Error log
			expectedWarnLogs:  0,
		},
		{
			name: "Empty completion endpoint configuration",
			actionRequest: action.ActionRequest{
				ID:               "test-action",
				InputText:        "Test input",
				InputLanguageID:  "en",
				OutputLanguageID: "fr", // Different languages to avoid same-language optimization
			},
			mockStringUtils: MockStringUtils{
				isBlankStringResult: false,
				buildPromptResult:   "Built prompt",
			},
			mockPromptService: MockPromptService{
				promptResult: &model.Prompt{
					ID:       "test-action",
					Name:     "Test Action",
					Category: constant.PromptCategoryTranslation,
					Value:    "{{user_text}}",
				},
				systemPromptResult: "You are a helpful assistant",
			},
			mockSettingsService: MockSettingsService{
				settingsResult: &settings.Settings{
					CurrentProviderConfig: settings.ProviderConfig{
						BaseUrl:            "http://localhost:11434",
						CompletionEndpoint: "",              // Empty completion endpoint
						ProviderName:       "Test Provider", // Need to set provider name
					},
				},
			},
			mockLlmService:    MockLlmService{},
			expectedResult:    "",
			expectError:       true,
			expectedErrorMsg:  "provider completion endpoint is not configured properly",
			expectedInfoLogs:  2, // Start and settings loaded logs
			expectedDebugLogs: 3, // Prompt, system prompt, and user prompt debug logs
			expectedErrorLogs: 1, // Error log
			expectedWarnLogs:  0,
		},
		{
			name: "Empty model name configuration",
			actionRequest: action.ActionRequest{
				ID:               "test-action",
				InputText:        "Test input",
				InputLanguageID:  "en",
				OutputLanguageID: "fr", // Different languages to avoid same-language optimization
			},
			mockStringUtils: MockStringUtils{
				isBlankStringResult: false,
				buildPromptResult:   "Built prompt",
			},
			mockPromptService: MockPromptService{
				promptResult: &model.Prompt{
					ID:       "test-action",
					Name:     "Test Action",
					Category: constant.PromptCategoryTranslation,
					Value:    "{{user_text}}",
				},
				systemPromptResult: "You are a helpful assistant",
			},
			mockSettingsService: MockSettingsService{
				settingsResult: &settings.Settings{
					CurrentProviderConfig: settings.ProviderConfig{
						BaseUrl:            "http://localhost:11434",
						CompletionEndpoint: "/v1/chat/completions",
						ProviderName:       "Test Provider", // Need to set provider name
					},
					ModelConfig: settings.LlmModelConfig{
						ModelName: "", // Empty model name
					},
				},
			},
			mockLlmService:    MockLlmService{},
			expectedResult:    "",
			expectError:       true,
			expectedErrorMsg:  "model is not configured properly",
			expectedInfoLogs:  2, // Start and settings loaded logs
			expectedDebugLogs: 3, // Prompt, system prompt, and user prompt debug logs
			expectedErrorLogs: 1, // Error log
			expectedWarnLogs:  0,
		},
		{
			name: "LLM service models list error",
			actionRequest: action.ActionRequest{
				ID: "test-action",
			},
			mockStringUtils: MockStringUtils{
				isBlankStringResult: false,
				buildPromptResult:   "Built prompt",
			},
			mockPromptService: MockPromptService{
				promptResult: &model.Prompt{
					ID:       "test-action",
					Name:     "Test Action",
					Category: constant.PromptCategoryTranslation,
					Value:    "{{user_text}}",
				},
				systemPromptResult: "You are a helpful assistant",
			},
			mockSettingsService: MockSettingsService{
				settingsResult: &settings.Settings{
					CurrentProviderConfig: settings.ProviderConfig{
						BaseUrl:            "http://localhost:11434",
						CompletionEndpoint: "/v1/chat/completions",
						ProviderName:       "Test Provider",
					},
					ModelConfig: settings.LlmModelConfig{
						ModelName: "test-model",
					},
				},
			},
			mockLlmService: MockLlmService{
				modelsListError: errors.New("failed to fetch models"),
			},
			expectedResult:    "",
			expectError:       true,
			expectedErrorMsg:  "failed to load models",
			expectedInfoLogs:  2, // Start and settings loaded logs
			expectedDebugLogs: 3, // Prompt, system prompt, and user prompt debug logs
			expectedErrorLogs: 1, // Error log
			expectedWarnLogs:  0,
		},
		{
			name: "Model not found in provider",
			actionRequest: action.ActionRequest{
				ID:               "test-action",
				InputText:        "Test input",
				InputLanguageID:  "en",
				OutputLanguageID: "fr", // Different languages to avoid same-language optimization
			},
			mockStringUtils: MockStringUtils{
				isBlankStringResult: false,
				buildPromptResult:   "Built prompt",
				sanitizeResult:      "Cleaned result",
			},
			mockPromptService: MockPromptService{
				promptResult: &model.Prompt{
					ID:       "test-action",
					Name:     "Test Action",
					Category: constant.PromptCategoryTranslation,
					Value:    "{{user_text}}",
				},
				systemPromptResult: "You are a helpful assistant",
			},
			mockSettingsService: MockSettingsService{
				settingsResult: &settings.Settings{
					CurrentProviderConfig: settings.ProviderConfig{
						BaseUrl:            "http://localhost:11434",
						CompletionEndpoint: "/v1/chat/completions",
						ProviderName:       "Test Provider",
					},
					ModelConfig: settings.LlmModelConfig{
						ModelName: "missing-model",
					},
				},
			},
			mockLlmService: MockLlmService{
				modelsListResult: []string{"model1", "model2"}, // Missing the configured model
				completionResult: "Raw LLM response",
			},
			expectedResult:    "Cleaned result",
			expectError:       false, // Should not fail, just log warning
			expectedInfoLogs:  4,     // Start, settings loaded, LLM success, completion logs
			expectedDebugLogs: 3,     // Prompt, system prompt, and user prompt debug logs
			expectedErrorLogs: 0,
			expectedWarnLogs:  1, // Warning about model not found
		},
		{
			name: "Prompt build error",
			actionRequest: action.ActionRequest{
				ID:               "test-action",
				InputText:        "Test input",
				InputLanguageID:  "en",
				OutputLanguageID: "fr",
			},
			mockStringUtils: MockStringUtils{
				isBlankStringResult: false,
			},
			mockPromptService: MockPromptService{
				promptResult: &model.Prompt{
					ID:       "test-action",
					Name:     "Test Action",
					Category: constant.PromptCategoryTranslation,
					Value:    "{{user_text}}",
				},
				systemPromptResult: "You are a helpful assistant",
				buildPromptError:   errors.New("prompt build failed"),
			},
			mockSettingsService: MockSettingsService{
				settingsResult: &settings.Settings{
					CurrentProviderConfig: settings.ProviderConfig{
						BaseUrl:            "http://localhost:11434",
						CompletionEndpoint: "/v1/chat/completions",
						ProviderName:       "Test Provider",
					},
					ModelConfig: settings.LlmModelConfig{
						ModelName: "test-model",
					},
				},
			},
			mockLlmService: MockLlmService{
				modelsListResult: []string{"test-model"},
			},
			expectedResult:    "",
			expectError:       true,
			expectedErrorMsg:  "prompt build failed", // Returns the error directly
			expectedInfoLogs:  2,                     // Start and settings loaded logs
			expectedDebugLogs: 3,                     // Prompt, system prompt, and user prompt debug logs
			expectedErrorLogs: 1,                     // Error log
			expectedWarnLogs:  0,
		},
		{
			name: "Same language translation optimization",
			actionRequest: action.ActionRequest{
				ID:               "test-action",
				InputText:        "Hello",
				InputLanguageID:  "en",
				OutputLanguageID: "en", // Same language
			},
			mockStringUtils: MockStringUtils{
				isBlankStringResult: false,
			},
			mockPromptService: MockPromptService{
				promptResult: &model.Prompt{
					ID:       "test-action",
					Name:     "Test Action",
					Category: constant.PromptCategoryTranslation,
					Value:    "{{user_text}}",
				},
				systemPromptResult: "You are a helpful assistant",
			},
			mockSettingsService: MockSettingsService{
				settingsResult: &settings.Settings{
					CurrentProviderConfig: settings.ProviderConfig{
						BaseUrl:            "http://localhost:11434",
						CompletionEndpoint: "/v1/chat/completions",
					},
					ModelConfig: settings.LlmModelConfig{
						ModelName: "test-model",
					},
				},
			},
			mockLlmService: MockLlmService{
				modelsListResult: []string{"test-model"},
			},
			expectedResult:    "Hello", // Should return input text directly
			expectError:       false,
			expectedInfoLogs:  3, // Start, settings loaded, and optimization logs
			expectedDebugLogs: 3, // Prompt, system prompt, and user prompt debug logs
			expectedErrorLogs: 0,
			expectedWarnLogs:  0,
		},
		{
			name: "LLM completion error",
			actionRequest: action.ActionRequest{
				ID: "test-action",
			},
			mockStringUtils: MockStringUtils{
				isBlankStringResult: false,
				buildPromptResult:   "Built prompt",
			},
			mockPromptService: MockPromptService{
				promptResult: &model.Prompt{
					ID:       "test-action",
					Name:     "Test Action",
					Category: constant.PromptCategoryProofread,
					Value:    "{{user_text}}",
				},
				systemPromptResult: "You are a helpful assistant",
			},
			mockSettingsService: MockSettingsService{
				settingsResult: &settings.Settings{
					CurrentProviderConfig: settings.ProviderConfig{
						BaseUrl:            "http://localhost:11434",
						CompletionEndpoint: "/v1/chat/completions",
					},
					ModelConfig: settings.LlmModelConfig{
						ModelName: "test-model",
					},
				},
			},
			mockLlmService: MockLlmService{
				modelsListResult: []string{"test-model"},
				completionError:  errors.New("LLM request failed"),
			},
			expectedResult:    "",
			expectError:       true,
			expectedErrorMsg:  "failed to get completion result",
			expectedInfoLogs:  3, // Start, settings loaded, and LLM completion logs
			expectedDebugLogs: 4, // Prompt, system prompt, user prompt, and LLM request debug logs
			expectedErrorLogs: 1, // Error log
			expectedWarnLogs:  0,
		},
		{
			name: "Sanitize error",
			actionRequest: action.ActionRequest{
				ID: "test-action",
			},
			mockStringUtils: MockStringUtils{
				isBlankStringResult: false,
				buildPromptResult:   "Built prompt",
				sanitizeError:       errors.New("sanitize failed"),
			},
			mockPromptService: MockPromptService{
				promptResult: &model.Prompt{
					ID:       "test-action",
					Name:     "Test Action",
					Category: constant.PromptCategoryProofread,
					Value:    "{{user_text}}",
				},
				systemPromptResult: "You are a helpful assistant",
			},
			mockSettingsService: MockSettingsService{
				settingsResult: &settings.Settings{
					CurrentProviderConfig: settings.ProviderConfig{
						BaseUrl:            "http://localhost:11434",
						CompletionEndpoint: "/v1/chat/completions",
					},
					ModelConfig: settings.LlmModelConfig{
						ModelName: "test-model",
					},
				},
			},
			mockLlmService: MockLlmService{
				modelsListResult: []string{"test-model"},
				completionResult: "Raw response",
			},
			expectedResult:    "",
			expectError:       true,
			expectedErrorMsg:  "SanitizeResponse",
			expectedInfoLogs:  3, // Start, settings loaded, and LLM completion logs
			expectedDebugLogs: 4, // Prompt, system prompt, user prompt, and LLM request debug logs
			expectedErrorLogs: 1, // Error log
			expectedWarnLogs:  0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			logger := &MockLogger{}
			service := NewCompletionApiService(
				logger,
				&tt.mockStringUtils,
				&tt.mockPromptService,
				&tt.mockSettingsService,
				&tt.mockLlmService,
			)

			result, err := service.ProcessAction(tt.actionRequest)

			// Verify error conditions
			if (err != nil) != tt.expectError {
				t.Errorf("ProcessAction() error = %v, expectError %v", err, tt.expectError)
				return
			}

			if tt.expectError {
				if tt.expectedErrorMsg != "" && !containsErrorMessage(err.Error(), tt.expectedErrorMsg) {
					t.Errorf("ProcessAction() error = %v, expected to contain %s", err, tt.expectedErrorMsg)
				}

				// Verify error logging occurred
				if len(logger.ErrorMessages) != tt.expectedErrorLogs {
					t.Errorf("Expected %d error logs, got %d: %v", tt.expectedErrorLogs, len(logger.ErrorMessages), logger.ErrorMessages)
				}
			} else {
				// Verify successful result
				if result != tt.expectedResult {
					t.Errorf("ProcessAction() result = %v, want %v", result, tt.expectedResult)
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

			// Verify warning logging occurred
			if len(logger.WarnMessages) != tt.expectedWarnLogs {
				t.Errorf("Expected %d warn logs, got %d: %v", tt.expectedWarnLogs, len(logger.WarnMessages), logger.WarnMessages)
			}
		})
	}
}

// Test CompletionApi interface implementation
func TestCompletionApiInterface(t *testing.T) {
	t.Run("Service should implement CompletionApi interface", func(t *testing.T) {
		logger := &MockLogger{}
		stringUtils := &MockStringUtils{}
		promptService := &MockPromptService{}
		settingsService := &MockSettingsService{}
		llmService := &MockLlmService{}

		service := NewCompletionApiService(logger, stringUtils, promptService, settingsService, llmService)

		if service == nil {
			t.Fatal("NewCompletionApiService returned nil")
		}

		var _ = service
	})
}

// Helper function to check if error message contains expected substring
func containsErrorMessage(actual, expected string) bool {
	return len(actual) >= len(expected) && (actual == expected || len(actual) > len(expected) && actual[:len(expected)] == expected)
}
