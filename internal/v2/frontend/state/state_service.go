package api

import (
	"go_text/internal/v2/model"
)

type stateService struct {
}

func (s *stateService) GetInputLanguages() ([]model.LanguageItem, error) {
	//TODO implement me
	panic("implement me")
}

func (s *stateService) GetOutputLanguages() ([]model.LanguageItem, error) {
	//TODO implement me
	panic("implement me")
}

func (s *stateService) GetDefaultInputLanguage() (model.LanguageItem, error) {
	//TODO implement me
	panic("implement me")
}

func (s *stateService) GetDefaultOutputLanguage() (model.LanguageItem, error) {
	//TODO implement me
	panic("implement me")
}
