package prompt_utils

import (
	"fmt"
	"go_text/internal/backend/constants"
	"go_text/internal/backend/core/utils/string_utils"
	"go_text/internal/backend/core/utils/validators"
	"go_text/internal/backend/models"
	"strings"
)

func BuildPrompt(template, category string, action *models.AppActionObjWrapper, useMarkdown bool) (string, error) {
	if action == nil {
		return "", fmt.Errorf("action is nil")
	}
	if string_utils.IsBlankString(template) {
		return "", fmt.Errorf("invalid template")
	}
	if string_utils.IsBlankString(category) {
		return "", fmt.Errorf("invalid category")
	}
	isTranslation := category == constants.PromptCategoryTranslation

	isValidAction, err := validators.IsAppActionObjWrapperValid(action, isTranslation)
	if !isValidAction {
		return "", err
	}

	replacements := map[string]string{
		constants.TemplateParamText: action.ActionInput,
	}

	if isTranslation {
		replacements[constants.TemplateParamInputLanguage] = action.ActionInputLanguage
		replacements[constants.TemplateParamOutputLanguage] = action.ActionOutputLanguage
	}

	if strings.Contains(template, constants.TemplateParamFormat) {
		format := constants.OutputFormatPlainText
		if useMarkdown {
			format = constants.OutputFormatMarkdown
		}
		replacements[constants.TemplateParamFormat] = format
	}

	for token, val := range replacements {
		template, err = string_utils.ReplaceTemplateParameter(token, val, template)
		if err != nil {
			return "", fmt.Errorf("ReplaceTemplateParameter(%s): %w", token, err)
		}
	}
	return template, nil
}
