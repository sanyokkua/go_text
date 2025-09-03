package mapping

import (
	"go_text/internal/backend/core/utils/string_utils"
	"go_text/internal/backend/models"
)

func MapPromptsToActionItems(prompts []models.Prompt) []models.AppActionItem {
	var items = make([]models.AppActionItem, 0)
	for _, prompt := range prompts {
		if string_utils.IsBlankString(prompt.Name) || string_utils.IsBlankString(prompt.ID) {
			continue
		}
		items = append(items, models.AppActionItem{
			ActionID:   prompt.ID,
			ActionText: prompt.Name,
		})
	}
	return items
}

func MapLanguageToLanguageItem(language string) models.LanguageItem {
	if string_utils.IsBlankString(language) {
		return models.LanguageItem{}
	}
	return models.LanguageItem{
		LanguageId:   language,
		LanguageText: language,
	}
}

func MapLanguagesToLanguageItems(languages []string) []models.LanguageItem {
	var items = make([]models.LanguageItem, 0)
	for _, language := range languages {
		if string_utils.IsBlankString(language) {
			continue
		}
		items = append(items, MapLanguageToLanguageItem(language))
	}
	return items
}

func MapModelNames(response *models.ModelListResponse) []string {
	if response == nil {
		return []string{}
	}
	if len(response.Data) == 0 {
		return []string{}
	}

	var items = make([]string, 0)
	for _, item := range response.Data {
		if string_utils.IsBlankString(item.ID) {
			continue
		}
		items = append(items, item.ID)
	}

	return items
}
