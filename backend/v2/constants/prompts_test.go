package constants

import (
	"go_text/backend/v2/model"
	"testing"
)

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
