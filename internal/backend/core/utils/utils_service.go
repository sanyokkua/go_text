package utils

import (
	"go_text/internal/backend/core/utils/http_utils"
	"go_text/internal/backend/core/utils/mapping"
	"go_text/internal/backend/core/utils/prompt_utils"
	"go_text/internal/backend/core/utils/string_utils"
	"go_text/internal/backend/core/utils/validators"
	"go_text/internal/backend/models"

	"resty.dev/v3"
)

type UtilsService interface {
	MakeLLMModelListRequest(client *resty.Client, baseUrl string, headers map[string]string) (*models.ModelListResponse, error)
	MakeLLMCompletionRequest(client *resty.Client, baseUrl string, headers map[string]string, request *models.ChatCompletionRequest) (*models.ChatCompletionResponse, error)

	MapPromptsToActionItems(prompts []models.Prompt) []models.AppActionItem
	MapLanguageToLanguageItem(language string) models.LanguageItem
	MapLanguagesToLanguageItems(languages []string) []models.LanguageItem
	MapModelNames(response *models.ModelListResponse) []string

	BuildPrompt(template, category string, action *models.AppActionObjWrapper, useMarkdown bool) (string, error)

	IsBlankString(value string) bool
	ReplaceTemplateParameter(template, value, prompt string) (string, error)
	SanitizeReasoningBlock(llmResponse string) (string, error)

	IsSettingsValid(settingsToValidate *models.Settings) (bool, error)
	IsAppActionObjWrapperValid(obj *models.AppActionObjWrapper, isTranslationAction bool) (bool, error)
}

type utilsService struct {
}

func (u *utilsService) MakeLLMModelListRequest(client *resty.Client, baseUrl string, headers map[string]string) (*models.ModelListResponse, error) {
	return http_utils.MakeLLMModelListRequest(client, baseUrl, headers)
}

func (u *utilsService) MakeLLMCompletionRequest(client *resty.Client, baseUrl string, headers map[string]string, request *models.ChatCompletionRequest) (*models.ChatCompletionResponse, error) {
	return http_utils.MakeLLMCompletionRequest(client, baseUrl, headers, request)
}

func (u *utilsService) MapPromptsToActionItems(prompts []models.Prompt) []models.AppActionItem {
	return mapping.MapPromptsToActionItems(prompts)
}

func (u *utilsService) MapLanguageToLanguageItem(language string) models.LanguageItem {
	return mapping.MapLanguageToLanguageItem(language)
}

func (u *utilsService) MapLanguagesToLanguageItems(languages []string) []models.LanguageItem {
	return mapping.MapLanguagesToLanguageItems(languages)
}

func (u *utilsService) MapModelNames(response *models.ModelListResponse) []string {
	return mapping.MapModelNames(response)
}

func (u *utilsService) BuildPrompt(template, category string, action *models.AppActionObjWrapper, useMarkdown bool) (string, error) {
	return prompt_utils.BuildPrompt(template, category, action, useMarkdown)
}

func (u *utilsService) IsBlankString(value string) bool {
	return string_utils.IsBlankString(value)
}

func (u *utilsService) ReplaceTemplateParameter(template, value, prompt string) (string, error) {
	return string_utils.ReplaceTemplateParameter(template, value, prompt)
}

func (u *utilsService) SanitizeReasoningBlock(llmResponse string) (string, error) {
	return string_utils.SanitizeReasoningBlock(llmResponse)
}

func (u *utilsService) IsSettingsValid(settingsToValidate *models.Settings) (bool, error) {
	return validators.IsSettingsValid(settingsToValidate)
}

func (u *utilsService) IsAppActionObjWrapperValid(obj *models.AppActionObjWrapper, isTranslationAction bool) (bool, error) {
	return validators.IsAppActionObjWrapperValid(obj, isTranslationAction)
}

func NewUtilsService() UtilsService {
	return &utilsService{}
}
