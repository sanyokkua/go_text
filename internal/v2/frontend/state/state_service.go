package stateapi

import (
	"fmt"
	"time"

	"go_text/internal/v2/api"
	"go_text/internal/v2/backend_api"
	"go_text/internal/v2/model"
)

type stateService struct {
	logger          backend_api.LoggingApi
	settingsService backend_api.SettingsServiceApi
	mapper          backend_api.MapperUtilsApi
	inputLanguages  []model.LanguageItem
	outputLanguages []model.LanguageItem
}

func (s *stateService) GetInputLanguages() ([]model.LanguageItem, error) {
	startTime := time.Now()
	s.logger.LogInfo("[GetInputLanguages] Fetching available input languages")

	if s.inputLanguages != nil && len(s.inputLanguages) > 0 {
		return s.inputLanguages, nil
	}

	cfg, err := s.settingsService.GetCurrentSettings()
	if err != nil {
		s.logger.LogError(fmt.Sprintf("[GetInputLanguages] Failed to get current settings: %v", err))
		return nil, fmt.Errorf("failed to retrieve settings: %w", err)
	}

	languages := s.mapper.MapLanguagesToLanguageItems(cfg.LanguageConfig.Languages)
	duration := time.Since(startTime)
	s.inputLanguages = languages
	s.logger.LogInfo(fmt.Sprintf("[GetInputLanguages] Successfully retrieved %d input languages in %v", len(languages), duration))

	return languages, nil
}

func (s *stateService) GetOutputLanguages() ([]model.LanguageItem, error) {
	startTime := time.Now()
	s.logger.LogInfo("[GetOutputLanguages] Fetching available output languages")

	if s.outputLanguages != nil && len(s.outputLanguages) > 0 {
		return s.outputLanguages, nil
	}

	// Reuse the input languages logic since they're the same
	languages, err := s.GetInputLanguages()
	if err != nil {
		s.logger.LogError(fmt.Sprintf("[GetOutputLanguages] Failed to get output languages: %v", err))
		return nil, fmt.Errorf("failed to retrieve output languages: %w", err)
	}

	s.outputLanguages = languages
	duration := time.Since(startTime)
	s.logger.LogInfo(fmt.Sprintf("[GetOutputLanguages] Successfully retrieved %d output languages in %v", len(languages), duration))

	return languages, nil
}

func (s *stateService) GetDefaultInputLanguage() (model.LanguageItem, error) {
	startTime := time.Now()
	s.logger.LogInfo("[GetDefaultInputLanguage] Fetching default input language")

	cfg, err := s.settingsService.GetCurrentSettings()
	if err != nil {
		s.logger.LogError(fmt.Sprintf("[GetDefaultInputLanguage] Failed to get current settings: %v", err))
		return model.LanguageItem{}, fmt.Errorf("failed to retrieve settings: %w", err)
	}

	languageItem := s.mapper.MapLanguageToLanguageItem(cfg.LanguageConfig.DefaultInputLanguage)
	duration := time.Since(startTime)
	s.logger.LogInfo(fmt.Sprintf("[GetDefaultInputLanguage] Successfully retrieved default input language '%s' in %v", languageItem.LanguageId, duration))

	return languageItem, nil
}

func (s *stateService) GetDefaultOutputLanguage() (model.LanguageItem, error) {
	startTime := time.Now()
	s.logger.LogInfo("[GetDefaultOutputLanguage] Fetching default output language")

	cfg, err := s.settingsService.GetCurrentSettings()
	if err != nil {
		s.logger.LogError(fmt.Sprintf("[GetDefaultOutputLanguage] Failed to get current settings: %v", err))
		return model.LanguageItem{}, fmt.Errorf("failed to retrieve settings: %w", err)
	}

	languageItem := s.mapper.MapLanguageToLanguageItem(cfg.LanguageConfig.DefaultOutputLanguage)
	duration := time.Since(startTime)
	s.logger.LogInfo(fmt.Sprintf("[GetDefaultOutputLanguage] Successfully retrieved default output language '%s' in %v", languageItem.LanguageId, duration))

	return languageItem, nil
}

func NewStateApiService(logger backend_api.LoggingApi, settingsService backend_api.SettingsServiceApi, mapper backend_api.MapperUtilsApi) api.StateApi {
	return &stateService{
		logger:          logger,
		settingsService: settingsService,
		mapper:          mapper,
	}
}
