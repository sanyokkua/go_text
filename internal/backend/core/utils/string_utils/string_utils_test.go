package string_utils_test

import (
	"testing"

	"go_text/internal/backend/core/utils/string_utils"

	"github.com/stretchr/testify/assert"
)

func TestIsBlankString(t *testing.T) {
	tests := []struct {
		name  string
		input string
		want  bool
	}{
		{
			name:  "Empty string",
			input: "",
			want:  true,
		},
		{
			name:  "Whitespace only",
			input: "   \t\n  ",
			want:  true,
		},
		{
			name:  "String with content",
			input: "Hello",
			want:  false,
		},
		{
			name:  "Whitespace with content",
			input: "  Hello  ",
			want:  false,
		},
		{
			name:  "Only tabs",
			input: "\t\t",
			want:  true,
		},
		{
			name:  "Only newlines",
			input: "\n\r\n",
			want:  true,
		},
		{
			name:  "Mixed whitespace",
			input: " \t \n ",
			want:  true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := string_utils.IsBlankString(tt.input)
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestReplaceTemplateParameter(t *testing.T) {
	t.Run("Validation failures", func(t *testing.T) {
		// Test blank prompt
		_, err := string_utils.ReplaceTemplateParameter("{{token}}", "value", "")
		assert.Error(t, err)
		assert.Equal(t, "prompt cannot be blank", err.Error())

		// Test blank template
		result, err := string_utils.ReplaceTemplateParameter("", "value", "prompt")
		assert.Error(t, err)
		assert.Equal(t, "template cannot be blank", err.Error())
		assert.Equal(t, "prompt", result)
	})

	t.Run("No replacement needed", func(t *testing.T) {
		tests := []struct {
			name      string
			template  string
			value     string
			prompt    string
			want      string
			wantError bool
		}{
			{
				name:     "Template not present",
				template: "{{token}}",
				value:    "value",
				prompt:   "No tokens here",
				want:     "No tokens here",
			},
			{
				name:     "Case mismatch",
				template: "{{TOKEN}}",
				value:    "value",
				prompt:   "This is {{token}}",
				want:     "This is {{token}}",
			},
			{
				name:     "Whitespace mismatch",
				template: "{{token}}",
				value:    "value",
				prompt:   "This is {{ token }}",
				want:     "This is {{ token }}",
			},
		}

		for _, tt := range tests {
			t.Run(tt.name, func(t *testing.T) {
				got, err := string_utils.ReplaceTemplateParameter(tt.template, tt.value, tt.prompt)
				assert.NoError(t, err)
				assert.Equal(t, tt.want, got)
			})
		}
	})

	t.Run("Successful replacements", func(t *testing.T) {
		tests := []struct {
			name     string
			template string
			value    string
			prompt   string
			want     string
		}{
			{
				name:     "Single replacement",
				template: "{{user_text}}",
				value:    "Hello world",
				prompt:   "Process: {{user_text}}",
				want:     "Process: Hello world",
			},
			{
				name:     "Multiple replacements",
				template: "{{user_text}}",
				value:    "Hello world",
				prompt:   "{{user_text}}, again {{user_text}}",
				want:     "Hello world, again Hello world",
			},
			{
				name:     "Empty value replacement",
				template: "{{user_text}}",
				value:    "",
				prompt:   "Text: {{user_text}}",
				want:     "Text: ",
			},
			{
				name:     "Special characters in value",
				template: "{{user_text}}",
				value:    "Hello, world! @#$%",
				prompt:   "Input: {{user_text}}",
				want:     "Input: Hello, world! @#$%",
			},
			{
				name:     "Overlapping tokens",
				template: "{{token}}",
				value:    "replaced",
				prompt:   "{{{{token}}}}",
				want:     "{{replaced}}",
			},
		}

		for _, tt := range tests {
			t.Run(tt.name, func(t *testing.T) {
				got, err := string_utils.ReplaceTemplateParameter(tt.template, tt.value, tt.prompt)
				assert.NoError(t, err)
				assert.Equal(t, tt.want, got)
			})
		}
	})
}

func TestSanitizeReasoningBlock(t *testing.T) {
	t.Run("No reasoning blocks", func(t *testing.T) {
		tests := []struct {
			name  string
			input string
			want  string
		}{
			{
				name:  "Plain text",
				input: "This is a normal response",
				want:  "This is a normal response",
			},
			{
				name:  "Text with whitespace",
				input: "  Response with spaces  ",
				want:  "Response with spaces",
			},
			{
				name:  "Text with HTML tags",
				input: "<p>This is HTML</p>",
				want:  "<p>This is HTML</p>",
			},
			{
				name:  "Text with unclosed think tag",
				input: "This has <think> but no closing",
				want:  "This has <think> but no closing",
			},
			{
				name:  "Text with closing but no opening",
				input: "This has </think> but no opening",
				want:  "This has </think> but no opening",
			},
		}

		for _, tt := range tests {
			t.Run(tt.name, func(t *testing.T) {
				got, err := string_utils.SanitizeReasoningBlock(tt.input)
				assert.NoError(t, err)
				assert.Equal(t, tt.want, got)
			})
		}
	})

	t.Run("Single reasoning block", func(t *testing.T) {
		tests := []struct {
			name  string
			input string
			want  string
		}{
			{
				name:  "Basic block",
				input: "Before <think>reasoning</think> After",
				want:  "Before  After",
			},
			{
				name:  "Block with content",
				input: "Answer: <think>Let me think... I should say hello</think> Hello!",
				want:  "Answer:  Hello!",
			},
			{
				name:  "Block with whitespace",
				input: "  <think>  reasoning  </think>  ",
				want:  "",
			},
			{
				name:  "Block with newlines",
				input: "Line1\n<think>Line2\nLine3</think>\nLine4",
				want:  "Line1\n\nLine4",
			},
		}

		for _, tt := range tests {
			t.Run(tt.name, func(t *testing.T) {
				got, err := string_utils.SanitizeReasoningBlock(tt.input)
				assert.NoError(t, err)
				assert.Equal(t, tt.want, got)
			})
		}
	})

	t.Run("Multiple reasoning blocks", func(t *testing.T) {
		tests := []struct {
			name  string
			input string
			want  string
		}{
			{
				name:  "Two consecutive blocks",
				input: "<think>First</think><think>Second</think> Content",
				want:  "Content",
			},
			{
				name:  "Blocks with content in between",
				input: "A <think>1</think> B <think>2</think> C",
				want:  "A  B  C",
			},
			{
				name:  "Blocks with complex content",
				input: "Response: <think>Step 1: Do this\nStep 2: Do that\nResult: X</think> Answer: X",
				want:  "Response:  Answer: X",
			},
		}

		for _, tt := range tests {
			t.Run(tt.name, func(t *testing.T) {
				got, err := string_utils.SanitizeReasoningBlock(tt.input)
				assert.NoError(t, err)
				assert.Equal(t, tt.want, got)
			})
		}
	})

	t.Run("Edge cases", func(t *testing.T) {
		t.Run("Empty string", func(t *testing.T) {
			got, err := string_utils.SanitizeReasoningBlock("")
			assert.NoError(t, err)
			assert.Equal(t, "", got)
		})

		t.Run("Only reasoning block", func(t *testing.T) {
			got, err := string_utils.SanitizeReasoningBlock("<think>content</think>")
			assert.NoError(t, err)
			assert.Equal(t, "", got)
		})

		t.Run("Block with no content", func(t *testing.T) {
			got, err := string_utils.SanitizeReasoningBlock("Before <think></think> After")
			assert.NoError(t, err)
			assert.Equal(t, "Before  After", got)
		})

		t.Run("Malformed block (should not remove)", func(t *testing.T) {
			input := "This has <think> but </think> is broken"
			got, err := string_utils.SanitizeReasoningBlock(input)
			assert.NoError(t, err)
			assert.Equal(t, "This has  is broken", got)
		})
	})
}
