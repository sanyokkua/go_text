package api

import (
	"errors"
	"fmt"
	"strings"
	"testing"

	"go_text/internal/v2/model"
	"go_text/internal/v2/model/action"
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

// MockPromptApi for testing
type MockPromptApi struct {
	categoriesResult   []string
	promptsResult      []model.Prompt
	promptsError       error
	getPromptResult    model.Prompt
	getPromptError     error
	systemPromptResult string
	systemPromptError  error
	buildPromptResult  string
	buildPromptError   error
}

func (m *MockPromptApi) GetPromptsCategories() []string {
	return m.categoriesResult
}

func (m *MockPromptApi) GetUserPromptsForCategory(category string) ([]model.Prompt, error) {
	return m.promptsResult, m.promptsError
}

func (m *MockPromptApi) GetPrompt(promptId string) (model.Prompt, error) {
	return m.getPromptResult, m.getPromptError
}

func (m *MockPromptApi) GetSystemPrompt(category string) (string, error) {
	return m.systemPromptResult, m.systemPromptError
}

func (m *MockPromptApi) BuildPrompt(template, category string, action *action.ActionRequest, useMarkdown bool) (string, error) {
	return m.buildPromptResult, m.buildPromptError
}

// MockCompletionApi for testing
type MockCompletionApi struct {
	processActionResult string
	processActionError  error
}

func (m *MockCompletionApi) ProcessAction(action action.ActionRequest) (string, error) {
	return m.processActionResult, m.processActionError
}

// Test NewActionApi
func TestNewActionApi(t *testing.T) {
	logger := &MockLogger{}
	promptApi := &MockPromptApi{}
	completionApi := &MockCompletionApi{}

	service := NewActionApi(logger, promptApi, completionApi)

	if service == nil {
		t.Fatal("NewActionApi returned nil")
	}

	// Verify debug logs
	if len(logger.DebugMessages) != 2 {
		t.Errorf("Expected 2 debug logs, got %d: %v", len(logger.DebugMessages), logger.DebugMessages)
	}
}

// Test GetActionGroups
func TestGetActionGroups(t *testing.T) {
	tests := []struct {
		name                 string
		categoriesResult     []string
		promptsResult        []model.Prompt
		promptsError         error
		expectError          bool
		expectedErrorMsg     string
		expectedInfoLogs     int
		expectedDebugLogs    int
		expectedErrorLogs    int
		expectedActionGroups int
		expectedTotalActions int
	}{
		{
			name:             "Successful action groups retrieval with cache",
			categoriesResult: []string{"translation"},
			promptsResult: []model.Prompt{
				{ID: "translate-en-fr", Name: "English to French", Category: "translation"},
				{ID: "translate-fr-en", Name: "French to English", Category: "translation"},
			},
			promptsError:         nil,
			expectError:          false,
			expectedInfoLogs:     2, // Start and success logs
			expectedDebugLogs:    5, // Constructor + Categories, processing category, and prompts retrieval
			expectedErrorLogs:    0,
			expectedActionGroups: 1,
			expectedTotalActions: 2,
		},
		{
			name:             "Successful action groups retrieval with cache hit",
			categoriesResult: []string{"translation"},
			promptsResult: []model.Prompt{
				{ID: "translate-en-fr", Name: "English to French", Category: "translation"},
			},
			promptsError:         nil,
			expectError:          false,
			expectedInfoLogs:     2, // Start and success logs
			expectedDebugLogs:    5, // Constructor + Categories, processing category, and prompts retrieval
			expectedErrorLogs:    0,
			expectedActionGroups: 1,
			expectedTotalActions: 1,
		},
		{
			name:                 "Empty categories",
			categoriesResult:     []string{},
			promptsResult:        []model.Prompt{},
			promptsError:         nil,
			expectError:          false,
			expectedInfoLogs:     2, // Start and success logs
			expectedDebugLogs:    3, // Constructor + Categories and no processing
			expectedErrorLogs:    0,
			expectedActionGroups: 0,
			expectedTotalActions: 0,
		},
		{
			name:                 "Prompts retrieval error",
			categoriesResult:     []string{"translation"},
			promptsResult:        []model.Prompt{},
			promptsError:         errors.New("database connection failed"),
			expectError:          true,
			expectedErrorMsg:     "failed to retrieve prompts for category \"translation\"",
			expectedInfoLogs:     1, // Only start log
			expectedDebugLogs:    2, // Categories and processing category
			expectedErrorLogs:    1, // Error log
			expectedActionGroups: 0,
			expectedTotalActions: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			logger := &MockLogger{}
			promptApi := &MockPromptApi{
				categoriesResult: tt.categoriesResult,
				promptsResult:    tt.promptsResult,
				promptsError:     tt.promptsError,
			}
			completionApi := &MockCompletionApi{}

			service := NewActionApi(logger, promptApi, completionApi)

			// First call to populate cache
			result, err := service.GetActionGroups()

			// Verify error conditions
			if (err != nil) != tt.expectError {
				t.Errorf("GetActionGroups() error = %v, expectError %v", err, tt.expectError)
				return
			}

			if tt.expectError {
				if tt.expectedErrorMsg != "" && !containsErrorMessage(err.Error(), tt.expectedErrorMsg) {
					t.Errorf("GetActionGroups() error = %v, expected to contain %s", err, tt.expectedErrorMsg)
				}

				// Verify error logging occurred
				if len(logger.ErrorMessages) != tt.expectedErrorLogs {
					t.Errorf("Expected %d error logs, got %d: %v", tt.expectedErrorLogs, len(logger.ErrorMessages), logger.ErrorMessages)
				}
			} else {
				// Verify successful result
				if result == nil {
					t.Errorf("GetActionGroups() result = nil, want non-nil")
				}

				if len(result.ActionGroups) != tt.expectedActionGroups {
					t.Errorf("GetActionGroups() action groups count = %d, want %d", len(result.ActionGroups), tt.expectedActionGroups)
				}

				// Count total actions
				totalActions := 0
				for _, group := range result.ActionGroups {
					totalActions += len(group.GroupActions)
				}

				if totalActions != tt.expectedTotalActions {
					t.Errorf("GetActionGroups() total actions count = %d, want %d", totalActions, tt.expectedTotalActions)
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
				cachedResult, cachedErr := service.GetActionGroups()

				if cachedErr != nil {
					t.Errorf("GetActionGroups() cache call error = %v, want nil", cachedErr)
				}

				if cachedResult != result {
					t.Errorf("GetActionGroups() cache call result = %v, want same as first call", cachedResult)
				}

				// Cache hit should not call the prompt API again, so no new debug logs
				if len(logger.DebugMessages) != 0 {
					t.Errorf("Expected 0 debug logs for cache hit, got %d: %v", len(logger.DebugMessages), logger.DebugMessages)
				}
			}
		})
	}
}

// Test ProcessAction
func TestProcessAction(t *testing.T) {
	tests := []struct {
		name                string
		actionRequest       action.ActionRequest
		processActionResult string
		processActionError  error
		expectError         bool
		expectedErrorMsg    string
		expectedInfoLogs    int
		expectedDebugLogs   int
		expectedErrorLogs   int
	}{
		{
			name: "Successful action processing",
			actionRequest: action.ActionRequest{
				ID:               "translate-en-fr",
				InputText:        "Hello world",
				OutputText:       "",
				InputLanguageID:  "en",
				OutputLanguageID: "fr",
			},
			processActionResult: "Bonjour le monde",
			processActionError:  nil,
			expectError:         false,
			expectedInfoLogs:    2, // Start and success logs
			expectedDebugLogs:   2, // Constructor debug logs
			expectedErrorLogs:   0,
		},
		{
			name: "Action processing error",
			actionRequest: action.ActionRequest{
				ID:               "translate-en-fr",
				InputText:        "Hello world",
				OutputText:       "",
				InputLanguageID:  "en",
				OutputLanguageID: "fr",
			},
			processActionResult: "",
			processActionError:  errors.New("LLM service unavailable"),
			expectError:         true,
			expectedErrorMsg:    "action processing failed",
			expectedInfoLogs:    1, // Only start log
			expectedDebugLogs:   0,
			expectedErrorLogs:   1, // Error log
		},
		{
			name: "Empty action ID",
			actionRequest: action.ActionRequest{
				ID:               "",
				InputText:        "Hello world",
				OutputText:       "",
				InputLanguageID:  "en",
				OutputLanguageID: "fr",
			},
			processActionResult: "",
			processActionError:  errors.New("invalid action ID"),
			expectError:         true,
			expectedErrorMsg:    "action processing failed",
			expectedInfoLogs:    1, // Only start log
			expectedDebugLogs:   0,
			expectedErrorLogs:   1, // Error log
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			logger := &MockLogger{}
			promptApi := &MockPromptApi{}
			completionApi := &MockCompletionApi{
				processActionResult: tt.processActionResult,
				processActionError:  tt.processActionError,
			}

			service := NewActionApi(logger, promptApi, completionApi)

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
				if result != tt.processActionResult {
					t.Errorf("ProcessAction() result = %s, want %s", result, tt.processActionResult)
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

// Test ActionApi interface implementation
func TestActionApiInterface(t *testing.T) {
	t.Run("Service should implement ActionApi interface", func(t *testing.T) {
		logger := &MockLogger{}
		promptApi := &MockPromptApi{}
		completionApi := &MockCompletionApi{}

		service := NewActionApi(logger, promptApi, completionApi)

		if service == nil {
			t.Fatal("NewActionApi returned nil")
		}

		var _ = service
	})
}

// Helper function to check if error message contains expected substring
func containsErrorMessage(actual, expected string) bool {
	return len(actual) >= len(expected) && (actual == expected || len(actual) > len(expected) && actual[:len(expected)] == expected || strings.Contains(actual, expected))
}
