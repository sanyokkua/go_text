package prompts

import (
	"go_text/internal/prompts/categories"
	"regexp"
	"testing"
)

func TestApplicationPrompts_TemplateVariables(t *testing.T) {
	// Helper to strip {{ and }} from variable names
	stripBraces := func(s string) string {
		if len(s) >= 4 && s[0:2] == "{{" && s[len(s)-2:] == "}}" {
			return s[2 : len(s)-2]
		}
		return s
	}

	// Use actual constants from constants.go
	allowedVars := map[string]bool{
		stripBraces(TemplateParamText):           true,
		stripBraces(TemplateParamFormat):         true,
		stripBraces(TemplateParamInputLanguage):  true,
		stripBraces(TemplateParamOutputLanguage): true,
	}

	// Special case: Markdown Conversion prompt ID
	markdownConversionPromptID := "markdownConversion"

	// Regex to extract template variables: {{variable_name}}
	var templateVarRegex = regexp.MustCompile(`\{\{([^}]+)\}\}`)

	// Extract template variables from text
	extractTemplateVariables := func(text string) []string {
		matches := templateVarRegex.FindAllStringSubmatch(text, -1)
		variables := make([]string, 0, len(matches))
		for _, match := range matches {
			if len(match) > 1 {
				variables = append(variables, match[1])
			}
		}
		return variables
	}

	// Check if prompt contains specific required variables
	hasRequiredVariables := func(prompt Prompt, requiredVars []string) bool {
		variables := extractTemplateVariables(prompt.Value)
		variableSet := make(map[string]bool, len(variables))
		for _, v := range variables {
			variableSet[v] = true
		}

		for _, requiredVar := range requiredVars {
			if !variableSet[requiredVar] {
				return false
			}
		}
		return true
	}

	// Validate system prompt (should have NO variables)
	validateSystemPrompt := func(t *testing.T, prompt Prompt, groupName string) {
		t.Helper()
		variables := extractTemplateVariables(prompt.Value)
		if len(variables) > 0 {
			t.Errorf("System prompt '%s' (ID: %s) in group '%s' should not contain template variables, but found: %v",
				prompt.Name, prompt.ID, groupName, variables)
		}
	}

	// Validate user prompt with group-specific rules
	validateUserPrompt := func(t *testing.T, prompt Prompt, groupName string) {
		t.Helper()
		variables := extractTemplateVariables(prompt.Value)

		// Check for invalid variables
		for _, varName := range variables {
			if !allowedVars[varName] {
				t.Errorf("User prompt '%s' (ID: %s) in group '%s' uses invalid template variable: {{%s}}. Allowed variables are: %v",
					prompt.Name, prompt.ID, groupName, varName,
					[]string{
						TemplateParamText,
						TemplateParamFormat,
						TemplateParamInputLanguage,
						TemplateParamOutputLanguage,
					})
			}
		}

		// Check user_format requirement (except for markdownConversion)
		if prompt.ID != markdownConversionPromptID {
			if !hasRequiredVariables(prompt, []string{stripBraces(TemplateParamFormat)}) {
				t.Errorf("User prompt '%s' (ID: %s) in group '%s' is missing required template variable: %s",
					prompt.Name, prompt.ID, groupName, TemplateParamFormat)
			}
		}

		// Check translation-specific requirements
		if groupName == categories.PromptGroupTranslation {
			// Example sentences only need output language (generates examples in target language)
			// Actual translation prompts need both input and output languages
			isExampleSentences := prompt.ID == "exampleSentences"

			if !isExampleSentences {
				// Regular translation prompts must have both language variables
				requiredTranslationVars := []string{
					stripBraces(TemplateParamInputLanguage),
					stripBraces(TemplateParamOutputLanguage),
				}

				if !hasRequiredVariables(prompt, requiredTranslationVars) {
					missingVars := []string{}
					for _, requiredVar := range requiredTranslationVars {
						if !hasRequiredVariables(prompt, []string{requiredVar}) {
							missingVars = append(missingVars, "{{"+requiredVar+"}}")
						}
					}

					t.Errorf("Translation prompt '%s' (ID: %s) in group '%s' is missing required template variables: %v. Translation prompts must include both %s and %s",
						prompt.Name, prompt.ID, groupName, missingVars,
						TemplateParamInputLanguage, TemplateParamOutputLanguage)
				}
			} else {
				// Example sentences only need output language
				if !hasRequiredVariables(prompt, []string{stripBraces(TemplateParamOutputLanguage)}) {
					t.Errorf("Example sentences prompt '%s' (ID: %s) in group '%s' is missing required template variable: %s",
						prompt.Name, prompt.ID, groupName, TemplateParamOutputLanguage)
				}
			}
		}
	}

	// Test all prompt groups
	for groupName, group := range ApplicationPrompts.PromptGroups {
		t.Run(groupName, func(t *testing.T) {
			// Test system prompt - should have NO template variables
			t.Run("SystemPrompt", func(t *testing.T) {
				validateSystemPrompt(t, group.SystemPrompt, groupName)
			})

			// Test each user prompt - apply group-specific rules
			for promptID, prompt := range group.Prompts {
				t.Run(promptID, func(t *testing.T) {
					validateUserPrompt(t, prompt, groupName)
				})
			}
		})
	}
}
