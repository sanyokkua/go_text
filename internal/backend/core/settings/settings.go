package settings

import (
	"go_text/internal/backend/constants"
	"go_text/internal/backend/core/utils/file_utils"
	"go_text/internal/backend/models"
)

type SettingsService interface {
	GetDefaultSettings() (*models.Settings, error)
	GetCurrentSettings() (*models.Settings, error)
	SetSettings(settings *models.Settings) error

	GetBaseUrl() (string, error)
	GetModelsEndpoint() (string, error)
	GetCompletionEndpoint() (string, error)
	GetHeaders() (map[string]string, error)
	GetModelName() (string, error)
	GetTemperature() (float64, error)
	GetDefaultInputLanguage() (string, error)
	GetDefaultOutputLanguage() (string, error)
	GetLanguages() ([]string, error)
	GetUseMarkdownForOutput() (bool, error)
}

type settingsServiceStruct struct {
}

func (s *settingsServiceStruct) GetDefaultSettings() (*models.Settings, error) {
	return &constants.DefaultSetting, nil
}

func (s *settingsServiceStruct) GetCurrentSettings() (*models.Settings, error) {
	settings, err := file_utils.LoadSettings()
	if err != nil {
		return &models.Settings{}, err
	}
	return settings, nil
}

func (s *settingsServiceStruct) SetSettings(settings *models.Settings) error {
	return file_utils.SaveSettings(settings)
}

func (s *settingsServiceStruct) GetBaseUrl() (string, error) {
	settings, err := s.GetCurrentSettings()
	if err != nil {
		return "", err
	}
	return settings.BaseUrl, nil
}
func (s *settingsServiceStruct) GetModelsEndpoint() (string, error) {
	settings, err := s.GetCurrentSettings()
	if err != nil {
		return "", err
	}
	return settings.ModelsEndpoint, nil
}
func (s *settingsServiceStruct) GetCompletionEndpoint() (string, error) {
	settings, err := s.GetCurrentSettings()
	if err != nil {
		return "", err
	}
	return settings.CompletionEndpoint, nil
}

func (s *settingsServiceStruct) GetHeaders() (map[string]string, error) {
	settings, err := s.GetCurrentSettings()
	if err != nil {
		return map[string]string{}, err
	}
	return settings.Headers, nil
}

func (s *settingsServiceStruct) GetModelName() (string, error) {
	settings, err := s.GetCurrentSettings()
	if err != nil {
		return "", err
	}
	return settings.ModelName, nil
}

func (s *settingsServiceStruct) GetTemperature() (float64, error) {
	settings, err := s.GetCurrentSettings()
	if err != nil {
		return 0, err
	}
	return settings.Temperature, nil
}

func (s *settingsServiceStruct) GetDefaultInputLanguage() (string, error) {
	settings, err := s.GetCurrentSettings()
	if err != nil {
		return "", err
	}
	return settings.DefaultInputLanguage, nil
}

func (s *settingsServiceStruct) GetDefaultOutputLanguage() (string, error) {
	settings, err := s.GetCurrentSettings()
	if err != nil {
		return "", err
	}
	return settings.DefaultOutputLanguage, nil
}

func (s *settingsServiceStruct) GetLanguages() ([]string, error) {
	settings, err := s.GetCurrentSettings()
	if err != nil {
		return []string{}, err
	}
	return settings.Languages, nil
}

func (s *settingsServiceStruct) GetUseMarkdownForOutput() (bool, error) {
	settings, err := s.GetCurrentSettings()
	if err != nil {
		return false, err
	}
	return settings.UseMarkdownForOutput, nil
}

func NewSettingsService() SettingsService {
	return &settingsServiceStruct{}
}
