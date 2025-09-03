package prompt_utils_test

import (
	"testing"

	"go_text/internal/backend/constants"
	"go_text/internal/backend/core/utils/prompt_utils"
	"go_text/internal/backend/models"

	"github.com/stretchr/testify/assert"
)

func TestBuildPrompt_InvalidInputs(t *testing.T) {
	validAction := &models.AppActionObjWrapper{
		ActionID:             "1",
		ActionInput:          "Test input",
		ActionInputLanguage:  "English",
		ActionOutputLanguage: "Ukrainian",
	}

	tests := []struct {
		name        string
		template    string
		category    string
		action      *models.AppActionObjWrapper
		useMarkdown bool
		wantError   string
	}{
		{
			name:      "Blank template",
			template:  "   ",
			category:  constants.PromptCategoryProofread,
			action:    validAction,
			wantError: "invalid template",
		},
		{
			name:      "Blank category",
			template:  "Template {{user_text}}",
			category:  "   ",
			action:    validAction,
			wantError: "invalid category",
		},
		{
			name:      "Nil action",
			template:  "Template {{user_text}}",
			category:  constants.PromptCategoryProofread,
			action:    nil,
			wantError: "action is nil",
		},
		{
			name:     "Invalid action - blank ActionID",
			template: "Template {{user_text}}",
			category: constants.PromptCategoryProofread,
			action: &models.AppActionObjWrapper{
				ActionID:    "",
				ActionInput: "Test input",
			},
			wantError: "invalid action id",
		},
		{
			name:     "Invalid action - blank ActionInput",
			template: "Template {{user_text}}",
			category: constants.PromptCategoryProofread,
			action: &models.AppActionObjWrapper{
				ActionID:    "1",
				ActionInput: "",
			},
			wantError: "invalid action input",
		},
		{
			name:     "Invalid translation action - blank input language",
			template: "Template {{user_text}}",
			category: constants.PromptCategoryTranslation,
			action: &models.AppActionObjWrapper{
				ActionID:             "1",
				ActionInput:          "Test input",
				ActionInputLanguage:  "",
				ActionOutputLanguage: "Ukrainian",
			},
			wantError: "invalid action inputLanguage",
		},
		{
			name:     "Invalid translation action - blank output language",
			template: "Template {{user_text}}",
			category: constants.PromptCategoryTranslation,
			action: &models.AppActionObjWrapper{
				ActionID:             "1",
				ActionInput:          "Test input",
				ActionInputLanguage:  "English",
				ActionOutputLanguage: "",
			},
			wantError: "invalid action outputLanguage",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := prompt_utils.BuildPrompt(tt.template, tt.category, tt.action, tt.useMarkdown)
			assert.Error(t, err)
			assert.Contains(t, err.Error(), tt.wantError)
		})
	}
}

func TestBuildPrompt_NonTranslationAction(t *testing.T) {
	action := &models.AppActionObjWrapper{
		ActionID:    "proofread-1",
		ActionInput: "Hello world",
	}

	tests := []struct {
		name        string
		template    string
		useMarkdown bool
		expected    string
	}{
		{
			name:     "Basic template without format",
			template: "Proofread this: {{user_text}}",
			expected: "Proofread this: Hello world",
		},
		{
			name:        "Template with markdown format",
			template:    "Format as: {{user_format}}\nContent: {{user_text}}",
			useMarkdown: true,
			expected:    "Format as: Markdown\nContent: Hello world",
		},
		{
			name:        "Template with plaintext format",
			template:    "Format as: {{user_format}}\nContent: {{user_text}}",
			useMarkdown: false,
			expected:    "Format as: PlainText\nContent: Hello world",
		},
		{
			name:     "Template with multiple text tokens",
			template: "First: {{user_text}}, Second: {{user_text}}",
			expected: "First: Hello world, Second: Hello world",
		},
		{
			name:     "Template with extra tokens",
			template: "Keep this: {{extra}} and {{user_text}}",
			expected: "Keep this: {{extra}} and Hello world",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := prompt_utils.BuildPrompt(
				tt.template,
				constants.PromptCategoryProofread,
				action,
				tt.useMarkdown,
			)
			assert.NoError(t, err)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestBuildPrompt_TranslationAction(t *testing.T) {
	action := &models.AppActionObjWrapper{
		ActionID:             "translate-1",
		ActionInput:          "Hello world",
		ActionInputLanguage:  "English",
		ActionOutputLanguage: "Ukrainian",
	}

	tests := []struct {
		name        string
		template    string
		useMarkdown bool
		expected    string
	}{
		{
			name:     "Basic translation template",
			template: "Translate from {{input_language}} to {{output_language}}: {{user_text}}",
			expected: "Translate from English to Ukrainian: Hello world",
		},
		{
			name:        "Translation with markdown format",
			template:    "Format as: {{user_format}}\nTranslate {{input_language}}→{{output_language}}: {{user_text}}",
			useMarkdown: true,
			expected:    "Format as: Markdown\nTranslate English→Ukrainian: Hello world",
		},
		{
			name:        "Translation with plaintext format",
			template:    "Format as: {{user_format}}\nTranslate {{input_language}}→{{output_language}}: {{user_text}}",
			useMarkdown: false,
			expected:    "Format as: PlainText\nTranslate English→Ukrainian: Hello world",
		},
		{
			name:     "Translation without format token",
			template: "Convert {{input_language}} text '{{user_text}}' to {{output_language}}",
			expected: "Convert English text 'Hello world' to Ukrainian",
		},
		{
			name:     "Translation with extra tokens",
			template: "Keep {{extra}}: {{input_language}}→{{output_language}} {{user_text}}",
			expected: "Keep {{extra}}: English→Ukrainian Hello world",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := prompt_utils.BuildPrompt(
				tt.template,
				constants.PromptCategoryTranslation,
				action,
				tt.useMarkdown,
			)
			assert.NoError(t, err)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestBuildPrompt_EdgeCases(t *testing.T) {
	t.Run("Whitespace in template tokens", func(t *testing.T) {
		action := &models.AppActionObjWrapper{
			ActionID:    "1",
			ActionInput: "Test input",
		}

		template := "This is a test: {{ user_text }} with spaces"
		expected := "This is a test: {{ user_text }} with spaces"

		result, err := prompt_utils.BuildPrompt(
			template,
			constants.PromptCategoryProofread,
			action,
			false,
		)
		assert.NoError(t, err)
		assert.Equal(t, expected, result)
	})

	t.Run("Case sensitivity in tokens", func(t *testing.T) {
		action := &models.AppActionObjWrapper{
			ActionID:    "1",
			ActionInput: "Test input",
		}

		template := "This is {{UsEr_tExT}} with mixed case"
		expected := "This is {{UsEr_tExT}} with mixed case"

		result, err := prompt_utils.BuildPrompt(
			template,
			constants.PromptCategoryProofread,
			action,
			false,
		)
		assert.NoError(t, err)
		assert.Equal(t, expected, result)
	})

	t.Run("Empty replacement values (should not happen due to validation)", func(t *testing.T) {
		// This tests the theoretical case where validation passes but values are empty
		// In reality, validation prevents this, but testing the replacement logic
		action := &models.AppActionObjWrapper{
			ActionID:             "1",
			ActionInput:          "",
			ActionInputLanguage:  "",
			ActionOutputLanguage: "",
		}

		template := "{{user_text}} {{input_language}} {{output_language}}"

		// For non-translation, only ActionInput is validated (and it's empty -> should fail)
		_, err := prompt_utils.BuildPrompt(
			template,
			constants.PromptCategoryProofread,
			action,
			false,
		)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "invalid action input")

		// For translation, all fields are validated (and they're empty -> should fail)
		_, err = prompt_utils.BuildPrompt(
			template,
			constants.PromptCategoryTranslation,
			action,
			false,
		)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "invalid action input")
	})

	t.Run("Template with no tokens", func(t *testing.T) {
		action := &models.AppActionObjWrapper{
			ActionID:    "1",
			ActionInput: "Test input",
		}

		template := "This is a plain template with no tokens"
		expected := "This is a plain template with no tokens"

		result, err := prompt_utils.BuildPrompt(
			template,
			constants.PromptCategoryProofread,
			action,
			false,
		)
		assert.NoError(t, err)
		assert.Equal(t, expected, result)
	})
}
