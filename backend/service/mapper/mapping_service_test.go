package mapper

import (
	"fmt"
	"go_text/backend/model"
	"go_text/backend/model/action"
	"go_text/backend/model/llm"
	"testing"
	"time"
)

// TestNewMapperUtilsService tests the factory function
func TestNewMapperUtilsService(t *testing.T) {
	t.Run("Should create mapper service", func(t *testing.T) {
		service := NewMapperUtilsService()

		if service == nil {
			t.Fatal("NewMapperUtilsService returned nil")
		}

		// Verify it implements the interface
		var _ = service
	})
}

// TestMapPromptsToActionItems tests the prompt to action item mapping
func TestMapPromptsToActionItems(t *testing.T) {
	tests := []struct {
		name     string
		input    []model.Prompt
		expected []action.Action
	}{
		{
			name:     "Empty input",
			input:    []model.Prompt{},
			expected: []action.Action{},
		},
		{
			name: "Single valid prompt",
			input: []model.Prompt{
				{ID: "test1", Name: "Test Action 1"},
			},
			expected: []action.Action{
				{ID: "test1", Text: "Test Action 1"},
			},
		},
		{
			name: "Multiple valid prompts",
			input: []model.Prompt{
				{ID: "test1", Name: "Test Action 1"},
				{ID: "test2", Name: "Test Action 2"},
				{ID: "test3", Name: "Test Action 3"},
			},
			expected: []action.Action{
				{ID: "test1", Text: "Test Action 1"},
				{ID: "test2", Text: "Test Action 2"},
				{ID: "test3", Text: "Test Action 3"},
			},
		},
		{
			name: "Prompts with blank names",
			input: []model.Prompt{
				{ID: "test1", Name: ""},
				{ID: "test2", Name: "Valid Action"},
				{ID: "", Name: "Test Action 3"},
			},
			expected: []action.Action{
				{ID: "test2", Text: "Valid Action"},
			},
		},
		{
			name: "Prompts with blank IDs",
			input: []model.Prompt{
				{ID: "", Name: "Test Action 1"},
				{ID: "test2", Name: "Valid Action"},
				{ID: "", Name: "Test Action 3"},
			},
			expected: []action.Action{
				{ID: "test2", Text: "Valid Action"},
			},
		},
		{
			name: "All invalid prompts",
			input: []model.Prompt{
				{ID: "", Name: ""},
				{ID: "", Name: "Test"},
				{ID: "test", Name: ""},
			},
			expected: []action.Action{},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			service := NewMapperUtilsService()
			result := service.MapPromptsToActionItems(tt.input)

			if len(result) != len(tt.expected) {
				t.Errorf("MapPromptsToActionItems() length = %d, want %d", len(result), len(tt.expected))
			}

			for i, item := range result {
				if item.ID != tt.expected[i].ID {
					t.Errorf("MapPromptsToActionItems() item %d ID = %s, want %s", i, item.ID, tt.expected[i].ID)
				}
				if item.Text != tt.expected[i].Text {
					t.Errorf("MapPromptsToActionItems() item %d Text = %s, want %s", i, item.Text, tt.expected[i].Text)
				}
			}
		})
	}
}

// TestMapLanguageToLanguageItem tests the language to language item mapping
func TestMapLanguageToLanguageItem(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected model.LanguageItem
	}{
		{
			name:     "Empty language",
			input:    "",
			expected: model.LanguageItem{},
		},
		{
			name:  "Valid language",
			input: "English",
			expected: model.LanguageItem{
				LanguageId:   "English",
				LanguageText: "English",
			},
		},
		{
			name:  "Language with spaces",
			input: "Ukrainian Language",
			expected: model.LanguageItem{
				LanguageId:   "Ukrainian Language",
				LanguageText: "Ukrainian Language",
			},
		},
		{
			name:  "Language with special characters",
			input: "Français",
			expected: model.LanguageItem{
				LanguageId:   "Français",
				LanguageText: "Français",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			service := NewMapperUtilsService()
			result := service.MapLanguageToLanguageItem(tt.input)

			if result.LanguageId != tt.expected.LanguageId {
				t.Errorf("MapLanguageToLanguageItem() LanguageId = %s, want %s", result.LanguageId, tt.expected.LanguageId)
			}
			if result.LanguageText != tt.expected.LanguageText {
				t.Errorf("MapLanguageToLanguageItem() LanguageText = %s, want %s", result.LanguageText, tt.expected.LanguageText)
			}
		})
	}
}

// TestMapLanguagesToLanguageItems tests the languages to language items mapping
func TestMapLanguagesToLanguageItems(t *testing.T) {
	tests := []struct {
		name     string
		input    []string
		expected []model.LanguageItem
	}{
		{
			name:     "Empty input",
			input:    []string{},
			expected: []model.LanguageItem{},
		},
		{
			name:  "Single language",
			input: []string{"English"},
			expected: []model.LanguageItem{
				{LanguageId: "English", LanguageText: "English"},
			},
		},
		{
			name:  "Multiple languages",
			input: []string{"English", "Ukrainian", "French"},
			expected: []model.LanguageItem{
				{LanguageId: "English", LanguageText: "English"},
				{LanguageId: "Ukrainian", LanguageText: "Ukrainian"},
				{LanguageId: "French", LanguageText: "French"},
			},
		},
		{
			name:  "Languages with blank entries",
			input: []string{"English", "", "Ukrainian", ""},
			expected: []model.LanguageItem{
				{LanguageId: "English", LanguageText: "English"},
				{LanguageId: "Ukrainian", LanguageText: "Ukrainian"},
			},
		},
		{
			name:     "All blank languages",
			input:    []string{"", "", ""},
			expected: []model.LanguageItem{},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			service := NewMapperUtilsService()
			result := service.MapLanguagesToLanguageItems(tt.input)

			if len(result) != len(tt.expected) {
				t.Errorf("MapLanguagesToLanguageItems() length = %d, want %d", len(result), len(tt.expected))
			}

			for i, item := range result {
				if item.LanguageId != tt.expected[i].LanguageId {
					t.Errorf("MapLanguagesToLanguageItems() item %d LanguageId = %s, want %s", i, item.LanguageId, tt.expected[i].LanguageId)
				}
				if item.LanguageText != tt.expected[i].LanguageText {
					t.Errorf("MapLanguagesToLanguageItems() item %d LanguageText = %s, want %s", i, item.LanguageText, tt.expected[i].LanguageText)
				}
			}
		})
	}
}

// TestMapModelNames tests the model name mapping
func TestMapModelNames(t *testing.T) {
	tests := []struct {
		name     string
		input    *llm.LlmModelListResponse
		expected []string
	}{
		{
			name:     "Nil response",
			input:    nil,
			expected: []string{},
		},
		{
			name:     "Empty data",
			input:    &llm.LlmModelListResponse{Data: []llm.LlmModel{}},
			expected: []string{},
		},
		{
			name: "Single model",
			input: &llm.LlmModelListResponse{
				Data: []llm.LlmModel{
					{ID: "model1"},
				},
			},
			expected: []string{"model1"},
		},
		{
			name: "Multiple models",
			input: &llm.LlmModelListResponse{
				Data: []llm.LlmModel{
					{ID: "model1"},
					{ID: "model2"},
					{ID: "model3"},
				},
			},
			expected: []string{"model1", "model2", "model3"},
		},
		{
			name: "Models with blank IDs",
			input: &llm.LlmModelListResponse{
				Data: []llm.LlmModel{
					{ID: "model1"},
					{ID: ""},
					{ID: "model2"},
					{ID: ""},
				},
			},
			expected: []string{"model1", "model2"},
		},
		{
			name: "All blank model IDs",
			input: &llm.LlmModelListResponse{
				Data: []llm.LlmModel{
					{ID: ""},
					{ID: ""},
				},
			},
			expected: []string{},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			service := NewMapperUtilsService()
			result := service.MapModelNames(tt.input)

			if len(result) != len(tt.expected) {
				t.Errorf("MapModelNames() length = %d, want %d", len(result), len(tt.expected))
			}

			for i, item := range result {
				if item != tt.expected[i] {
					t.Errorf("MapModelNames() item %d = %s, want %s", i, item, tt.expected[i])
				}
			}
		})
	}
}

// TestEdgeCases tests edge cases and boundary conditions
func TestEdgeCases(t *testing.T) {
	t.Run("Large input arrays", func(t *testing.T) {
		service := NewMapperUtilsService()

		// Test with large array of prompts
		largePrompts := make([]model.Prompt, 1000)
		for i := 0; i < 1000; i++ {
			largePrompts[i] = model.Prompt{
				ID:   fmt.Sprintf("prompt%d", i),
				Name: fmt.Sprintf("Prompt %d", i),
			}
		}

		result := service.MapPromptsToActionItems(largePrompts)
		if len(result) != 1000 {
			t.Errorf("Expected 1000 items, got %d", len(result))
		}

		// Test with large array of languages
		largeLanguages := make([]string, 1000)
		for i := 0; i < 1000; i++ {
			largeLanguages[i] = fmt.Sprintf("Language %d", i)
		}

		resultLangs := service.MapLanguagesToLanguageItems(largeLanguages)
		if len(resultLangs) != 1000 {
			t.Errorf("Expected 1000 language items, got %d", len(resultLangs))
		}
	})

	t.Run("Unicode and special characters", func(t *testing.T) {
		service := NewMapperUtilsService()

		// Test unicode in prompts
		unicodePrompts := []model.Prompt{
			{ID: "test1", Name: "Тест 1"}, // Ukrainian
			{ID: "test2", Name: "测试 2"},   // Chinese
			{ID: "test3", Name: "テスト 3"},  // Japanese
		}

		result := service.MapPromptsToActionItems(unicodePrompts)
		if len(result) != 3 {
			t.Errorf("Expected 3 unicode items, got %d", len(result))
		}

		// Test unicode in languages
		unicodeLangs := []string{"Українська", "中文", "日本語"}
		langItems := service.MapLanguagesToLanguageItems(unicodeLangs)
		if len(langItems) != 3 {
			t.Errorf("Expected 3 unicode language items, got %d", len(langItems))
		}
	})

	t.Run("Performance with large inputs", func(t *testing.T) {
		service := NewMapperUtilsService()

		// Test performance with very large input
		startTime := time.Now()

		veryLargePrompts := make([]model.Prompt, 10000)
		for i := 0; i < 10000; i++ {
			veryLargePrompts[i] = model.Prompt{
				ID:   fmt.Sprintf("prompt%d", i),
				Name: fmt.Sprintf("Prompt %d", i),
			}
		}

		result := service.MapPromptsToActionItems(veryLargePrompts)
		duration := time.Since(startTime)

		if len(result) != 10000 {
			t.Errorf("Expected 10000 items, got %d", len(result))
		}

		// Should complete in reasonable time (under 100ms for 10k items)
		if duration > 100*time.Millisecond {
			t.Errorf("Mapping took %v, expected < 100ms", duration)
		}
	})
}
