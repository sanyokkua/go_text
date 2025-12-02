package ui

import (
	"go_text/internal/backend/constants"
	"go_text/internal/backend/core/llm_client"
	"go_text/internal/backend/core/prompt"
	"go_text/internal/backend/core/settings"
	"go_text/internal/backend/core/utils"
	"go_text/internal/backend/models"
)

type AppUIStateApi interface {
	GetProofreadingItems() ([]models.AppActionItem, error)
	GetFormattingItems() ([]models.AppActionItem, error)
	GetTranslatingItems() ([]models.AppActionItem, error)
	GetSummarizationItems() ([]models.AppActionItem, error)
	GetTransformingItems() ([]models.AppActionItem, error)
	GetInputLanguages() ([]models.LanguageItem, error)
	GetOutputLanguages() ([]models.LanguageItem, error)
	GetDefaultInputLanguage() (models.LanguageItem, error)
	GetDefaultOutputLanguage() (models.LanguageItem, error)
	GetModelsList() ([]string, error)
	GetCurrentModel() (string, error)
}

type appUIStateApiStruct struct {
	utilsService    utils.UtilsService
	settingsService settings.SettingsService
	promptService   prompt.PromptService
	llmService      llm_client.AppLLMService
}

func (a *appUIStateApiStruct) GetCurrentModel() (string, error) {
	return a.settingsService.GetModelName()
}

func (a *appUIStateApiStruct) GetModelsList() ([]string, error) {
	return a.llmService.GetModelsList()
}

func (a *appUIStateApiStruct) getItems(category string) ([]models.AppActionItem, error) {
	promptsForCategory, err := a.promptService.GetUserPromptsForCategory(category)
	if err != nil {
		return nil, err
	}
	return a.utilsService.MapPromptsToActionItems(promptsForCategory), nil
}

func (a *appUIStateApiStruct) GetProofreadingItems() ([]models.AppActionItem, error) {
	return a.getItems(constants.PromptCategoryProofread)
}

func (a *appUIStateApiStruct) GetFormattingItems() ([]models.AppActionItem, error) {
	return a.getItems(constants.PromptCategoryFormat)
}

func (a *appUIStateApiStruct) GetTranslatingItems() ([]models.AppActionItem, error) {
	return a.getItems(constants.PromptCategoryTranslation)
}

func (a *appUIStateApiStruct) GetSummarizationItems() ([]models.AppActionItem, error) {
	return a.getItems(constants.PromptCategorySummary)
}

func (a *appUIStateApiStruct) GetTransformingItems() ([]models.AppActionItem, error) {
	return a.getItems(constants.PromptCategoryTransforming)
}

func (a *appUIStateApiStruct) GetInputLanguages() ([]models.LanguageItem, error) {
	langs, err := a.settingsService.GetLanguages()
	if err != nil {
		return nil, err
	}

	return a.utilsService.MapLanguagesToLanguageItems(langs), nil
}

func (a *appUIStateApiStruct) GetOutputLanguages() ([]models.LanguageItem, error) {
	return a.GetInputLanguages() // The same languages lists are OK for now
}

func (a *appUIStateApiStruct) GetDefaultInputLanguage() (models.LanguageItem, error) {
	language, err := a.settingsService.GetDefaultInputLanguage()
	if err != nil {
		return models.LanguageItem{}, err
	}
	return a.utilsService.MapLanguageToLanguageItem(language), nil
}

func (a *appUIStateApiStruct) GetDefaultOutputLanguage() (models.LanguageItem, error) {
	language, err := a.settingsService.GetDefaultOutputLanguage()
	if err != nil {
		return models.LanguageItem{}, err
	}
	return a.utilsService.MapLanguageToLanguageItem(language), nil
}

func NewAppUIStateApi(settingsService settings.SettingsService, promptService prompt.PromptService, llmService llm_client.AppLLMService, utilsService utils.UtilsService) AppUIStateApi {
	return &appUIStateApiStruct{
		settingsService: settingsService,
		promptService:   promptService,
		llmService:      llmService,
		utilsService:    utilsService,
	}
}
