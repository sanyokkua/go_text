package mapping

import (
	"go_text/internal/backend/models/llm"
	"go_text/internal/backend/models/prompts"
	"go_text/internal/backend/models/ui"
	"strings"
)

func MapPromptsToActionItems(prompts []prompts.Prompt) []ui.AppActionItem {
	var items = make([]ui.AppActionItem, 0)
	for _, prompt := range prompts {
		items = append(items, ui.AppActionItem{
			ActionID:   prompt.ID,
			ActionText: prompt.Name,
		})
	}
	return items
}

func MapLanguageToLanguageItem(language string) ui.LanguageItem {
	if strings.TrimSpace(language) == "" {
		return ui.LanguageItem{}
	}
	return ui.LanguageItem{
		LanguageId:   language,
		LanguageText: language,
	}
}

func MapLanguagesToLanguageItems(languages []string) []ui.LanguageItem {
	var items = make([]ui.LanguageItem, 0)
	for _, language := range languages {
		items = append(items, MapLanguageToLanguageItem(language))
	}
	return items
}

func MapModelNames(response *llm.ModelListResponse) []string {
	if len(response.Data) == 0 {
		return []string{}
	}

	var items = make([]string, 0)
	for _, item := range response.Data {
		items = append(items, item.ID)
	}

	return items
}
