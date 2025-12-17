package backend_api

import (
	"go_text/internal/v2/model"
	"go_text/internal/v2/model/action"
	"go_text/internal/v2/model/llm"
)

type MapperUtilsApi interface {
	MapPromptsToActionItems(prompts []model.Prompt) []action.Action
	MapLanguageToLanguageItem(language string) model.LanguageItem
	MapLanguagesToLanguageItems(languages []string) []model.LanguageItem
	MapModelNames(response *llm.LlmModelListResponse) []string
}
