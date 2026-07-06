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

// TestSanitizeReasoningBlock tests the SanitizeReasoningBlock method
func TestSanitizeReasoningBlock(t *testing.T) {
	tests := []struct {
		name           string
		llmResponse    string
		expected       string
		expectError    bool
		errorContains  string
		expectTraceLog bool
	}{
		{
			name:           "Empty input",
			llmResponse:    "",
			expected:       "",
			expectError:    false,
			expectTraceLog: true,
		},
		{
			name:           "Whitespace-only input",
			llmResponse:    "   \t\n  ",
			expected:       "",
			expectError:    false,
			expectTraceLog: true,
		},
		{
			name:           "No think blocks to remove",
			llmResponse:    "This is a normal response without think blocks.",
			expected:       "This is a normal response without think blocks.",
			expectError:    false,
			expectTraceLog: false,
		},
		{
			name:           "Single think block to remove",
			llmResponse:    "Response text <think>thinking content</think> more text",
			expected:       "Response text  more text",
			expectError:    false,
			expectTraceLog: false,
		},
		{
			name:           "Multiple think blocks to remove",
			llmResponse:    "Start <think>block1</think> middle <think>block2</think> end",
			expected:       "Start  middle  end",
			expectError:    false,
			expectTraceLog: false,
		},
		{
			name:           "Think block with newlines and spaces",
			llmResponse:    "Text\n<think>\n  thinking content\n</think>\nMore",
			expected:       "Text\n\nMore",
			expectError:    false,
			expectTraceLog: false,
		},
		{
			name:           "Only think block content",
			llmResponse:    "<think>only thinking</think>",
			expected:       "",
			expectError:    false,
			expectTraceLog: false,
		},
		{
			name:           "Complex multiline with think blocks",
			llmResponse:    "First line\n<think>\n  <?xml version=\"1.0\"?>\n  <think>\n    <reasoning>test</reasoning>\n  </think>\n</think>\nLast line",
			expected:       "First line\n\n</think>\nLast line",
			expectError:    false,
			expectTraceLog: false,
		},
		{
			name:           "Nested think blocks (non-greedy matching)",
			llmResponse:    "Text <think>outer <think>inner</think> content</think> end",
			expected:       "Text  content</think> end",
			expectError:    false,
			expectTraceLog: false,
		},
		{
			name:           "Malformed think block - no closing tag",
			llmResponse:    "Text <think>no closing",
			expected:       "Text <think>no closing",
			expectError:    false,
			expectTraceLog: false,
		},
		{
			name:           "Malformed think block - no opening tag",
			llmResponse:    "no opening</think>",
			expected:       "no opening</think>",
			expectError:    false,
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
				if tt.expectTraceLog && len(logger.TraceMessages) == 0 {
					t.Error("Expected trace logging to occur")
				}
			}
		})
	}
}

// TestEdgeCases tests edge cases and boundary conditions
func TestEdgeCases(t *testing.T) {
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

}

// TestPerformance tests that operations complete in reasonable time
func TestPerformance(t *testing.T) {
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
