package prompt

import (
	"fmt"
	"go_text/backend/constant"
	"go_text/backend/model/action"
	"strings"
	"testing"
)

// IntegrationTestLogger is a logger that captures messages for testing
type IntegrationTestLogger struct {
	Messages []string
}

func (l *IntegrationTestLogger) LogDebug(msg string, keysAndValues ...interface{}) {
	l.Messages = append(l.Messages, fmt.Sprintf("DEBUG: "+msg, keysAndValues...))
}

func (l *IntegrationTestLogger) LogInfo(msg string, keysAndValues ...interface{}) {
	l.Messages = append(l.Messages, fmt.Sprintf("INFO: "+msg, keysAndValues...))
}

func (l *IntegrationTestLogger) LogWarn(msg string, keysAndValues ...interface{}) {
	l.Messages = append(l.Messages, fmt.Sprintf("WARN: "+msg, keysAndValues...))
}

func (l *IntegrationTestLogger) LogError(msg string, keysAndValues ...interface{}) {
	l.Messages = append(l.Messages, fmt.Sprintf("ERROR: "+msg, keysAndValues...))
}

func (l *IntegrationTestLogger) Clear() {
	l.Messages = nil
}

func (l *IntegrationTestLogger) Contains(substring string) bool {
	for _, msg := range l.Messages {
		if strings.Contains(msg, substring) {
			return true
		}
	}
	return false
}

// TestPromptServiceIntegration tests the real prompt service with mock logger
func TestPromptServiceIntegration(t *testing.T) {
	logger := &IntegrationTestLogger{}
	service := NewPromptService(logger)

	if service == nil {
		t.Fatal("NewPromptService returned nil")
	}

	// Test that the service implements the interface
	var _ = service
}

// TestGetPromptIntegration tests the real GetPrompt method
func TestGetPromptIntegration(t *testing.T) {
	logger := &IntegrationTestLogger{}
	service := NewPromptService(logger)

	// Test valid prompt
	prompt, err := service.GetPrompt("proofread")
	if err != nil {
		t.Errorf("Expected no error for valid prompt ID, got: %v", err)
	}

	if prompt.ID != "proofread" {
		t.Errorf("Expected prompt ID 'proofread', got: %s", prompt.ID)
	}

	// Test invalid prompt
	_, err = service.GetPrompt("invalid_id")
	if err == nil {
		t.Error("Expected error for invalid prompt ID")
	}

	// Verify error logging occurred
	if !logger.Contains("ERROR") {
		t.Error("Expected error logging to occur")
	}
}

// TestBuildPromptIntegration tests the real BuildPrompt method
func TestBuildPromptIntegration(t *testing.T) {
	logger := &IntegrationTestLogger{}
	service := NewPromptService(logger)

	testCases := []struct {
		name        string
		template    string
		category    string
		action      *action.ActionRequest
		useMarkdown bool
		wantError   bool
	}{
		{
			name:     "Valid proofreading prompt",
			template: "Process: {{user_text}}",
			category: constant.PromptCategoryProofread,
			action: &action.ActionRequest{
				ID:               "proofread",
				InputText:        "Hello world",
				InputLanguageID:  "",
				OutputLanguageID: "",
			},
			useMarkdown: false,
			wantError:   false,
		},
		{
			name:     "Valid translation prompt",
			template: "Translate {{user_text}} from {{input_language}} to {{output_language}}",
			category: constant.PromptCategoryTranslation,
			action: &action.ActionRequest{
				ID:               "translate",
				InputText:        "Hello",
				InputLanguageID:  "English",
				OutputLanguageID: "Ukrainian",
			},
			useMarkdown: false,
			wantError:   false,
		},
		{
			name:     "Missing translation language",
			template: "Translate {{user_text}} from {{input_language}} to {{output_language}}",
			category: constant.PromptCategoryTranslation,
			action: &action.ActionRequest{
				ID:               "translate",
				InputText:        "Hello",
				InputLanguageID:  "", // Missing
				OutputLanguageID: "Ukrainian",
			},
			useMarkdown: false,
			wantError:   true,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			logger.Clear()
			result, err := service.BuildPrompt(tc.template, tc.category, tc.action, tc.useMarkdown)

			if (err != nil) != tc.wantError {
				t.Errorf("BuildPrompt() error = %v, wantError %v", err, tc.wantError)
			}

			if !tc.wantError && result == "" {
				t.Error("Expected non-empty result for successful prompt building")
			}

			// Verify logging occurred
			if len(logger.Messages) == 0 {
				t.Error("Expected logging to occur")
			}
		})
	}
}

// TestGetSystemPromptIntegration tests the real GetSystemPrompt method
func TestGetSystemPromptIntegration(t *testing.T) {
	logger := &IntegrationTestLogger{}
	service := NewPromptService(logger)

	// Test valid system prompt
	systemPrompt, err := service.GetSystemPrompt(constant.PromptCategoryProofread)
	if err != nil {
		t.Errorf("Expected no error for valid category, got: %v", err)
	}

	if systemPrompt == "" {
		t.Error("Expected non-empty system prompt")
	}

	// Verify info logging occurred
	if !logger.Contains("INFO") {
		t.Error("Expected INFO logging to occur")
	}

	// Test invalid category
	_, err = service.GetSystemPrompt("invalid_category")
	if err == nil {
		t.Error("Expected error for invalid category")
	}

	// Verify error logging occurred
	if !logger.Contains("ERROR") {
		t.Error("Expected ERROR logging to occur")
	}
}

// TestBuildPromptErrorCasesIntegration tests error cases in BuildPrompt
func TestBuildPromptErrorCasesIntegration(t *testing.T) {
	logger := &IntegrationTestLogger{}
	service := NewPromptService(logger)

	testCases := []struct {
		name          string
		template      string
		category      string
		action        *action.ActionRequest
		useMarkdown   bool
		wantError     bool
		errorContains string
	}{

		{
			name:     "Blank template",
			template: "",
			category: constant.PromptCategoryProofread,
			action: &action.ActionRequest{
				ID:               "proofread",
				InputText:        "Hello world",
				InputLanguageID:  "",
				OutputLanguageID: "",
			},
			useMarkdown:   false,
			wantError:     true,
			errorContains: "invalid template",
		},
		{
			name:     "Blank category",
			template: "Process: {{user_text}}",
			category: "",
			action: &action.ActionRequest{
				ID:               "proofread",
				InputText:        "Hello world",
				InputLanguageID:  "",
				OutputLanguageID: "",
			},
			useMarkdown:   false,
			wantError:     true,
			errorContains: "invalid category",
		},
		{
			name:     "Blank action ID",
			template: "Process: {{user_text}}",
			category: constant.PromptCategoryProofread,
			action: &action.ActionRequest{
				ID:               "",
				InputText:        "Hello world",
				InputLanguageID:  "",
				OutputLanguageID: "",
			},
			useMarkdown:   false,
			wantError:     true,
			errorContains: "invalid action id",
		},
		{
			name:     "Blank action input text",
			template: "Process: {{user_text}}",
			category: constant.PromptCategoryProofread,
			action: &action.ActionRequest{
				ID:               "proofread",
				InputText:        "",
				InputLanguageID:  "",
				OutputLanguageID: "",
			},
			useMarkdown:   false,
			wantError:     true,
			errorContains: "invalid action InputText",
		},
		{
			name:     "Translation missing input language",
			template: "Translate {{user_text}} from {{input_language}} to {{output_language}}",
			category: constant.PromptCategoryTranslation,
			action: &action.ActionRequest{
				ID:               "translate",
				InputText:        "Hello",
				InputLanguageID:  "",
				OutputLanguageID: "Ukrainian",
			},
			useMarkdown:   false,
			wantError:     true,
			errorContains: "invalid action InputLanguageID",
		},
		{
			name:     "Translation missing output language",
			template: "Translate {{user_text}} from {{input_language}} to {{output_language}}",
			category: constant.PromptCategoryTranslation,
			action: &action.ActionRequest{
				ID:               "translate",
				InputText:        "Hello",
				InputLanguageID:  "English",
				OutputLanguageID: "",
			},
			useMarkdown:   false,
			wantError:     true,
			errorContains: "invalid action OutputLanguageID",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			logger.Clear()
			result, err := service.BuildPrompt(tc.template, tc.category, tc.action, tc.useMarkdown)

			if (err != nil) != tc.wantError {
				t.Errorf("BuildPrompt() error = %v, wantError %v", err, tc.wantError)
			}

			if tc.wantError {
				if tc.errorContains != "" && err != nil {
					if !strings.Contains(err.Error(), tc.errorContains) {
						t.Errorf("BuildPrompt() error = %v, expected error to contain %s", err, tc.errorContains)
					}
				}
				if !logger.Contains("ERROR") {
					t.Error("Expected ERROR logging to occur")
				}
			} else {
				if result == "" {
					t.Error("Expected non-empty result for successful prompt building")
				}
				if !logger.Contains("INFO") {
					t.Error("Expected INFO logging to occur")
				}
			}
		})
	}
}

// TestBuildPromptSuccessCasesIntegration tests success cases in BuildPrompt
func TestBuildPromptSuccessCasesIntegration(t *testing.T) {
	logger := &IntegrationTestLogger{}
	service := NewPromptService(logger)

	testCases := []struct {
		name             string
		template         string
		category         string
		action           *action.ActionRequest
		useMarkdown      bool
		expectedContains string
	}{
		{
			name:     "Proofreading with markdown",
			template: "Process: {{user_text}} in {{user_format}} format",
			category: constant.PromptCategoryProofread,
			action: &action.ActionRequest{
				ID:               "proofread",
				InputText:        "Hello world",
				InputLanguageID:  "",
				OutputLanguageID: "",
			},
			useMarkdown:      true,
			expectedContains: "Markdown",
		},
		{
			name:     "Proofreading without markdown",
			template: "Process: {{user_text}} in {{user_format}} format",
			category: constant.PromptCategoryProofread,
			action: &action.ActionRequest{
				ID:               "proofread",
				InputText:        "Hello world",
				InputLanguageID:  "",
				OutputLanguageID: "",
			},
			useMarkdown:      false,
			expectedContains: "PlainText",
		},
		{
			name:     "Translation with languages",
			template: "Translate {{user_text}} from {{input_language}} to {{output_language}}",
			category: constant.PromptCategoryTranslation,
			action: &action.ActionRequest{
				ID:               "translate",
				InputText:        "Hello",
				InputLanguageID:  "English",
				OutputLanguageID: "Ukrainian",
			},
			useMarkdown:      false,
			expectedContains: "English",
		},
		{
			name:     "Template with format parameter",
			template: "Process {{user_text}} in {{user_format}} format",
			category: constant.PromptCategoryProofread,
			action: &action.ActionRequest{
				ID:               "proofread",
				InputText:        "Hello world",
				InputLanguageID:  "",
				OutputLanguageID: "",
			},
			useMarkdown:      true,
			expectedContains: "Markdown",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			logger.Clear()
			result, err := service.BuildPrompt(tc.template, tc.category, tc.action, tc.useMarkdown)

			if err != nil {
				t.Errorf("BuildPrompt() unexpected error: %v", err)
			}

			if result == "" {
				t.Error("Expected non-empty result")
			}

			if tc.expectedContains != "" && !strings.Contains(result, tc.expectedContains) {
				t.Errorf("Expected result to contain %s, got: %s", tc.expectedContains, result)
			}

			// Verify logging occurred
			if !logger.Contains("INFO") {
				t.Error("Expected INFO logging to occur")
			}
			if !logger.Contains("DEBUG") {
				t.Error("Expected DEBUG logging to occur")
			}
		})
	}
}

// TestIsActionRequestValidIntegration tests the private isActionRequestValid method
func TestIsActionRequestValidIntegration(t *testing.T) {
	logger := &IntegrationTestLogger{}
	service := NewPromptService(logger)

	// Access the private method through type assertion
	serviceImpl := service.(*promptServiceStruct)

	testCases := []struct {
		name          string
		action        *action.ActionRequest
		isTranslation bool
		wantValid     bool
		errorContains string
	}{
		{
			name: "Valid proofreading action",
			action: &action.ActionRequest{
				ID:               "proofread",
				InputText:        "Hello world",
				InputLanguageID:  "",
				OutputLanguageID: "",
			},
			isTranslation: false,
			wantValid:     true,
		},
		{
			name: "Valid translation action",
			action: &action.ActionRequest{
				ID:               "translate",
				InputText:        "Hello",
				InputLanguageID:  "English",
				OutputLanguageID: "Ukrainian",
			},
			isTranslation: true,
			wantValid:     true,
		},
		{
			name:          "Nil action",
			action:        nil,
			isTranslation: false,
			wantValid:     false,
			errorContains: "ActionRequest must not be nil",
		},
		{
			name: "Blank action ID",
			action: &action.ActionRequest{
				ID:               "",
				InputText:        "Hello",
				InputLanguageID:  "",
				OutputLanguageID: "",
			},
			isTranslation: false,
			wantValid:     false,
			errorContains: "invalid action id",
		},
		{
			name: "Blank input text",
			action: &action.ActionRequest{
				ID:               "proofread",
				InputText:        "",
				InputLanguageID:  "",
				OutputLanguageID: "",
			},
			isTranslation: false,
			wantValid:     false,
			errorContains: "invalid action InputText",
		},
		{
			name: "Translation missing input language",
			action: &action.ActionRequest{
				ID:               "translate",
				InputText:        "Hello",
				InputLanguageID:  "",
				OutputLanguageID: "Ukrainian",
			},
			isTranslation: true,
			wantValid:     false,
			errorContains: "invalid action InputLanguageID",
		},
		{
			name: "Translation missing output language",
			action: &action.ActionRequest{
				ID:               "translate",
				InputText:        "Hello",
				InputLanguageID:  "English",
				OutputLanguageID: "",
			},
			isTranslation: true,
			wantValid:     false,
			errorContains: "invalid action OutputLanguageID",
		},
		{
			name: "Translation with whitespace languages",
			action: &action.ActionRequest{
				ID:               "translate",
				InputText:        "Hello",
				InputLanguageID:  "   ",
				OutputLanguageID: "Ukrainian",
			},
			isTranslation: true,
			wantValid:     false,
			errorContains: "invalid action InputLanguageID",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			valid, err := serviceImpl.isActionRequestValid(tc.action, tc.isTranslation)

			if valid != tc.wantValid {
				t.Errorf("isActionRequestValid() = %v, want %v", valid, tc.wantValid)
			}

			if !tc.wantValid {
				if tc.errorContains != "" && err != nil {
					if !strings.Contains(err.Error(), tc.errorContains) {
						t.Errorf("isActionRequestValid() error = %v, expected error to contain %s", err, tc.errorContains)
					}
				}
			} else {
				if err != nil {
					t.Errorf("isActionRequestValid() unexpected error: %v", err)
				}
			}
		})
	}
}

// TestPromptServiceLogging tests that the service properly uses the logger
func TestPromptServiceLogging(t *testing.T) {
	logger := &IntegrationTestLogger{}
	service := NewPromptService(logger)

	// Call a method that should log
	_, _ = service.GetPrompt("proofread")

	// Verify logging occurred
	if len(logger.Messages) == 0 {
		t.Error("Expected logging messages to be captured")
	}

	// Check for expected log levels
	hasInfo := false
	hasDebug := false
	for _, msg := range logger.Messages {
		if strings.HasPrefix(msg, "INFO:") {
			hasInfo = true
		}
		if strings.HasPrefix(msg, "DEBUG:") {
			hasDebug = true
		}
	}

	if !hasInfo {
		t.Error("Expected INFO level logging")
	}

	// Debug logging may or may not occur depending on the method
	if hasDebug {
		t.Log("DEBUG logging occurred as expected")
	}
}
