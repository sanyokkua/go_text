package strings

import (
	"fmt"
	"strings"
	"testing"
	"time"
)

// MockLogger for testing
type MockLogger struct {
	InfoMessages  []string
	DebugMessages []string
	ErrorMessages []string
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

// TestIsBlankString tests the IsBlankString function
func TestIsBlankString(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected bool
	}{
		{
			name:     "Empty string",
			input:    "",
			expected: true,
		},
		{
			name:     "Whitespace only",
			input:    "   \t\n  ",
			expected: true,
		},
		{
			name:     "Non-empty string",
			input:    "hello world",
			expected: false,
		},
		{
			name:     "String with spaces",
			input:    " hello world ",
			expected: false,
		},
		{
			name:     "String with newlines",
			input:    "hello\nworld",
			expected: false,
		},
		{
			name:     "Single space",
			input:    " ",
			expected: true,
		},
		{
			name:     "Tab character",
			input:    "\t",
			expected: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			logger := &MockLogger{}
			service := NewStringUtilsApi(logger)
			result := service.IsBlankString(tt.input)

			if result != tt.expected {
				t.Errorf("IsBlankString(%q) = %v, want %v", tt.input, result, tt.expected)
			}
		})
	}
}

// TestReplaceTemplateParameter tests the ReplaceTemplateParameter function
func TestReplaceTemplateParameter(t *testing.T) {
	tests := []struct {
		name           string
		template       string
		value          string
		prompt         string
		expected       string
		expectError    bool
		errorContains  string
		expectDebug    bool
		expectErrorLog bool
	}{
		{
			name:        "Successful replacement",
			template:    "{{name}}",
			value:       "John",
			prompt:      "Hello {{name}}!",
			expected:    "Hello John!",
			expectError: false,
			expectDebug: true,
		},
		{
			name:        "Multiple replacements",
			template:    "{{name}}",
			value:       "John",
			prompt:      "Hello {{name}}, welcome {{name}}!",
			expected:    "Hello John, welcome John!",
			expectError: false,
			expectDebug: true,
		},
		{
			name:        "Template not found in prompt",
			template:    "{{name}}",
			value:       "John",
			prompt:      "Hello world!",
			expected:    "Hello world!",
			expectError: false,
			expectDebug: true,
		},
		{
			name:           "Empty template",
			template:       "",
			value:          "John",
			prompt:         "Hello world!",
			expected:       "Hello world!",
			expectError:    true,
			errorContains:  "template cannot be blank",
			expectErrorLog: true,
		},
		{
			name:           "Empty prompt",
			template:       "{{name}}",
			value:          "John",
			prompt:         "",
			expected:       "",
			expectError:    true,
			errorContains:  "prompt cannot be blank",
			expectErrorLog: true,
		},
		{
			name:        "Empty value",
			template:    "{{name}}",
			value:       "",
			prompt:      "Hello {{name}}!",
			expected:    "Hello !",
			expectError: false,
			expectDebug: true,
		},
		{
			name:        "Template at beginning",
			template:    "{{greeting}}",
			value:       "Hello",
			prompt:      "{{greeting}}, world!",
			expected:    "Hello, world!",
			expectError: false,
			expectDebug: true,
		},
		{
			name:        "Template at end",
			template:    "{{name}}",
			value:       "John",
			prompt:      "Hello, {{name}}",
			expected:    "Hello, John",
			expectError: false,
			expectDebug: true,
		},
		{
			name:        "Template is entire prompt",
			template:    "{{content}}",
			value:       "Hello world",
			prompt:      "{{content}}",
			expected:    "Hello world",
			expectError: false,
			expectDebug: true,
		},
		{
			name:        "Complex template with special characters",
			template:    "{{user_text}}",
			value:       "Test content with \n newlines",
			prompt:      "Process: {{user_text}}",
			expected:    "Process: Test content with \n newlines",
			expectError: false,
			expectDebug: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			logger := &MockLogger{}
			service := NewStringUtilsApi(logger)
			result, err := service.ReplaceTemplateParameter(tt.template, tt.value, tt.prompt)

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
				if tt.expectDebug && len(logger.DebugMessages) == 0 {
					t.Error("Expected debug logging to occur")
				}
			}
		})
	}
}

// TestSanitizeReasoningBlock tests the SanitizeReasoningBlock function
func TestSanitizeReasoningBlock(t *testing.T) {
	tests := []struct {
		name           string
		input          string
		expected       string
		expectError    bool
		errorContains  string
		expectInfoLog  bool
		expectDebugLog bool
	}{
		{
			name:           "Empty input",
			input:          "",
			expected:       "",
			expectError:    false,
			expectInfoLog:  false,
			expectDebugLog: true,
		},
		{
			name:           "No think blocks to remove",
			input:          "This is a normal response without think blocks.",
			expected:       "This is a normal response without think blocks.",
			expectError:    false,
			expectInfoLog:  true,
			expectDebugLog: false,
		},
		{
			name:           "Single think block to remove",
			input:          "Response text <think>thinking content</think> more text",
			expected:       "Response text  more text",
			expectError:    false,
			expectInfoLog:  true,
			expectDebugLog: false,
		},
		{
			name:           "Multiple think blocks to remove",
			input:          "Start <think>block1</think> middle <think>block2</think> end",
			expected:       "Start  middle  end",
			expectError:    false,
			expectInfoLog:  true,
			expectDebugLog: false,
		},
		{
			name:           "Think block with newlines and spaces",
			input:          "Text\n<think>\n  thinking content\n</think>\nMore",
			expected:       "Text\n\nMore",
			expectError:    false,
			expectInfoLog:  true,
			expectDebugLog: false,
		},
		{
			name:           "Only think block content",
			input:          "<think>only thinking</think>",
			expected:       "",
			expectError:    false,
			expectInfoLog:  true,
			expectDebugLog: false,
		},
		{
			name:           "Whitespace only after removal",
			input:          "   \t\n  ",
			expected:       "",
			expectError:    false,
			expectInfoLog:  false,
			expectDebugLog: true,
		},
		{
			name: "Complex multiline with think blocks",
			input: `First line
<think>
  <?xml version="1.0"?>
  <think>
    <reasoning>test</reasoning>
  </think>
</think>
Last line`,
			expected:       "First line\n\n</think>\nLast line",
			expectError:    false,
			expectInfoLog:  true,
			expectDebugLog: false,
		},
		{
			name:           "Nested think blocks (non-greedy matching)",
			input:          "Text <think>outer <think>inner</think> content</think> end",
			expected:       "Text  content</think> end",
			expectError:    false,
			expectInfoLog:  true,
			expectDebugLog: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			logger := &MockLogger{}
			service := NewStringUtilsApi(logger)
			result, err := service.SanitizeReasoningBlock(tt.input)

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
				if tt.expectDebugLog && len(logger.DebugMessages) == 0 {
					t.Error("Expected debug logging to occur")
				}
			}
		})
	}
}

// TestStringUtilsApiInterface tests that the service implements the interface correctly
func TestStringUtilsApiInterface(t *testing.T) {
	t.Run("Service should implement StringUtilsApi interface", func(t *testing.T) {
		logger := &MockLogger{}
		service := NewStringUtilsApi(logger)

		if service == nil {
			t.Fatal("NewStringUtilsApi returned nil")
		}

		// Verify the service implements the interface
		var _ = service
	})
}

// TestEdgeCases tests edge cases and boundary conditions
func TestEdgeCases(t *testing.T) {
	t.Run("IsBlankString with unicode whitespace", func(t *testing.T) {
		logger := &MockLogger{}
		service := NewStringUtilsApi(logger)

		// Test with various unicode whitespace characters
		// Note: strings.TrimSpace() handles Unicode whitespace, so these should return true
		testCases := []struct {
			input    string
			expected bool
		}{
			{"\u00A0", true}, // Non-breaking space
			{"\u2000", true}, // En quad
			{"\u2001", true}, // Em quad
			{"\u2002", true}, // En space
			{"\u2003", true}, // Em space
			{"\u2004", true}, // Three-per-em space
			{"\u2005", true}, // Four-per-em space
			{"\u2006", true}, // Six-per-em space
			{"\u2007", true}, // Figure space
			{"\u2008", true}, // Punctuation space
			{"\u2009", true}, // Thin space
			{"\u200A", true}, // Hair space
			{"\u2028", true}, // Line separator
			{"\u2029", true}, // Paragraph separator
			{"\u202F", true}, // Narrow no-break space
			{"\u205F", true}, // Medium mathematical space
			{"\u3000", true}, // Ideographic space
		}

		for _, tc := range testCases {
			result := service.IsBlankString(tc.input)
			if result != tc.expected {
				t.Errorf("IsBlankString(%q) = %v, want %v", tc.input, result, tc.expected)
			}
		}
	})

	t.Run("ReplaceTemplateParameter with large inputs", func(t *testing.T) {
		logger := &MockLogger{}
		service := NewStringUtilsApi(logger)

		// Test with large strings to ensure no performance issues
		largeTemplate := "{{large}}"
		largeValue := string(make([]byte, 10000)) // 10KB value
		largePrompt := "Start " + largeTemplate + " end"

		result, err := service.ReplaceTemplateParameter(largeTemplate, largeValue, largePrompt)
		if err != nil {
			t.Errorf("ReplaceTemplateParameter with large inputs failed: %v", err)
		}

		expected := "Start " + largeValue + " end"
		if result != expected {
			t.Errorf("ReplaceTemplateParameter with large inputs = %d bytes, want %d bytes", len(result), len(expected))
		}
	})

	t.Run("SanitizeReasoningBlock with malformed think blocks", func(t *testing.T) {
		logger := &MockLogger{}
		service := NewStringUtilsApi(logger)

		testCases := []struct {
			input    string
			expected string
		}{
			{"<think>no closing", "<think>no closing"},   // No closing tag, so no match
			{"no opening</think>", "no opening</think>"}, // No opening tag, so no match
			{"<think></think>", ""},                      // Empty think block
			{"text <think> text", "text <think> text"},   // No closing tag, so no match
		}

		for _, tc := range testCases {
			result, err := service.SanitizeReasoningBlock(tc.input)
			if err != nil {
				t.Errorf("SanitizeReasoningBlock failed for input %q: %v", tc.input, err)
			}
			if result != tc.expected {
				t.Errorf("SanitizeReasoningBlock(%q) = %q, want %q", tc.input, result, tc.expected)
			}
		}
	})
}

// TestPerformance tests that operations complete in reasonable time
func TestPerformance(t *testing.T) {
	t.Run("ReplaceTemplateParameter performance", func(t *testing.T) {
		logger := &MockLogger{}
		service := NewStringUtilsApi(logger)

		// Test with a reasonably large input
		template := "{{content}}"
		value := "replacement value"
		prompt := strings.Repeat("Some text {{content}} more text ", 1000) // 1000 replacements

		startTime := time.Now()
		result, err := service.ReplaceTemplateParameter(template, value, prompt)
		duration := time.Since(startTime)

		if err != nil {
			t.Errorf("ReplaceTemplateParameter failed: %v", err)
		}

		// Should complete in under 100ms for 1000 replacements
		if duration > 100*time.Millisecond {
			t.Errorf("ReplaceTemplateParameter took %v, expected < 100ms", duration)
		}

		// Verify correctness
		expectedCount := strings.Count(prompt, template)
		actualCount := strings.Count(result, value)
		if actualCount != expectedCount {
			t.Errorf("ReplaceTemplateParameter replaced %d occurrences, want %d", actualCount, expectedCount)
		}
	})

	t.Run("SanitizeReasoningBlock performance", func(t *testing.T) {
		logger := &MockLogger{}
		service := NewStringUtilsApi(logger)

		// Test with large input containing many think blocks
		largeInput := "Some text " + strings.Repeat("<think>content</think> ", 1000) + "end"

		startTime := time.Now()
		result, err := service.SanitizeReasoningBlock(largeInput)
		duration := time.Since(startTime)

		if err != nil {
			t.Errorf("SanitizeReasoningBlock failed: %v", err)
		}

		// Should complete in under 100ms for 1000 think block removals
		if duration > 100*time.Millisecond {
			t.Errorf("SanitizeReasoningBlock took %v, expected < 100ms", duration)
		}

		// Verify correctness - should have removed all think blocks
		if strings.Contains(result, "<think>") {
			t.Errorf("SanitizeReasoningBlock failed to remove all think blocks")
		}
	})
}
