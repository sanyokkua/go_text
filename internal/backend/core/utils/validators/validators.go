package validators

import (
	"fmt"
	"go_text/internal/backend/core/utils/string_utils"
	"go_text/internal/backend/models"
	"strings"
)

func IsSettingsValid(settingsToValidate *models.Settings) (bool, error) {
	if settingsToValidate == nil {
		return false, fmt.Errorf("settings cannot be nil")
	}
	if strings.TrimSpace(settingsToValidate.CurrentProviderConfig.BaseUrl) == "" {
		return false, fmt.Errorf("cannot save settings: base url is empty")
	}
	if strings.HasSuffix(settingsToValidate.CurrentProviderConfig.BaseUrl, "/") {
		return false, fmt.Errorf("baseUrl must not end with /")
	}

	hasHttpPrefix := strings.HasPrefix(settingsToValidate.CurrentProviderConfig.BaseUrl, "http://")
	hasHttpsPrefix := strings.HasPrefix(settingsToValidate.CurrentProviderConfig.BaseUrl, "https://")
	urlHasHttpSPrefix := hasHttpPrefix || hasHttpsPrefix

	if !urlHasHttpSPrefix {
		return false, fmt.Errorf("baseUrl must start with http:// or https://")
	}

	if strings.TrimSpace(settingsToValidate.CurrentProviderConfig.ModelsEndpoint) == "" {
		return false, fmt.Errorf("modelsEndpoint must not be empty")
	}
	if !strings.HasPrefix(settingsToValidate.CurrentProviderConfig.ModelsEndpoint, "/") {
		return false, fmt.Errorf("modelsEndpoint must start with /")
	}
	if strings.HasSuffix(settingsToValidate.CurrentProviderConfig.ModelsEndpoint, "/") {
		return false, fmt.Errorf("modelsEndpoint must not end with /")
	}

	if strings.TrimSpace(settingsToValidate.CurrentProviderConfig.CompletionEndpoint) == "" {
		return false, fmt.Errorf("completionEndpoint must not be empty")
	}
	if !strings.HasPrefix(settingsToValidate.CurrentProviderConfig.CompletionEndpoint, "/") {
		return false, fmt.Errorf("completionEndpoint must start with /")
	}
	if strings.HasSuffix(settingsToValidate.CurrentProviderConfig.CompletionEndpoint, "/") {
		return false, fmt.Errorf("completionEndpoint must not end with /")
	}

	if strings.TrimSpace(settingsToValidate.ModelConfig.ModelName) == "" {
		return false, fmt.Errorf("modelName must not be empty")
	}
	if strings.TrimSpace(settingsToValidate.LanguageConfig.DefaultInputLanguage) == "" {
		return false, fmt.Errorf("defaultInputLanguage must not be empty")
	}
	if settingsToValidate.ModelConfig.Temperature < 0 || settingsToValidate.ModelConfig.Temperature > 1 {
		return false, fmt.Errorf("temperature must be greater than 0 and less than 1")
	}
	if strings.TrimSpace(settingsToValidate.LanguageConfig.DefaultOutputLanguage) == "" {
		return false, fmt.Errorf("defaultOutputLanguage must not be empty")
	}

	if len(settingsToValidate.LanguageConfig.Languages) == 0 {
		return false, fmt.Errorf("languages must not be empty")
	}

	return true, nil

}

func IsAppActionObjWrapperValid(obj *models.AppActionObjWrapper, isTranslationAction bool) (bool, error) {
	if obj == nil {
		return false, fmt.Errorf("appActionObjWrapper must not be nil")
	}
	if string_utils.IsBlankString(obj.ActionID) {
		return false, fmt.Errorf("invalid action id")
	}
	if string_utils.IsBlankString(obj.ActionInput) {
		return false, fmt.Errorf("invalid action input")
	}
	if isTranslationAction {
		if string_utils.IsBlankString(obj.ActionInputLanguage) {
			return false, fmt.Errorf("invalid action selectedInputLanguage")
		}
		if string_utils.IsBlankString(obj.ActionOutputLanguage) {
			return false, fmt.Errorf("invalid action selectedOutputLanguage")
		}
	}
	return true, nil
}
