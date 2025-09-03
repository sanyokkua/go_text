package settings

import (
	"go_text/internal/backend/constants"
	"go_text/internal/backend/models"
)

type SettingsService interface {
	GetDefaultSettings() (models.Settings, error)
	GetCurrentSettings() (models.Settings, error)
	SetSettings(settings models.Settings) error

	GetBaseUrl() (string, error)
	GetHeaders() (map[string]string, error)
	GetModelName() (string, error)
	GetTemperature() (float64, error)
	GetDefaultInputLanguage() (string, error)
	GetDefaultOutputLanguage() (string, error)
	GetLanguages() ([]string, error)
	GetUseMarkdownForOutput() (bool, error)
}

type settingsServiceStruct struct {
	baseUrl               string
	headers               map[string]string
	modelName             string
	temperature           float64
	defaultInputLanguage  string
	defaultOutputLanguage string
	languages             []string
	useMarkdownForOutput  bool
}

func (s *settingsServiceStruct) GetDefaultSettings() (models.Settings, error) {
	return constants.DefaultSetting, nil
}

func (s *settingsServiceStruct) GetCurrentSettings() (models.Settings, error) {
	return models.Settings{
		BaseUrl:               s.baseUrl,
		Headers:               s.headers,
		ModelName:             s.modelName,
		Temperature:           s.temperature,
		DefaultInputLanguage:  s.defaultInputLanguage,
		DefaultOutputLanguage: s.defaultOutputLanguage,
		Languages:             s.languages,
		UseMarkdownForOutput:  s.useMarkdownForOutput,
	}, nil
}

func (s *settingsServiceStruct) SetSettings(settings models.Settings) error {
	s.baseUrl = settings.BaseUrl
	s.headers = settings.Headers
	s.modelName = settings.ModelName
	s.temperature = settings.Temperature
	s.defaultInputLanguage = settings.DefaultInputLanguage
	s.defaultOutputLanguage = settings.DefaultOutputLanguage
	s.languages = settings.Languages
	s.useMarkdownForOutput = settings.UseMarkdownForOutput
	return nil
}

func (s *settingsServiceStruct) GetBaseUrl() (string, error) {
	return s.baseUrl, nil
}

func (s *settingsServiceStruct) GetHeaders() (map[string]string, error) {
	return s.headers, nil
}

func (s *settingsServiceStruct) GetModelName() (string, error) {
	return s.modelName, nil
}

func (s *settingsServiceStruct) GetTemperature() (float64, error) {
	return s.temperature, nil
}

func (s *settingsServiceStruct) GetDefaultInputLanguage() (string, error) {
	return s.defaultInputLanguage, nil
}

func (s *settingsServiceStruct) GetDefaultOutputLanguage() (string, error) {
	return s.defaultOutputLanguage, nil
}

func (s *settingsServiceStruct) GetLanguages() ([]string, error) {
	return s.languages, nil
}

func (s *settingsServiceStruct) GetUseMarkdownForOutput() (bool, error) {
	return s.useMarkdownForOutput, nil
}

func NewSettingsService() SettingsService {
	defaultSettings := constants.DefaultSetting

	return &settingsServiceStruct{
		baseUrl:               defaultSettings.BaseUrl,
		headers:               defaultSettings.Headers,
		modelName:             defaultSettings.ModelName,
		temperature:           defaultSettings.Temperature,
		defaultInputLanguage:  defaultSettings.DefaultInputLanguage,
		defaultOutputLanguage: defaultSettings.DefaultOutputLanguage,
		languages:             defaultSettings.Languages,
		useMarkdownForOutput:  false,
	}
}
