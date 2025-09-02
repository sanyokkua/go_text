package ui

import (
	promptsConstants "go_text/internal/backend/constants/prompts"
	"go_text/internal/backend/core/utils/mapping"
	"go_text/internal/backend/interfaces/llm"
	"go_text/internal/backend/interfaces/prompts"
	settingsInterface "go_text/internal/backend/interfaces/settings"
	uiInterfaces "go_text/internal/backend/interfaces/ui"
	"go_text/internal/backend/models/ui"
)

type appUIStateApiStruct struct {
	settingsService settingsInterface.SettingsService
	promptService   prompts.PromptService
	llmService      llm.LLMService
}

func (a *appUIStateApiStruct) GetCurrentModel() (string, error) {
	return a.settingsService.GetModelName()
}

func (a *appUIStateApiStruct) GetModelsList() ([]string, error) {
	return a.llmService.GetModelsList()
}

func (a *appUIStateApiStruct) getItems(category string) ([]ui.AppActionItem, error) {
	promptsForCategory, err := a.promptService.GetUserPromptsForCategory(category)
	if err != nil {
		return nil, err
	}
	return mapping.MapPromptsToActionItems(promptsForCategory), nil
}

func (a *appUIStateApiStruct) GetProofreadingItems() ([]ui.AppActionItem, error) {
	return a.getItems(promptsConstants.PromptCategoryProofread)
}

func (a *appUIStateApiStruct) GetFormattingItems() ([]ui.AppActionItem, error) {
	return a.getItems(promptsConstants.PromptCategoryFormat)
}

func (a *appUIStateApiStruct) GetTranslatingItems() ([]ui.AppActionItem, error) {
	return a.getItems(promptsConstants.PromptCategoryTranslation)
}

func (a *appUIStateApiStruct) GetSummarizationItems() ([]ui.AppActionItem, error) {
	return a.getItems(promptsConstants.PromptCategorySummary)
}

func (a *appUIStateApiStruct) GetInputLanguages() ([]ui.LanguageItem, error) {
	langs, err := a.settingsService.GetLanguages()
	if err != nil {
		return nil, err
	}

	return mapping.MapLanguagesToLanguageItems(langs), nil
}

func (a *appUIStateApiStruct) GetOutputLanguages() ([]ui.LanguageItem, error) {
	return a.GetInputLanguages() // The same languages lists is OK for now
}

func (a *appUIStateApiStruct) GetDefaultInputLanguage() (ui.LanguageItem, error) {
	language, err := a.settingsService.GetDefaultInputLanguage()
	if err != nil {
		return ui.LanguageItem{}, err
	}
	return mapping.MapLanguageToLanguageItem(language), nil
}

func (a *appUIStateApiStruct) GetDefaultOutputLanguage() (ui.LanguageItem, error) {
	language, err := a.settingsService.GetDefaultOutputLanguage()
	if err != nil {
		return ui.LanguageItem{}, err
	}
	return mapping.MapLanguageToLanguageItem(language), nil
}

func NewAppUIStateApi(settingsService settingsInterface.SettingsService, promptService prompts.PromptService, llmService llm.LLMService) uiInterfaces.AppUIStateApi {
	return &appUIStateApiStruct{
		settingsService: settingsService,
		promptService:   promptService,
		llmService:      llmService,
	}
}
