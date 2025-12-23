package frontend

import (
	"errors"
	"fmt"
	"go_text/backend/model"
	"go_text/backend/model/action"
	"strings"
	"testing"
	"time"
)

// MockLogger for testing
type MockLogger struct {
	TraceMessages []string
	InfoMessages  []string
	DebugMessages []string
	ErrorMessages []string
	WarnMessages  []string
}

func (m *MockLogger) Fatal(message string) {
	// Implement if needed
}

func (m *MockLogger) Error(message string) {
	m.ErrorMessages = append(m.ErrorMessages, message)
}

func (m *MockLogger) Warning(message string) {
	m.WarnMessages = append(m.WarnMessages, message)
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
	categoriesResult             []string
	promptsResult                []model.Prompt
	promptsError                 error
	getPromptResult              model.Prompt
	getPromptError               error
	systemPromptResult           string
	systemPromptError            error
	buildPromptResult            string
	buildPromptError             error
	appPromptsResult             *model.AppPrompts
	systemPromptByCategoryResult model.Prompt
	systemPromptByCategoryError  error
	userPromptByIdResult         model.Prompt
	userPromptByIdError          error
}

func (m *MockPromptApi) GetPromptsCategories() []string {
	return m.categoriesResult
}

func (m *MockPromptApi) GetUserPromptsForCategory(category string) ([]model.Prompt, error) {
	return m.promptsResult, m.promptsError
}

func (m *MockPromptApi) GetAppPrompts() *model.AppPrompts {
	return m.appPromptsResult
}

func (m *MockPromptApi) GetPrompt(promptId string) (model.Prompt, error) {
	return m.getPromptResult, m.getPromptError
}

func (m *MockPromptApi) GetSystemPrompt(category string) (string, error) {
	return m.systemPromptResult, m.systemPromptError
}

func (m *MockPromptApi) GetSystemPromptByCategory(category string) (model.Prompt, error) {
	return m.systemPromptByCategoryResult, m.systemPromptByCategoryError
}

func (m *MockPromptApi) GetUserPromptById(id string) (model.Prompt, error) {
	return m.userPromptByIdResult, m.userPromptByIdError
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

// Helper function to create AppPrompts for testing
func createTestAppPrompts() *model.AppPrompts {
	return &model.AppPrompts{
		PromptGroups: map[string]model.AppPromptGroup{
			"translation": {
				GroupName: "translation",
				SystemPrompt: model.Prompt{
					ID:       "system-translation",
					Name:     "Translation System",
					Type:     "system",
					Category: "translation",
					Value:    "You are a translation assistant.",
				},
				Prompts: map[string]model.Prompt{
					"translate-en-fr": {
						ID:       "translate-en-fr",
						Name:     "English to French",
						Type:     "user",
						Category: "translation",
						Value:    "Translate from English to French: {{.Input}}",
					},
					"translate-fr-en": {
						ID:       "translate-fr-en",
						Name:     "French to English",
						Type:     "user",
						Category: "translation",
						Value:    "Translate from French to English: {{.Input}}",
					},
				},
			},
		},
	}
}

// Helper function to check if error message contains expected substring
func containsErrorMessage(actual, expected string) bool {
	return len(actual) >= len(expected) && (actual == expected || len(actual) > len(expected) && actual[:len(expected)] == expected || strings.Contains(actual, expected))
}

// Note: The following test cases have been addressed:
// 1. nil appPromptsResult: Fixed by adding nil check in action_service.go - test case included
// 2. nil completionApi: Fixed by adding nil check in action_service.go - test case omitted as per requirements
//    (as mentioned, there are no chances that completion API will be passed as null/nil)

// Test NewActionApi
func TestNewActionApi(t *testing.T) {
	tests := []struct {
		name          string
		logger        *MockLogger
		promptApi     *MockPromptApi
		completionApi *MockCompletionApi
		wantNil       bool
		wantDebugLogs int
		wantInfoLogs  int
		wantErrorLogs int
	}{
		{
			name:          "successful_creation",
			logger:        &MockLogger{},
			promptApi:     &MockPromptApi{},
			completionApi: &MockCompletionApi{},
			wantNil:       false,
			wantDebugLogs: 0,
			wantInfoLogs:  0,
			wantErrorLogs: 0,
		},
		{
			name:          "with_nil_dependencies",
			logger:        nil,
			promptApi:     nil,
			completionApi: nil,
			wantNil:       false, // Should still create service even with nil deps
			wantDebugLogs: 0,
			wantInfoLogs:  0,
			wantErrorLogs: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			service := NewActionApi(tt.logger, tt.promptApi, tt.completionApi)

			if (service == nil) != tt.wantNil {
				t.Errorf("NewActionApi() service = %v, wantNil %v", service, tt.wantNil)
				return
			}

			if !tt.wantNil {
				// Verify no unexpected logs
				if tt.logger != nil {
					if len(tt.logger.DebugMessages) != tt.wantDebugLogs {
						t.Errorf("Expected %d debug logs, got %d: %v", tt.wantDebugLogs, len(tt.logger.DebugMessages), tt.logger.DebugMessages)
					}
					if len(tt.logger.InfoMessages) != tt.wantInfoLogs {
						t.Errorf("Expected %d info logs, got %d: %v", tt.wantInfoLogs, len(tt.logger.InfoMessages), tt.logger.InfoMessages)
					}
					if len(tt.logger.ErrorMessages) != tt.wantErrorLogs {
						t.Errorf("Expected %d error logs, got %d: %v", tt.wantErrorLogs, len(tt.logger.ErrorMessages), tt.logger.ErrorMessages)
					}
				}
			}
		})
	}
}

// Test GetActionGroups
func TestActionService_GetActionGroups(t *testing.T) {
	type fields struct {
		logger        *MockLogger
		promptApi     *MockPromptApi
		completionApi *MockCompletionApi
		cachedActions *action.Actions
	}

	tests := []struct {
		name             string
		fields           fields
		want             *action.Actions
		wantErr          bool
		wantErrMsg       string
		wantInfoLogs     int
		wantTraceLogs    int
		wantErrorLogs    int
		wantActionGroups int
		wantTotalActions int
		wantCacheHit     bool
	}{
		{
			name: "success_with_cache_miss",
			fields: fields{
				logger:        &MockLogger{},
				promptApi:     &MockPromptApi{appPromptsResult: createTestAppPrompts()},
				completionApi: &MockCompletionApi{},
				cachedActions: nil,
			},
			want: &action.Actions{
				ActionGroups: []action.Group{
					{
						GroupName: "translation",
						GroupActions: []action.Action{
							{ID: "translate-en-fr", Text: "English to French"},
							{ID: "translate-fr-en", Text: "French to English"},
						},
					},
				},
			},
			wantErr:          false,
			wantInfoLogs:     2, // Start and success logs
			wantTraceLogs:    3, // Categories, processing category, and prompts count
			wantErrorLogs:    0,
			wantActionGroups: 1,
			wantTotalActions: 2,
			wantCacheHit:     false,
		},
		{
			name: "success_with_cache_hit",
			fields: fields{
				logger:        &MockLogger{},
				promptApi:     &MockPromptApi{appPromptsResult: createTestAppPrompts()},
				completionApi: &MockCompletionApi{},
				cachedActions: &action.Actions{
					ActionGroups: []action.Group{
						{GroupName: "cached", GroupActions: []action.Action{{ID: "cached", Text: "Cached Action"}}},
					},
				},
			},
			want: &action.Actions{
				ActionGroups: []action.Group{
					{GroupName: "cached", GroupActions: []action.Action{{ID: "cached", Text: "Cached Action"}}},
				},
			},
			wantErr:          false,
			wantInfoLogs:     1, // Only start log for cache hit
			wantTraceLogs:    0, // No trace logs for cache hit
			wantErrorLogs:    0,
			wantActionGroups: 1,
			wantTotalActions: 1,
			wantCacheHit:     true,
		},
		{
			name: "empty_app_prompts",
			fields: fields{
				logger:        &MockLogger{},
				promptApi:     &MockPromptApi{appPromptsResult: &model.AppPrompts{PromptGroups: map[string]model.AppPromptGroup{}}},
				completionApi: &MockCompletionApi{},
				cachedActions: nil,
			},
			want:             &action.Actions{ActionGroups: []action.Group{}},
			wantErr:          false,
			wantInfoLogs:     2, // Start and success logs
			wantTraceLogs:    1, // Only categories count
			wantErrorLogs:    0,
			wantActionGroups: 0,
			wantTotalActions: 0,
			wantCacheHit:     false,
		},

		{
			name: "multiple_categories",
			fields: fields{
				logger: &MockLogger{},
				promptApi: &MockPromptApi{appPromptsResult: &model.AppPrompts{
					PromptGroups: map[string]model.AppPromptGroup{
						"translation": {
							GroupName: "translation",
							Prompts: map[string]model.Prompt{
								"translate-en-fr": {ID: "translate-en-fr", Name: "English to French"},
							},
						},
						"summarization": {
							GroupName: "summarization",
							Prompts: map[string]model.Prompt{
								"summarize-text": {ID: "summarize-text", Name: "Summarize Text"},
								"summarize-long": {ID: "summarize-long", Name: "Summarize Long Text"},
							},
						},
					},
				}},
				completionApi: &MockCompletionApi{},
				cachedActions: nil,
			},
			want: &action.Actions{
				ActionGroups: []action.Group{
					{GroupName: "translation", GroupActions: []action.Action{{ID: "translate-en-fr", Text: "English to French"}}},
					{GroupName: "summarization", GroupActions: []action.Action{
						{ID: "summarize-text", Text: "Summarize Text"},
						{ID: "summarize-long", Text: "Summarize Long Text"},
					}},
				},
			},
			wantErr:          false,
			wantInfoLogs:     2,
			wantTraceLogs:    5, // Categories, 2 processing category logs, 2 prompts count logs
			wantErrorLogs:    0,
			wantActionGroups: 2,
			wantTotalActions: 3,
			wantCacheHit:     false,
		},
		{
			name: "nil_app_prompts",
			fields: fields{
				logger:        &MockLogger{},
				promptApi:     &MockPromptApi{appPromptsResult: nil},
				completionApi: &MockCompletionApi{},
				cachedActions: nil,
			},
			want:             nil,
			wantErr:          true,
			wantErrMsg:       "[GetActionGroups] No app prompts returned",
			wantInfoLogs:     1, // Only start log
			wantTraceLogs:    0, // No trace logs
			wantErrorLogs:    1, // Error log for nil app prompts
			wantActionGroups: 0,
			wantTotalActions: 0,
			wantCacheHit:     false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			service := &actionService{
				logger:        tt.fields.logger,
				promptApi:     tt.fields.promptApi,
				completionApi: tt.fields.completionApi,
				cachedActions: tt.fields.cachedActions,
			}

			got, err := service.GetActionGroups()

			// Verify error conditions
			if (err != nil) != tt.wantErr {
				t.Errorf("GetActionGroups() error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			if tt.wantErr {
				if tt.wantErrMsg != "" && !containsErrorMessage(err.Error(), tt.wantErrMsg) {
					t.Errorf("GetActionGroups() error = %v, expected to contain %s", err, tt.wantErrMsg)
				}

				// Verify error logging occurred
				if len(tt.fields.logger.ErrorMessages) != tt.wantErrorLogs {
					t.Errorf("Expected %d error logs, got %d: %v", tt.wantErrorLogs, len(tt.fields.logger.ErrorMessages), tt.fields.logger.ErrorMessages)
				}
			} else {
				// Verify successful result
				if got == nil {
					t.Errorf("GetActionGroups() result = nil, want non-nil")
				}

				if len(got.ActionGroups) != tt.wantActionGroups {
					t.Errorf("GetActionGroups() action groups count = %d, want %d", len(got.ActionGroups), tt.wantActionGroups)
				}

				// Count total actions
				totalActions := 0
				for _, group := range got.ActionGroups {
					totalActions += len(group.GroupActions)
				}

				if totalActions != tt.wantTotalActions {
					t.Errorf("GetActionGroups() total actions count = %d, want %d", totalActions, tt.wantTotalActions)
				}

				// Verify info logging occurred
				if len(tt.fields.logger.InfoMessages) != tt.wantInfoLogs {
					t.Errorf("Expected %d info logs, got %d: %v", tt.wantInfoLogs, len(tt.fields.logger.InfoMessages), tt.fields.logger.InfoMessages)
				}

				// Verify trace logging occurred
				if len(tt.fields.logger.TraceMessages) != tt.wantTraceLogs {
					t.Errorf("Expected %d trace logs, got %d: %v", tt.wantTraceLogs, len(tt.fields.logger.TraceMessages), tt.fields.logger.TraceMessages)
				}

				// Verify cache behavior
				if tt.wantCacheHit {
					// For cache hit, verify that cached data was returned
					if got != tt.fields.cachedActions {
						t.Errorf("GetActionGroups() cache hit should return cached data")
					}
				} else {
					// For cache miss, verify that prompt API was called and result was cached
					if service.cachedActions == nil {
						t.Errorf("GetActionGroups() cache miss should cache the result")
					}
					if service.cachedActions != got {
						t.Errorf("GetActionGroups() cache miss should return the same instance that was cached")
					}
				}

				// Verify log message content for success case
				if tt.wantInfoLogs > 0 && len(tt.fields.logger.InfoMessages) > 0 {
					firstLog := tt.fields.logger.InfoMessages[0]
					if !strings.Contains(firstLog, "[GetActionGroups] Fetching action groups and prompts") {
						t.Errorf("Expected first info log to contain 'Fetching action groups and prompts', got: %s", firstLog)
					}

					if !tt.wantCacheHit && tt.wantInfoLogs > 1 {
						lastLog := tt.fields.logger.InfoMessages[len(tt.fields.logger.InfoMessages)-1]
						if !strings.Contains(lastLog, "Successfully retrieved") {
							t.Errorf("Expected last info log to contain 'Successfully retrieved', got: %s", lastLog)
						}
					}
				}
			}
		})
	}
}

// Test ProcessAction
func TestActionService_ProcessAction(t *testing.T) {
	type fields struct {
		logger        *MockLogger
		promptApi     *MockPromptApi
		completionApi *MockCompletionApi
	}

	type args struct {
		actionRequest action.ActionRequest
	}

	tests := []struct {
		name                string
		fields              fields
		args                args
		want                string
		wantErr             bool
		wantErrMsg          string
		wantInfoLogs        int
		wantErrorLogs       int
		wantLogContentCheck bool
	}{
		{
			name: "successful_action_processing",
			fields: fields{
				logger:        &MockLogger{},
				promptApi:     &MockPromptApi{},
				completionApi: &MockCompletionApi{processActionResult: "Bonjour le monde", processActionError: nil},
			},
			args: args{
				actionRequest: action.ActionRequest{
					ID:               "translate-en-fr",
					InputText:        "Hello world",
					OutputText:       "",
					InputLanguageID:  "en",
					OutputLanguageID: "fr",
				},
			},
			want:                "Bonjour le monde",
			wantErr:             false,
			wantInfoLogs:        2, // Start and success logs
			wantErrorLogs:       0,
			wantLogContentCheck: true,
		},
		{
			name: "action_processing_error",
			fields: fields{
				logger:        &MockLogger{},
				promptApi:     &MockPromptApi{},
				completionApi: &MockCompletionApi{processActionResult: "", processActionError: errors.New("LLM service unavailable")},
			},
			args: args{
				actionRequest: action.ActionRequest{
					ID:               "translate-en-fr",
					InputText:        "Hello world",
					OutputText:       "",
					InputLanguageID:  "en",
					OutputLanguageID: "fr",
				},
			},
			want:                "",
			wantErr:             true,
			wantErrMsg:          "action processing failed",
			wantInfoLogs:        1, // Only start log
			wantErrorLogs:       1, // Error log
			wantLogContentCheck: true,
		},
		{
			name: "empty_action_id",
			fields: fields{
				logger:        &MockLogger{},
				promptApi:     &MockPromptApi{},
				completionApi: &MockCompletionApi{processActionResult: "", processActionError: errors.New("invalid action ID")},
			},
			args: args{
				actionRequest: action.ActionRequest{
					ID:               "",
					InputText:        "Hello world",
					OutputText:       "",
					InputLanguageID:  "en",
					OutputLanguageID: "fr",
				},
			},
			want:                "",
			wantErr:             true,
			wantErrMsg:          "action processing failed",
			wantInfoLogs:        1, // Only start log
			wantErrorLogs:       1, // Error log
			wantLogContentCheck: true,
		},
		{
			name: "empty_result",
			fields: fields{
				logger:        &MockLogger{},
				promptApi:     &MockPromptApi{},
				completionApi: &MockCompletionApi{processActionResult: "", processActionError: nil},
			},
			args: args{
				actionRequest: action.ActionRequest{
					ID:               "translate-en-fr",
					InputText:        "Hello world",
					OutputText:       "",
					InputLanguageID:  "en",
					OutputLanguageID: "fr",
				},
			},
			want:                "",
			wantErr:             false,
			wantInfoLogs:        2, // Start and success logs
			wantErrorLogs:       0,
			wantLogContentCheck: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			service := NewActionApi(tt.fields.logger, tt.fields.promptApi, tt.fields.completionApi)

			got, err := service.ProcessAction(tt.args.actionRequest)

			// Verify error conditions
			if (err != nil) != tt.wantErr {
				t.Errorf("ProcessAction() error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			if tt.wantErr {
				if tt.wantErrMsg != "" && !containsErrorMessage(err.Error(), tt.wantErrMsg) {
					t.Errorf("ProcessAction() error = %v, expected to contain %s", err, tt.wantErrMsg)
				}

				// Verify error logging occurred
				if len(tt.fields.logger.ErrorMessages) != tt.wantErrorLogs {
					t.Errorf("Expected %d error logs, got %d: %v", tt.wantErrorLogs, len(tt.fields.logger.ErrorMessages), tt.fields.logger.ErrorMessages)
				}

				// Verify error log content
				if tt.wantErrorLogs > 0 && tt.wantLogContentCheck {
					for _, errorLog := range tt.fields.logger.ErrorMessages {
						if !strings.Contains(errorLog, "[ProcessAction] Failed to process action") {
							t.Errorf("Expected error log to contain 'Failed to process action', got: %s", errorLog)
						}
					}
				}
			} else {
				// Verify successful result
				if got != tt.want {
					t.Errorf("ProcessAction() result = %s, want %s", got, tt.want)
				}

				// Verify info logging occurred
				if len(tt.fields.logger.InfoMessages) != tt.wantInfoLogs {
					t.Errorf("Expected %d info logs, got %d: %v", tt.wantInfoLogs, len(tt.fields.logger.InfoMessages), tt.fields.logger.InfoMessages)
				}

				// Verify log content for success case
				if tt.wantLogContentCheck && tt.wantInfoLogs > 0 {
					firstLog := tt.fields.logger.InfoMessages[0]
					if !strings.Contains(firstLog, "[ProcessAction] Processing action:") {
						t.Errorf("Expected first info log to contain 'Processing action:', got: %s", firstLog)
					}

					if tt.wantInfoLogs > 1 {
						lastLog := tt.fields.logger.InfoMessages[len(tt.fields.logger.InfoMessages)-1]
						if !strings.Contains(lastLog, "Successfully processed action") {
							t.Errorf("Expected last info log to contain 'Successfully processed action', got: %s", lastLog)
						}
						if !strings.Contains(lastLog, fmt.Sprintf("Result length: %d characters", len(got))) {
							t.Errorf("Expected last info log to contain result length, got: %s", lastLog)
						}
					}
				}
			}
		})
	}
}

// Test ActionApi interface implementation
func TestActionService_ImplementsActionApi(t *testing.T) {
	t.Run("Service should implement ActionApi interface", func(t *testing.T) {
		logger := &MockLogger{}
		promptApi := &MockPromptApi{}
		completionApi := &MockCompletionApi{}

		service := NewActionApi(logger, promptApi, completionApi)

		if service == nil {
			t.Fatal("NewActionApi returned nil")
		}

		// This will compile only if service implements ActionApi
		var _ = service
	})
}

// Test timing behavior
func TestActionService_TimingBehavior(t *testing.T) {
	t.Run("GetActionGroups should complete in reasonable time", func(t *testing.T) {
		logger := &MockLogger{}
		promptApi := &MockPromptApi{appPromptsResult: createTestAppPrompts()}
		completionApi := &MockCompletionApi{}

		service := NewActionApi(logger, promptApi, completionApi)

		startTime := time.Now()
		_, err := service.GetActionGroups()
		duration := time.Since(startTime)

		if err != nil {
			t.Errorf("GetActionGroups() unexpected error: %v", err)
		}

		// Should complete in less than 1 second for normal cases
		if duration > 1*time.Second {
			t.Errorf("GetActionGroups() took too long: %v", duration)
		}
	})

	t.Run("ProcessAction should complete in reasonable time", func(t *testing.T) {
		logger := &MockLogger{}
		promptApi := &MockPromptApi{}
		completionApi := &MockCompletionApi{processActionResult: "test result", processActionError: nil}

		service := NewActionApi(logger, promptApi, completionApi)

		startTime := time.Now()
		_, err := service.ProcessAction(action.ActionRequest{ID: "test"})
		duration := time.Since(startTime)

		if err != nil {
			t.Errorf("ProcessAction() unexpected error: %v", err)
		}

		// Should complete in less than 1 second for normal cases
		if duration > 1*time.Second {
			t.Errorf("ProcessAction() took too long: %v", duration)
		}
	})
}
