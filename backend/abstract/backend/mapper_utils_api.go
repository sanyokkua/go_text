package backend

import (
	"go_text/backend/model"
	"go_text/backend/model/action"
	"go_text/backend/model/llm"
)

type MapperUtilsApi interface {
	MapPromptsToActionItems(prompts []model.Prompt) []action.Action
	MapLanguageToLanguageItem(language string) model.LanguageItem
	MapLanguagesToLanguageItems(languages []string) []model.LanguageItem
	MapModelNames(response *llm.LlmModelListResponse) []string
}
