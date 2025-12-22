package mapper

import (
	backend_api2 "go_text/backend/v2/abstract/backend"
	"go_text/backend/v2/model"
	"go_text/backend/v2/model/action"
	"go_text/backend/v2/model/llm"
)

type mapperService struct {
	stringUtils backend_api2.StringUtilsApi
}

func (m mapperService) MapPromptsToActionItems(prompts []model.Prompt) []action.Action {
	var items = make([]action.Action, 0)
	for _, prompt := range prompts {
		if m.stringUtils.IsBlankString(prompt.Name) || m.stringUtils.IsBlankString(prompt.ID) {
			continue
		}
		items = append(items, action.Action{
			ID:   prompt.ID,
			Text: prompt.Name,
		})
	}
	return items
}

func (m mapperService) MapLanguageToLanguageItem(language string) model.LanguageItem {
	if m.stringUtils.IsBlankString(language) {
		return model.LanguageItem{}
	}
	return model.LanguageItem{
		LanguageId:   language,
		LanguageText: language,
	}
}

func (m mapperService) MapLanguagesToLanguageItems(languages []string) []model.LanguageItem {
	var items = make([]model.LanguageItem, 0)
	for _, language := range languages {
		if m.stringUtils.IsBlankString(language) {
			continue
		}
		items = append(items, m.MapLanguageToLanguageItem(language))
	}
	return items
}

func (m mapperService) MapModelNames(response *llm.LlmModelListResponse) []string {
	if response == nil {
		return []string{}
	}
	if len(response.Data) == 0 {
		return []string{}
	}

	var items = make([]string, 0)
	for _, item := range response.Data {
		if m.stringUtils.IsBlankString(item.ID) {
			continue
		}
		items = append(items, item.ID)
	}

	return items
}

func NewMapperUtilsService(stringUtils backend_api2.StringUtilsApi) backend_api2.MapperUtilsApi {
	return &mapperService{
		stringUtils: stringUtils,
	}
}
