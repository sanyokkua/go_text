package prompts

import (
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
	m.DebugMessages = append(m.DebugMessages, message)
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

func (m *MockLogger) Clear() {
	m.InfoMessages = nil
	m.DebugMessages = nil
	m.ErrorMessages = nil
}

// TestNewPromptService tests the NewPromptService constructor
func TestNewPromptService(t *testing.T) {
	t.Run("Successful creation with valid logger", func(t *testing.T) {
		logger := &MockLogger{}
		service := NewPromptService(logger)

		if service == nil {
			t.Fatal("NewPromptService returned nil")
		}
	})

	t.Run("Panic when logger is nil", func(t *testing.T) {
		defer func() {
			if r := recover(); r == nil {
				t.Error("NewPromptService did not panic when logger is nil")
			}
		}()

		_ = NewPromptService(nil)
	})
}

// TestReplaceTemplateParameter tests the ReplaceTemplateParameter method
func TestReplaceTemplateParameter(t *testing.T) {
	tests := []struct {
		name           string
		token          string
		replacement    string
		sourceTemplate string
		expected       string
		expectError    bool
		errorContains  string
		expectTrace    bool
		expectErrorLog bool
	}{
		{
			name:           "Successful replacement",
			token:          "{{name}}",
			replacement:    "John",
			sourceTemplate: "Hello {{name}}!",
			expected:       "Hello John!",
			expectError:    false,
			expectTrace:    true,
		},
		{
			name:           "Multiple replacements",
			token:          "{{name}}",
			replacement:    "John",
			sourceTemplate: "Hello {{name}}, welcome {{name}}!",
			expected:       "Hello John, welcome John!",
			expectError:    false,
			expectTrace:    true,
		},
		{
			name:           "Token not found in template",
			token:          "{{name}}",
			replacement:    "John",
			sourceTemplate: "Hello world!",
			expected:       "Hello world!",
			expectError:    false,
			expectTrace:    true,
		},
		{
			name:           "Empty token",
			token:          "",
			replacement:    "John",
			sourceTemplate: "Hello world!",
			expected:       "Hello world!",
			expectError:    true,
			errorContains:  "template token is empty",
			expectErrorLog: true,
		},
		{
			name:           "Whitespace-only token",
			token:          "   ",
			replacement:    "John",
			sourceTemplate: "Hello world!",
			expected:       "Hello world!",
			expectError:    true,
			errorContains:  "template token is empty",
			expectErrorLog: true,
		},
		{
			name:           "Empty source template",
			token:          "{{name}}",
			replacement:    "John",
			sourceTemplate: "",
			expected:       "",
			expectError:    true,
			errorContains:  "source template is empty",
			expectErrorLog: true,
		},
		{
			name:           "Whitespace-only source template",
			token:          "{{name}}",
			replacement:    "John",
			sourceTemplate: "   ",
			expected:       "",
			expectError:    true,
			errorContains:  "source template is empty",
			expectErrorLog: true,
		},
		{
			name:           "Empty replacement value",
			token:          "{{name}}",
			replacement:    "",
			sourceTemplate: "Hello {{name}}!",
			expected:       "Hello !",
			expectError:    false,
			expectTrace:    true,
		},
		{
			name:           "Token at beginning",
			token:          "{{greeting}}",
			replacement:    "Hello",
			sourceTemplate: "{{greeting}}, world!",
			expected:       "Hello, world!",
			expectError:    false,
			expectTrace:    true,
		},
		{
			name:           "Token at end",
			token:          "{{name}}",
			replacement:    "John",
			sourceTemplate: "Hello, {{name}}",
			expected:       "Hello, John",
			expectError:    false,
			expectTrace:    true,
		},
		{
			name:           "Token is entire template",
			token:          "{{content}}",
			replacement:    "Hello world",
			sourceTemplate: "{{content}}",
			expected:       "Hello world",
			expectError:    false,
			expectTrace:    true,
		},
		{
			name:           "Complex template with special characters",
			token:          "{{user_text}}",
			replacement:    "Test content with \n newlines",
			sourceTemplate: "Process: {{user_text}}",
			expected:       "Process: Test content with \n newlines",
			expectError:    false,
			expectTrace:    true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			logger := &MockLogger{}
			service := NewPromptService(logger)
			result, err := service.ReplaceTemplateParameter(tt.token, tt.replacement, tt.sourceTemplate)

			if (err != nil) != tt.expectError {
				t.Errorf("ReplaceTemplateParameter() error = %v, expectError %v", err, tt.expectError)
				return
			}

			if tt.expectError {
				if tt.errorContains != "" && err != nil {
					if !strings.Contains(err.Error(), tt.errorContains) {
						t.Errorf("ReplaceTemplateParameter() error = %v, expected error to contain %s", err, tt.errorContains)
					}
				}
				if tt.expectErrorLog && len(logger.ErrorMessages) == 0 {
					t.Error("Expected error logging to occur")
				}
			} else {
				if result != tt.expected {
					t.Errorf("ReplaceTemplateParameter() = %q, want %q", result, tt.expected)
				}
				if tt.expectTrace && len(logger.TraceMessages) == 0 {
					t.Error("Expected trace logging to occur")
				}
			}
		})
	}
}

// TestSanitizeReasoningBlock tests the SanitizeReasoningBlock method
func TestSanitizeReasoningBlock(t *testing.T) {
	tests := []struct {
		name           string
		llmResponse    string
		expected       string
		expectError    bool
		errorContains  string
		expectInfoLog  bool
		expectTraceLog bool
	}{
		{
			name:           "Empty input",
			llmResponse:    "",
			expected:       "",
			expectError:    false,
			expectInfoLog:  false,
			expectTraceLog: true,
		},
		{
			name:           "Whitespace-only input",
			llmResponse:    "   \t\n  ",
			expected:       "",
			expectError:    false,
			expectInfoLog:  false,
			expectTraceLog: true,
		},
		{
			name:           "No think blocks to remove",
			llmResponse:    "This is a normal response without think blocks.",
			expected:       "This is a normal response without think blocks.",
			expectError:    false,
			expectInfoLog:  true,
			expectTraceLog: false,
		},
		{
			name:           "Single think block to remove",
			llmResponse:    "Response text <think>thinking content</think> more text",
			expected:       "Response text  more text",
			expectError:    false,
			expectInfoLog:  true,
			expectTraceLog: false,
		},
		{
			name:           "Multiple think blocks to remove",
			llmResponse:    "Start <think>block1</think> middle <think>block2</think> end",
			expected:       "Start  middle  end",
			expectError:    false,
			expectInfoLog:  true,
			expectTraceLog: false,
		},
		{
			name:           "Think block with newlines and spaces",
			llmResponse:    "Text\n<think>\n  thinking content\n</think>\nMore",
			expected:       "Text\n\nMore",
			expectError:    false,
			expectInfoLog:  true,
			expectTraceLog: false,
		},
		{
			name:           "Only think block content",
			llmResponse:    "<think>only thinking</think>",
			expected:       "",
			expectError:    false,
			expectInfoLog:  true,
			expectTraceLog: false,
		},
		{
			name:           "Complex multiline with think blocks",
			llmResponse:    "First line\n<think>\n  <?xml version=\"1.0\"?>\n  <think>\n    <reasoning>test</reasoning>\n  </think>\n</think>\nLast line",
			expected:       "First line\n\n</think>\nLast line",
			expectError:    false,
			expectInfoLog:  true,
			expectTraceLog: false,
		},
		{
			name:           "Nested think blocks (non-greedy matching)",
			llmResponse:    "Text <think>outer <think>inner</think> content</think> end",
			expected:       "Text  content</think> end",
			expectError:    false,
			expectInfoLog:  true,
			expectTraceLog: false,
		},
		{
			name:           "Malformed think block - no closing tag",
			llmResponse:    "Text <think>no closing",
			expected:       "Text <think>no closing",
			expectError:    false,
			expectInfoLog:  true,
			expectTraceLog: false,
		},
		{
			name:           "Malformed think block - no opening tag",
			llmResponse:    "no opening</think>",
			expected:       "no opening</think>",
			expectError:    false,
			expectInfoLog:  true,
			expectTraceLog: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			logger := &MockLogger{}
			service := NewPromptService(logger)
			result, err := service.SanitizeReasoningBlock(tt.llmResponse)

			if (err != nil) != tt.expectError {
				t.Errorf("SanitizeReasoningBlock() error = %v, expectError %v", err, tt.expectError)
				return
			}

			if tt.expectError {
				if tt.errorContains != "" && err != nil {
					if !strings.Contains(err.Error(), tt.errorContains) {
						t.Errorf("SanitizeReasoningBlock() error = %v, expected error to contain %s", err, tt.errorContains)
					}
				}
			} else {
				if result != tt.expected {
					t.Errorf("SanitizeReasoningBlock() = %q, want %q", result, tt.expected)
				}
				if tt.expectInfoLog && len(logger.InfoMessages) == 0 {
					t.Error("Expected info logging to occur")
				}
				if tt.expectTraceLog && len(logger.TraceMessages) == 0 {
					t.Error("Expected trace logging to occur")
				}
			}
		})
	}
}

// TestGetAppPrompts tests the GetAppPrompts method
func TestGetAppPrompts(t *testing.T) {
	t.Run("Returns non-nil ApplicationPrompts", func(t *testing.T) {
		logger := &MockLogger{}
		service := NewPromptService(logger)

		result := service.GetAppPrompts()

		if result == nil {
			t.Error("GetAppPrompts() returned nil")
		}

		if result.PromptGroups == nil {
			t.Error("GetAppPrompts() returned nil PromptGroups")
		}

		// Check that we have the expected prompt categories
		expectedCategories := []string{
			PromptCategoryProofread,
			PromptCategoryFormat,
			PromptCategorySummary,
			PromptCategoryTranslation,
			PromptCategoryTransforming,
		}

		for _, category := range expectedCategories {
			if _, exists := result.PromptGroups[category]; !exists {
				t.Errorf("GetAppPrompts() missing expected category: %s", category)
			}
		}
	})
}

// TestGetSystemPromptByCategory tests the GetSystemPromptByCategory method
func TestGetSystemPromptByCategory(t *testing.T) {
	tests := []struct {
		name           string
		category       string
		expectError    bool
		errorContains  string
		expectPromptID string
	}{
		{
			name:           "Valid category - Proofread",
			category:       PromptCategoryProofread,
			expectError:    false,
			expectPromptID: "systemProofread",
		},
		{
			name:           "Valid category - Format",
			category:       PromptCategoryFormat,
			expectError:    false,
			expectPromptID: "systemFormat",
		},
		{
			name:           "Valid category - Summary",
			category:       PromptCategorySummary,
			expectError:    false,
			expectPromptID: "systemSummary",
		},
		{
			name:           "Valid category - Translation",
			category:       PromptCategoryTranslation,
			expectError:    false,
			expectPromptID: "systemTranslate",
		},
		{
			name:           "Valid category - Transforming",
			category:       PromptCategoryTransforming,
			expectError:    false,
			expectPromptID: "systemTransforming",
		},
		{
			name:          "Empty category",
			category:      "",
			expectError:   true,
			errorContains: "category must not be empty",
		},
		{
			name:          "Whitespace-only category",
			category:      "   ",
			expectError:   true,
			errorContains: "category must not be empty",
		},
		{
			name:          "Unknown category",
			category:      "UnknownCategory",
			expectError:   true,
			errorContains: "unknown prompt category",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			logger := &MockLogger{}
			service := NewPromptService(logger)

			result, err := service.GetSystemPromptByCategory(tt.category)

			if (err != nil) != tt.expectError {
				t.Errorf("GetSystemPromptByCategory() error = %v, expectError %v", err, tt.expectError)
				return
			}

			if tt.expectError {
				if tt.errorContains != "" && err != nil {
					if !strings.Contains(err.Error(), tt.errorContains) {
						t.Errorf("GetSystemPromptByCategory() error = %v, expected error to contain %s", err, tt.errorContains)
					}
				}
			} else {
				if result.ID != tt.expectPromptID {
					t.Errorf("GetSystemPromptByCategory() prompt ID = %q, want %q", result.ID, tt.expectPromptID)
				}
				if result.Value == "" {
					t.Error("GetSystemPromptByCategory() returned empty prompt value")
				}
			}
		})
	}
}

// TestGetUserPromptById tests the GetUserPromptById method
func TestGetUserPromptById(t *testing.T) {
	tests := []struct {
		name           string
		promptID       string
		expectError    bool
		errorContains  string
		expectPromptID string
	}{
		{
			name:           "Valid prompt ID - proofread",
			promptID:       "proofread",
			expectError:    false,
			expectPromptID: "proofread",
		},
		{
			name:           "Valid prompt ID - rewrite",
			promptID:       "rewrite",
			expectError:    false,
			expectPromptID: "rewrite",
		},
		{
			name:           "Valid prompt ID - formatFormalEmail",
			promptID:       "formatFormalEmail",
			expectError:    false,
			expectPromptID: "formatFormalEmail",
		},
		{
			name:          "Empty prompt ID",
			promptID:      "",
			expectError:   true,
			errorContains: "prompt id must not be empty",
		},
		{
			name:          "Whitespace-only prompt ID",
			promptID:      "   ",
			expectError:   true,
			errorContains: "prompt id must not be empty",
		},
		{
			name:          "Unknown prompt ID",
			promptID:      "unknownPrompt",
			expectError:   true,
			errorContains: "unknown prompt id",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			logger := &MockLogger{}
			service := NewPromptService(logger)

			result, err := service.GetUserPromptById(tt.promptID)

			if (err != nil) != tt.expectError {
				t.Errorf("GetUserPromptById() error = %v, expectError %v", err, tt.expectError)
				return
			}

			if tt.expectError {
				if tt.errorContains != "" && err != nil {
					if !strings.Contains(err.Error(), tt.errorContains) {
						t.Errorf("GetUserPromptById() error = %v, expected error to contain %s", err, tt.errorContains)
					}
				}
			} else {
				if result.ID != tt.expectPromptID {
					t.Errorf("GetUserPromptById() prompt ID = %q, want %q", result.ID, tt.expectPromptID)
				}
				if result.Value == "" {
					t.Error("GetUserPromptById() returned empty prompt value")
				}
			}
		})
	}
}

// TestGetPrompt tests the GetPrompt method
func TestGetPrompt(t *testing.T) {
	tests := []struct {
		name           string
		promptID       string
		expectError    bool
		errorContains  string
		expectPromptID string
		expectInfoLog  bool
		expectErrorLog bool
	}{
		{
			name:           "Valid prompt ID",
			promptID:       "proofread",
			expectError:    false,
			expectPromptID: "proofread",
			expectInfoLog:  true,
			expectErrorLog: false,
		},
		{
			name:           "Empty prompt ID",
			promptID:       "",
			expectError:    true,
			errorContains:  "prompt id must not be empty",
			expectInfoLog:  true,
			expectErrorLog: true,
		},
		{
			name:           "Unknown prompt ID",
			promptID:       "unknownPrompt",
			expectError:    true,
			errorContains:  "unknown prompt id",
			expectInfoLog:  true,
			expectErrorLog: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			logger := &MockLogger{}
			service := NewPromptService(logger)

			result, err := service.GetPrompt(tt.promptID)

			if (err != nil) != tt.expectError {
				t.Errorf("GetPrompt() error = %v, expectError %v", err, tt.expectError)
				return
			}

			if tt.expectError {
				if tt.errorContains != "" && err != nil {
					if !strings.Contains(err.Error(), tt.errorContains) {
						t.Errorf("GetPrompt() error = %v, expected error to contain %s", err, tt.errorContains)
					}
				}
				if tt.expectErrorLog && len(logger.ErrorMessages) == 0 {
					t.Error("Expected error logging to occur")
				}
			} else {
				if result.ID != tt.expectPromptID {
					t.Errorf("GetPrompt() prompt ID = %q, want %q", result.ID, tt.expectPromptID)
				}
				if result.Value == "" {
					t.Error("GetPrompt() returned empty prompt value")
				}
			}

			if tt.expectInfoLog && len(logger.InfoMessages) == 0 {
				t.Error("Expected info logging to occur")
			}
		})
	}
}

// TestGetSystemPrompt tests the GetSystemPrompt method
func TestGetSystemPrompt(t *testing.T) {
	tests := []struct {
		name           string
		category       string
		expectError    bool
		errorContains  string
		expectInfoLog  bool
		expectErrorLog bool
	}{
		{
			name:           "Valid category",
			category:       PromptCategoryProofread,
			expectError:    false,
			expectInfoLog:  true,
			expectErrorLog: false,
		},
		{
			name:           "Empty category",
			category:       "",
			expectError:    true,
			errorContains:  "category must not be empty",
			expectInfoLog:  true,
			expectErrorLog: true,
		},
		{
			name:           "Unknown category",
			category:       "UnknownCategory",
			expectError:    true,
			errorContains:  "unknown prompt category",
			expectInfoLog:  true,
			expectErrorLog: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			logger := &MockLogger{}
			service := NewPromptService(logger)

			result, err := service.GetSystemPrompt(tt.category)

			if (err != nil) != tt.expectError {
				t.Errorf("GetSystemPrompt() error = %v, expectError %v", err, tt.expectError)
				return
			}

			if tt.expectError {
				if tt.errorContains != "" && err != nil {
					if !strings.Contains(err.Error(), tt.errorContains) {
						t.Errorf("GetSystemPrompt() error = %v, expected error to contain %s", err, tt.errorContains)
					}
				}
				if tt.expectErrorLog && len(logger.ErrorMessages) == 0 {
					t.Error("Expected error logging to occur")
				}
			} else {
				if result == "" {
					t.Error("GetSystemPrompt() returned empty string")
				}
			}

			if tt.expectInfoLog && len(logger.InfoMessages) == 0 {
				t.Error("Expected info logging to occur")
			}
		})
	}
}

// TestBuildPrompt tests the BuildPrompt method
func TestBuildPrompt(t *testing.T) {
	tests := []struct {
		name           string
		template       string
		category       string
		action         *PromptActionRequest
		useMarkdown    bool
		expectError    bool
		errorContains  string
		expectInfoLog  bool
		expectErrorLog bool
	}{
		{
			name:           "Valid proofreading prompt",
			template:       userProofreadingBase,
			category:       PromptCategoryProofread,
			action:         &PromptActionRequest{ID: "proofread", InputText: "Test text"},
			useMarkdown:    false,
			expectError:    false,
			expectInfoLog:  true,
			expectErrorLog: false,
		},
		{
			name:           "Valid translation prompt",
			template:       userTranslatePlain,
			category:       PromptCategoryTranslation,
			action:         &PromptActionRequest{ID: "translate", InputText: "Test text", InputLanguageID: "en", OutputLanguageID: "uk"},
			useMarkdown:    false,
			expectError:    false,
			expectInfoLog:  true,
			expectErrorLog: false,
		},
		{
			name:           "Valid translation prompt with markdown",
			template:       userTranslatePlain,
			category:       PromptCategoryTranslation,
			action:         &PromptActionRequest{ID: "translate", InputText: "Test text", InputLanguageID: "en", OutputLanguageID: "uk"},
			useMarkdown:    true,
			expectError:    false,
			expectInfoLog:  true,
			expectErrorLog: false,
		},
		{
			name:           "Nil action request",
			template:       userProofreadingBase,
			category:       PromptCategoryProofread,
			action:         nil,
			useMarkdown:    false,
			expectError:    true,
			errorContains:  "action request is nil",
			expectInfoLog:  false,
			expectErrorLog: true,
		},
		{
			name:           "Empty action ID",
			template:       userProofreadingBase,
			category:       PromptCategoryProofread,
			action:         &PromptActionRequest{ID: "", InputText: "Test text"},
			useMarkdown:    false,
			expectError:    true,
			errorContains:  "action ID must not be empty",
			expectInfoLog:  true,
			expectErrorLog: true,
		},
		{
			name:           "Empty input text",
			template:       userProofreadingBase,
			category:       PromptCategoryProofread,
			action:         &PromptActionRequest{ID: "proofread", InputText: ""},
			useMarkdown:    false,
			expectError:    true,
			errorContains:  "input text must not be empty",
			expectInfoLog:  true,
			expectErrorLog: true,
		},
		{
			name:           "Translation with missing input language",
			template:       userTranslatePlain,
			category:       PromptCategoryTranslation,
			action:         &PromptActionRequest{ID: "translate", InputText: "Test text", InputLanguageID: "", OutputLanguageID: "uk"},
			useMarkdown:    false,
			expectError:    true,
			errorContains:  "input language ID must not be empty",
			expectInfoLog:  true,
			expectErrorLog: true,
		},
		{
			name:           "Translation with missing output language",
			template:       userTranslatePlain,
			category:       PromptCategoryTranslation,
			action:         &PromptActionRequest{ID: "translate", InputText: "Test text", InputLanguageID: "en", OutputLanguageID: ""},
			useMarkdown:    false,
			expectError:    true,
			errorContains:  "output language ID must not be empty",
			expectInfoLog:  true,
			expectErrorLog: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			logger := &MockLogger{}
			service := NewPromptService(logger)

			result, err := service.BuildPrompt(tt.template, tt.category, tt.action, tt.useMarkdown)

			if (err != nil) != tt.expectError {
				t.Errorf("BuildPrompt() error = %v, expectError %v", err, tt.expectError)
				return
			}

			if tt.expectError {
				if tt.errorContains != "" && err != nil {
					if !strings.Contains(err.Error(), tt.errorContains) {
						t.Errorf("BuildPrompt() error = %v, expected error to contain %s", err, tt.errorContains)
					}
				}
				if tt.expectErrorLog && len(logger.ErrorMessages) == 0 {
					t.Error("Expected error logging to occur")
				}
			} else {
				if result == "" {
					t.Error("BuildPrompt() returned empty string")
				}
				// Verify that template parameters were replaced
				if strings.Contains(result, "{{user_text}}") {
					t.Error("BuildPrompt() did not replace {{user_text}} template parameter")
				}
				if strings.Contains(result, "{{user_format}}") {
					t.Error("BuildPrompt() did not replace {{user_format}} template parameter")
				}
			}

			if tt.expectInfoLog && len(logger.InfoMessages) == 0 {
				t.Error("Expected info logging to occur")
			}
		})
	}
}

// TestEdgeCases tests edge cases and boundary conditions
func TestEdgeCases(t *testing.T) {
	t.Run("ReplaceTemplateParameter with unicode characters", func(t *testing.T) {
		logger := &MockLogger{}
		service := NewPromptService(logger)

		testCases := []struct {
			token       string
			replacement string
			template    string
			expected    string
		}{
			{
				token:       "{{name}}",
				replacement: "José",
				template:    "Hello {{name}}!",
				expected:    "Hello José!",
			},
			{
				token:       "{{text}}",
				replacement: "Привіт світе!",
				template:    "Message: {{text}}",
				expected:    "Message: Привіт світе!",
			},
			{
				token:       "{{emoji}}",
				replacement: "👋",
				template:    "Greeting: {{emoji}}",
				expected:    "Greeting: 👋",
			},
		}

		for _, tc := range testCases {
			result, err := service.ReplaceTemplateParameter(tc.token, tc.replacement, tc.template)
			if err != nil {
				t.Errorf("ReplaceTemplateParameter failed for unicode test: %v", err)
			}
			if result != tc.expected {
				t.Errorf("ReplaceTemplateParameter(%q, %q, %q) = %q, want %q", tc.token, tc.replacement, tc.template, result, tc.expected)
			}
		}
	})

	t.Run("SanitizeReasoningBlock with unicode characters", func(t *testing.T) {
		logger := &MockLogger{}
		service := NewPromptService(logger)

		testCases := []struct {
			input    string
			expected string
		}{
			{
				input:    "Привіт <think>думки</think> світе!",
				expected: "Привіт  світе!",
			},
			{
				input:    "👋 <think>thinking</think> 🌍",
				expected: "👋  🌍",
			},
		}

		for _, tc := range testCases {
			result, err := service.SanitizeReasoningBlock(tc.input)
			if err != nil {
				t.Errorf("SanitizeReasoningBlock failed for unicode test: %v", err)
			}
			if result != tc.expected {
				t.Errorf("SanitizeReasoningBlock(%q) = %q, want %q", tc.input, result, tc.expected)
			}
		}
	})

	t.Run("GetPrompt with whitespace-only IDs", func(t *testing.T) {
		logger := &MockLogger{}
		service := NewPromptService(logger)

		testCases := []struct {
			promptID    string
			expectError bool
		}{
			{"\t", true},
			{"\n", true},
			{"  \t\n  ", true},
		}

		for _, tc := range testCases {
			_, err := service.GetPrompt(tc.promptID)
			if (err != nil) != tc.expectError {
				t.Errorf("GetPrompt(%q) error = %v, expectError %v", tc.promptID, err, tc.expectError)
			}
		}
	})
}

// TestPerformance tests that operations complete in reasonable time
func TestPerformance(t *testing.T) {
	t.Run("ReplaceTemplateParameter performance", func(t *testing.T) {
		logger := &MockLogger{}
		service := NewPromptService(logger)

		// Test with a reasonably large input
		token := "{{content}}"
		value := "replacement value"
		template := strings.Repeat("Some text {{content}} more text ", 100) // 100 replacements

		result, err := service.ReplaceTemplateParameter(token, value, template)
		if err != nil {
			t.Errorf("ReplaceTemplateParameter failed: %v", err)
		}

		// Verify correctness
		expectedCount := strings.Count(template, token)
		actualCount := strings.Count(result, value)
		if actualCount != expectedCount {
			t.Errorf("ReplaceTemplateParameter replaced %d occurrences, want %d", actualCount, expectedCount)
		}
	})

	t.Run("SanitizeReasoningBlock performance", func(t *testing.T) {
		logger := &MockLogger{}
		service := NewPromptService(logger)

		// Test with large input containing many think blocks
		largeInput := "Some text " + strings.Repeat("<think>content</think> ", 100) + "end"

		result, err := service.SanitizeReasoningBlock(largeInput)
		if err != nil {
			t.Errorf("SanitizeReasoningBlock failed: %v", err)
		}

		// Verify correctness - should have removed all think blocks
		if strings.Contains(result, "<think>") {
			t.Errorf("SanitizeReasoningBlock failed to remove all think blocks")
		}
	})
}

// TestPromptServiceInterface tests that the service implements the expected interface
func TestPromptServiceInterface(t *testing.T) {
	t.Run("Service should implement expected methods", func(t *testing.T) {
		logger := &MockLogger{}
		service := NewPromptService(logger)

		if service == nil {
			t.Fatal("NewPromptService returned nil")
		}

		// Verify the service implements the expected methods by calling them
		_, err := service.ReplaceTemplateParameter("{{test}}", "value", "template {{test}}")
		if err != nil {
			t.Errorf("ReplaceTemplateParameter failed: %v", err)
		}

		_, err = service.SanitizeReasoningBlock("test")
		if err != nil {
			t.Errorf("SanitizeReasoningBlock failed: %v", err)
		}

		prompts := service.GetAppPrompts()
		if prompts == nil {
			t.Error("GetAppPrompts returned nil")
		}

		_, err = service.GetSystemPromptByCategory(PromptCategoryProofread)
		if err != nil {
			t.Errorf("GetSystemPromptByCategory failed: %v", err)
		}

		_, err = service.GetUserPromptById("proofread")
		if err != nil {
			t.Errorf("GetUserPromptById failed: %v", err)
		}

		_, err = service.GetPrompt("proofread")
		if err != nil {
			t.Errorf("GetPrompt failed: %v", err)
		}

		_, err = service.GetSystemPrompt(PromptCategoryProofread)
		if err != nil {
			t.Errorf("GetSystemPrompt failed: %v", err)
		}

		action := &PromptActionRequest{ID: "proofread", InputText: "test"}
		_, err = service.BuildPrompt(userProofreadingBase, PromptCategoryProofread, action, false)
		if err != nil {
			t.Errorf("BuildPrompt failed: %v", err)
		}
	})
}
