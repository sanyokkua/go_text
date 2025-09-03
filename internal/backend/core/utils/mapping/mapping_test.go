package mapping_test

import (
	"testing"

	"go_text/internal/backend/core/utils/mapping"
	"go_text/internal/backend/models"

	"github.com/stretchr/testify/assert"
)

func TestMapPromptsToActionItems(t *testing.T) {
	tests := []struct {
		name     string
		prompts  []models.Prompt
		expected []models.AppActionItem
	}{
		{
			name:     "Empty prompts slice",
			prompts:  []models.Prompt{},
			expected: []models.AppActionItem{},
		},
		{
			name: "Single valid prompt",
			prompts: []models.Prompt{
				{ID: "1", Name: "Translate"},
			},
			expected: []models.AppActionItem{
				{ActionID: "1", ActionText: "Translate"},
			},
		},
		{
			name: "Multiple prompts",
			prompts: []models.Prompt{
				{ID: "1", Name: "Translate"},
				{ID: "2", Name: "Proofread"},
				{ID: "3", Name: "Summarize"},
			},
			expected: []models.AppActionItem{
				{ActionID: "1", ActionText: "Translate"},
				{ActionID: "2", ActionText: "Proofread"},
				{ActionID: "3", ActionText: "Summarize"},
			},
		},
		{
			name: "Prompts with empty fields",
			prompts: []models.Prompt{
				{ID: "", Name: ""},
				{ID: "2", Name: ""},
				{ID: "", Name: "Empty ID"},
			},
			expected: []models.AppActionItem{},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := mapping.MapPromptsToActionItems(tt.prompts)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestMapLanguageToLanguageItem(t *testing.T) {
	tests := []struct {
		name     string
		language string
		expected models.LanguageItem
	}{
		{
			name:     "Empty string",
			language: "",
			expected: models.LanguageItem{},
		},
		{
			name:     "Whitespace string",
			language: "   \t\n",
			expected: models.LanguageItem{},
		},
		{
			name:     "Valid language",
			language: "English",
			expected: models.LanguageItem{
				LanguageId:   "English",
				LanguageText: "English",
			},
		},
		{
			name:     "Mixed case language",
			language: "sPAnIsH",
			expected: models.LanguageItem{
				LanguageId:   "sPAnIsH",
				LanguageText: "sPAnIsH",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := mapping.MapLanguageToLanguageItem(tt.language)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestMapLanguagesToLanguageItems(t *testing.T) {
	tests := []struct {
		name      string
		languages []string
		expected  []models.LanguageItem
	}{
		{
			name:      "Empty languages slice",
			languages: []string{},
			expected:  []models.LanguageItem{},
		},
		{
			name:      "Valid languages",
			languages: []string{"English", "Spanish", "French"},
			expected: []models.LanguageItem{
				{LanguageId: "English", LanguageText: "English"},
				{LanguageId: "Spanish", LanguageText: "Spanish"},
				{LanguageId: "French", LanguageText: "French"},
			},
		},
		{
			name:      "Mixed valid and empty",
			languages: []string{"", "English", "  ", "French"},
			expected: []models.LanguageItem{
				{LanguageId: "English", LanguageText: "English"},
				{LanguageId: "French", LanguageText: "French"},
			},
		},
		{
			name:      "All empty values",
			languages: []string{"", "   ", "\t"},
			expected:  []models.LanguageItem{},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := mapping.MapLanguagesToLanguageItems(tt.languages)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestMapModelNames(t *testing.T) {
	t.Run("Nil response shouldn't causes panic", func(t *testing.T) {
		result := mapping.MapModelNames(nil)
		assert.Empty(t, result)
	})

	t.Run("Empty data slice", func(t *testing.T) {
		response := &models.ModelListResponse{
			Data: []models.Model{},
		}
		result := mapping.MapModelNames(response)
		assert.Empty(t, result)
	})

	t.Run("Single model", func(t *testing.T) {
		response := &models.ModelListResponse{
			Data: []models.Model{
				{ID: "gpt-3.5-turbo"},
			},
		}
		result := mapping.MapModelNames(response)
		assert.Equal(t, []string{"gpt-3.5-turbo"}, result)
	})

	t.Run("Multiple models", func(t *testing.T) {
		response := &models.ModelListResponse{
			Data: []models.Model{
				{ID: "model1"},
				{ID: "model2"},
				{ID: "model3"},
			},
		}
		result := mapping.MapModelNames(response)
		assert.Equal(t, []string{"model1", "model2", "model3"}, result)
	})

	t.Run("Models with empty IDs", func(t *testing.T) {
		response := &models.ModelListResponse{
			Data: []models.Model{
				{ID: ""},
				{ID: "valid-model"},
				{ID: ""},
			},
		}
		result := mapping.MapModelNames(response)
		assert.Equal(t, []string{"valid-model"}, result)
	})

	t.Run("Models with nil names", func(t *testing.T) {
		// Note: Name field is unused in this function, but testing with nil pointers
		// to ensure it doesn't affect the ID extraction
		response := &models.ModelListResponse{
			Data: []models.Model{
				{ID: "model1", Name: nil},
				{ID: "model2", Name: nil},
			},
		}
		result := mapping.MapModelNames(response)
		assert.Equal(t, []string{"model1", "model2"}, result)
	})
}
