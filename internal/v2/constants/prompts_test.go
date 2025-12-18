package constants

import (
	"go_text/internal/v2/model"
	"testing"
)

// TestGetUserPromptCategories tests the GetUserPromptCategories function
func TestGetUserPromptCategories(t *testing.T) {
	t.Run("Should return all prompt categories", func(t *testing.T) {
		categories := GetUserPromptCategories()

		// Should return all known categories
		expectedCategories := []string{
			PromptCategoryProofread,
			PromptCategoryFormat,
			PromptCategoryTranslation,
			PromptCategorySummary,
			PromptCategoryTransforming,
		}

		if len(categories) != len(expectedCategories) {
			t.Errorf("GetUserPromptCategories() returned %d categories, want %d", len(categories), len(expectedCategories))
		}

		// Check that all expected categories are present
		categoryMap := make(map[string]bool)
		for _, cat := range categories {
			categoryMap[cat] = true
		}

		for _, expectedCat := range expectedCategories {
			if !categoryMap[expectedCat] {
				t.Errorf("GetUserPromptCategories() missing expected category: %s", expectedCat)
			}
		}

		// Check that no unexpected categories are present
		for _, cat := range categories {
			found := false
			for _, expectedCat := range expectedCategories {
				if cat == expectedCat {
					found = true
					break
				}
			}
			if !found {
				t.Errorf("GetUserPromptCategories() returned unexpected category: %s", cat)
			}
		}
	})
}

// TestGetSystemPromptByCategory tests the GetSystemPromptByCategory function
func TestGetSystemPromptByCategory(t *testing.T) {
	tests := []struct {
		name           string
		category       string
		wantErr        bool
		expectedPrompt model.Prompt
	}{
		{
			name:     "Valid proofreading category",
			category: PromptCategoryProofread,
			wantErr:  false,
			expectedPrompt: model.Prompt{
				ID:       "systemProofread",
				Name:     "System Proofread",
				Type:     PromptTypeSystem,
				Category: PromptCategoryProofread,
				Value:    systemPromptProofreading,
			},
		},
		{
			name:     "Valid formatting category",
			category: PromptCategoryFormat,
			wantErr:  false,
			expectedPrompt: model.Prompt{
				ID:       "systemFormat",
				Name:     "System Format",
				Type:     PromptTypeSystem,
				Category: PromptCategoryFormat,
				Value:    systemPromptFormatting,
			},
		},
		{
			name:     "Valid translation category",
			category: PromptCategoryTranslation,
			wantErr:  false,
			expectedPrompt: model.Prompt{
				ID:       "systemTranslate",
				Name:     "System Translate",
				Type:     PromptTypeSystem,
				Category: PromptCategoryTranslation,
				Value:    systemPromptTranslation,
			},
		},
		{
			name:     "Valid summary category",
			category: PromptCategorySummary,
			wantErr:  false,
			expectedPrompt: model.Prompt{
				ID:       "systemSummary",
				Name:     "System Translate",
				Type:     PromptTypeSystem,
				Category: PromptCategorySummary,
				Value:    systemPromptSummarization,
			},
		},
		{
			name:     "Valid transforming category",
			category: PromptCategoryTransforming,
			wantErr:  false,
			expectedPrompt: model.Prompt{
				ID:       "systemTransforming",
				Name:     "System Transforming",
				Type:     PromptTypeSystem,
				Category: PromptCategoryTransforming,
				Value:    systemPromptTransforming,
			},
		},
		{
			name:           "Invalid category",
			category:       "invalid_category",
			wantErr:        true,
			expectedPrompt: model.Prompt{},
		},
		{
			name:           "Empty category",
			category:       "",
			wantErr:        true,
			expectedPrompt: model.Prompt{},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := GetSystemPromptByCategory(tt.category)

			if (err != nil) != tt.wantErr {
				t.Errorf("GetSystemPromptByCategory() error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			if !tt.wantErr {
				if got.ID != tt.expectedPrompt.ID {
					t.Errorf("GetSystemPromptByCategory() got ID = %v, want %v", got.ID, tt.expectedPrompt.ID)
				}
				if got.Name != tt.expectedPrompt.Name {
					t.Errorf("GetSystemPromptByCategory() got Name = %v, want %v", got.Name, tt.expectedPrompt.Name)
				}
				if got.Type != tt.expectedPrompt.Type {
					t.Errorf("GetSystemPromptByCategory() got Type = %v, want %v", got.Type, tt.expectedPrompt.Type)
				}
				if got.Category != tt.expectedPrompt.Category {
					t.Errorf("GetSystemPromptByCategory() got Category = %v, want %v", got.Category, tt.expectedPrompt.Category)
				}
				if got.Value != tt.expectedPrompt.Value {
					t.Errorf("GetSystemPromptByCategory() got Value = %v, want %v", got.Value, tt.expectedPrompt.Value)
				}
			}
		})
	}
}

// TestGetUserPromptById tests the GetUserPromptById function
func TestGetUserPromptById(t *testing.T) {
	tests := []struct {
		name           string
		id             string
		wantErr        bool
		expectedPrompt model.Prompt
	}{
		{
			name:    "Valid proofread prompt",
			id:      "proofread",
			wantErr: false,
			expectedPrompt: model.Prompt{
				ID:       "proofread",
				Name:     "Proofread",
				Type:     PromptTypeUser,
				Category: PromptCategoryProofread,
				Value:    userProofreadingBase,
			},
		},
		{
			name:    "Valid rewrite prompt",
			id:      "rewrite",
			wantErr: false,
			expectedPrompt: model.Prompt{
				ID:       "rewrite",
				Name:     "Rewrite",
				Type:     PromptTypeUser,
				Category: PromptCategoryProofread,
				Value:    userRewritingBase,
			},
		},
		{
			name:    "Valid format formal email prompt",
			id:      "formatFormalEmail",
			wantErr: false,
			expectedPrompt: model.Prompt{
				ID:       "formatFormalEmail",
				Name:     "Formal Email",
				Type:     PromptTypeUser,
				Category: PromptCategoryFormat,
				Value:    userFormatFormalEmail,
			},
		},
		{
			name:    "Valid translate plain prompt",
			id:      "translatePlain",
			wantErr: false,
			expectedPrompt: model.Prompt{
				ID:       "translatePlain",
				Name:     "Translate",
				Type:     PromptTypeUser,
				Category: PromptCategoryTranslation,
				Value:    userTranslatePlain,
			},
		},
		{
			name:    "Valid summary base prompt",
			id:      "summaryBase",
			wantErr: false,
			expectedPrompt: model.Prompt{
				ID:       "summaryBase",
				Name:     "Summarize",
				Type:     PromptTypeUser,
				Category: PromptCategorySummary,
				Value:    userSummarizeBase,
			},
		},
		{
			name:    "Valid transforming user story prompt",
			id:      "transformingUserStory",
			wantErr: false,
			expectedPrompt: model.Prompt{
				ID:       "transformingUserStory",
				Name:     "Create User Story",
				Type:     PromptTypeUser,
				Category: PromptCategoryTransforming,
				Value:    userTransformingUserStory,
			},
		},
		{
			name:           "Invalid prompt ID",
			id:             "invalid_prompt_id",
			wantErr:        true,
			expectedPrompt: model.Prompt{},
		},
		{
			name:           "Empty prompt ID",
			id:             "",
			wantErr:        true,
			expectedPrompt: model.Prompt{},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := GetUserPromptById(tt.id)

			if (err != nil) != tt.wantErr {
				t.Errorf("GetUserPromptById() error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			if !tt.wantErr {
				if got.ID != tt.expectedPrompt.ID {
					t.Errorf("GetUserPromptById() got ID = %v, want %v", got.ID, tt.expectedPrompt.ID)
				}
				if got.Name != tt.expectedPrompt.Name {
					t.Errorf("GetUserPromptById() got Name = %v, want %v", got.Name, tt.expectedPrompt.Name)
				}
				if got.Type != tt.expectedPrompt.Type {
					t.Errorf("GetUserPromptById() got Type = %v, want %v", got.Type, tt.expectedPrompt.Type)
				}
				if got.Category != tt.expectedPrompt.Category {
					t.Errorf("GetUserPromptById() got Category = %v, want %v", got.Category, tt.expectedPrompt.Category)
				}
				if got.Value != tt.expectedPrompt.Value {
					t.Errorf("GetUserPromptById() got Value = %v, want %v", got.Value, tt.expectedPrompt.Value)
				}
			}
		})
	}
}

// TestGetUserPromptsByCategory tests the GetUserPromptsByCategory function
func TestGetUserPromptsByCategory(t *testing.T) {
	tests := []struct {
		name          string
		category      string
		wantErr       bool
		expectedCount int
	}{
		{
			name:          "Valid proofreading category",
			category:      PromptCategoryProofread,
			wantErr:       false,
			expectedCount: 8, // proofread, rewrite, and 6 rewrite styles
		},
		{
			name:          "Valid formatting category",
			category:      PromptCategoryFormat,
			wantErr:       false,
			expectedCount: 7, // 7 formatting prompts
		},
		{
			name:          "Valid translation category",
			category:      PromptCategoryTranslation,
			wantErr:       false,
			expectedCount: 2, // translatePlain, translateDictionary
		},
		{
			name:          "Valid summary category",
			category:      PromptCategorySummary,
			wantErr:       false,
			expectedCount: 4, // 4 summarization prompts
		},
		{
			name:          "Valid transforming category",
			category:      PromptCategoryTransforming,
			wantErr:       false,
			expectedCount: 1, // transformingUserStory
		},
		{
			name:          "Invalid category",
			category:      "invalid_category",
			wantErr:       true,
			expectedCount: 0,
		},
		{
			name:          "Empty category",
			category:      "",
			wantErr:       true,
			expectedCount: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := GetUserPromptsByCategory(tt.category)

			if (err != nil) != tt.wantErr {
				t.Errorf("GetUserPromptsByCategory() error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			if !tt.wantErr {
				if len(got) != tt.expectedCount {
					t.Errorf("GetUserPromptsByCategory() got length = %v, want %v", len(got), tt.expectedCount)
				}

				// Verify that all prompts have the correct category
				for _, prompt := range got {
					if prompt.Category != tt.category {
						t.Errorf("GetUserPromptsByCategory() got prompt with category = %v, want %v", prompt.Category, tt.category)
					}
				}

				// Verify that all prompts are user prompts (not system prompts)
				for _, prompt := range got {
					if prompt.Type != PromptTypeUser {
						t.Errorf("GetUserPromptsByCategory() got prompt with type = %v, want %v", prompt.Type, PromptTypeUser)
					}
				}
			}
		})
	}
}

// TestPromptDataConsistency tests that the prompt data is consistent
func TestPromptDataConsistency(t *testing.T) {
	t.Run("System prompts should have correct types", func(t *testing.T) {
		for category, prompt := range systemPromptByCategory {
			if prompt.Type != PromptTypeSystem {
				t.Errorf("System prompt for category %s has type %s, want %s", category, prompt.Type, PromptTypeSystem)
			}
			if prompt.Category != category {
				t.Errorf("System prompt for category %s has category %s", category, prompt.Category)
			}
		}
	})

	t.Run("User prompts should have correct types", func(t *testing.T) {
		for _, prompt := range userPrompts {
			if prompt.Type != PromptTypeUser {
				t.Errorf("User prompt %s has type %s, want %s", prompt.ID, prompt.Type, PromptTypeUser)
			}
		}
	})

	t.Run("User prompts by category should match individual prompts", func(t *testing.T) {
		for category, prompts := range userPromptsByCategory {
			for _, prompt := range prompts {
				if prompt.Category != category {
					t.Errorf("Prompt %s in category %s has category %s", prompt.ID, category, prompt.Category)
				}
				if prompt.Type != PromptTypeUser {
					t.Errorf("Prompt %s in category %s has type %s, want %s", prompt.ID, category, prompt.Type, PromptTypeUser)
				}
			}
		}
	})

	t.Run("All user prompts should be accessible by ID", func(t *testing.T) {
		for _, prompt := range userPrompts {
			foundPrompt, err := GetUserPromptById(prompt.ID)
			if err != nil {
				t.Errorf("Failed to get prompt by ID %s: %v", prompt.ID, err)
			}
			if foundPrompt.ID != prompt.ID {
				t.Errorf("GetUserPromptById(%s) returned prompt with ID %s", prompt.ID, foundPrompt.ID)
			}
		}
	})

	t.Run("All user prompts should be in their category lists", func(t *testing.T) {
		for _, prompt := range userPrompts {
			promptsInCategory, err := GetUserPromptsByCategory(prompt.Category)
			if err != nil {
				t.Errorf("Failed to get prompts for category %s: %v", prompt.Category, err)
				continue
			}

			found := false
			for _, p := range promptsInCategory {
				if p.ID == prompt.ID {
					found = true
					break
				}
			}

			if !found {
				t.Errorf("Prompt %s (category %s) not found in category list", prompt.ID, prompt.Category)
			}
		}
	})

	t.Run("GetUserPromptCategories should return all categories with prompts", func(t *testing.T) {
		categories := GetUserPromptCategories()

		// All categories returned should have at least one prompt
		for _, category := range categories {
			prompts, err := GetUserPromptsByCategory(category)
			if err != nil {
				t.Errorf("Category %s returned by GetUserPromptCategories has no prompts: %v", category, err)
			}
			if len(prompts) == 0 {
				t.Errorf("Category %s returned by GetUserPromptCategories has empty prompt list", category)
			}
		}
	})
}
