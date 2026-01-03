package settings

import (
	"encoding/json"
	"fmt"
	"os"
	"time"

	"go_text/internal/file"

	"github.com/wailsapp/wails/v2/pkg/logger"
)

// SettingsRepository handles the persistence of application settings
type SettingsRepository struct {
	logger          logger.Logger
	fileUtils       *file.FileUtilsService
	currentSettings *Settings
}

// NewRepository creates a new SettingsRepository with required dependencies
func NewRepository(logger logger.Logger, fileUtils *file.FileUtilsService) *SettingsRepository {
	if logger == nil {
		panic("logger cannot be nil")
	}
	if fileUtils == nil {
		panic("fileUtils cannot be nil")
	}

	return &SettingsRepository{
		logger:    logger,
		fileUtils: fileUtils,
	}
}

// InitDefaultSettingsIfAbsent initializes default settings if no settings file exists
func (s *SettingsRepository) InitDefaultSettingsIfAbsent() error {
	const op = "SettingsRepository.InitDefaultSettingsIfAbsent"
	startTime := time.Now()
	s.logger.Info(fmt.Sprintf("%s: checking for default settings initialization", op))

	settingsPath, err := s.fileUtils.GetAppSettingsFilePath()
	if err != nil {
		s.logger.Error(fmt.Sprintf("%s: failed to get settings file path: %v", op, err))
		return fmt.Errorf("%s: failed to get settings file path: %w", op, err)
	}
	s.logger.Trace(fmt.Sprintf("%s: settings file path: %s", op, settingsPath))

	// Check if a settings file already exists
	if _, err := os.Stat(settingsPath); err == nil {
		s.logger.Info(fmt.Sprintf("%s: settings file already exists, skipping initialization", op))
		return nil
	}

	// Handle only "file not found" errors, fail on others
	if !os.IsNotExist(err) {
		s.logger.Error(fmt.Sprintf("%s: unexpected error checking settings file: %v", op, err))
		return fmt.Errorf("%s: failed to check settings file existence: %w", op, err)
	}

	// Create a default settings file
	s.logger.Info(fmt.Sprintf("%s: creating default settings file", op))

	data, err := json.MarshalIndent(DefaultSetting, "", "  ")
	if err != nil {
		s.logger.Error(fmt.Sprintf("%s: failed to marshal default settings: %v", op, err))
		return fmt.Errorf("%s: failed to create default settings JSON: %w", op, err)
	}

	if err := os.WriteFile(settingsPath, data, 0600); err != nil {
		s.logger.Error(fmt.Sprintf("%s: failed to write default settings file: %v", op, err))
		return fmt.Errorf("%s: failed to write default settings file: %w", op, err)
	}

	duration := time.Since(startTime)
	s.logger.Info(fmt.Sprintf("%s: successfully created default settings in %v", op, duration))
	return nil
}

// loadSettings loads settings from a file after ensuring defaults exist
func (s *SettingsRepository) loadSettings() (*Settings, error) {
	const op = "SettingsRepository.loadSettings"
	startTime := time.Now()
	s.logger.Info(fmt.Sprintf("%s: loading application settings", op))

	// Ensure default settings exist before loading
	if err := s.InitDefaultSettingsIfAbsent(); err != nil {
		s.logger.Error(fmt.Sprintf("%s: failed to initialize default settings: %v", op, err))
		return nil, fmt.Errorf("%s: initialization failed: %w", op, err)
	}

	settingsPath, err := s.fileUtils.GetAppSettingsFilePath()
	if err != nil {
		s.logger.Error(fmt.Sprintf("%s: failed to get settings file path: %v", op, err))
		return nil, fmt.Errorf("%s: could not determine settings file location: %w", op, err)
	}
	s.logger.Trace(fmt.Sprintf("%s: loading settings from: %s", op, settingsPath))

	data, err := os.ReadFile(settingsPath)
	if err != nil {
		s.logger.Error(fmt.Sprintf("%s: failed to read settings file: %v", op, err))
		return nil, fmt.Errorf("%s: could not read settings file '%s': %w", op, settingsPath, err)
	}

	var settings Settings
	if err := json.Unmarshal(data, &settings); err != nil {
		s.logger.Error(fmt.Sprintf("%s: failed to parse settings JSON: %v", op, err))
		return nil, fmt.Errorf("%s: invalid JSON format in settings file: %w", op, err)
	}

	duration := time.Since(startTime)
	s.logger.Info(fmt.Sprintf("%s: successfully loaded settings in %v", op, duration))
	return &settings, nil
}

// GetSettings returns current settings, loading from a file if not cached
func (s *SettingsRepository) GetSettings() (*Settings, error) {
	const op = "SettingsRepository.GetSettings"

	if s.currentSettings != nil {
		s.logger.Debug(fmt.Sprintf("%s: returning cached settings", op))
		return s.currentSettings, nil
	}

	settings, err := s.loadSettings()
	if err != nil {
		s.logger.Error(fmt.Sprintf("%s: failed to load settings: %v", op, err))
		return nil, fmt.Errorf("%s: could not load application settings: %w", op, err)
	}

	if settings == nil {
		s.logger.Error(fmt.Sprintf("%s: loaded settings are nil", op))
		return nil, fmt.Errorf("%s: settings loaded as nil value", op)
	}

	s.currentSettings = settings
	s.logger.Debug(fmt.Sprintf("%s: cached loaded settings", op))
	return s.currentSettings, nil
}

// SaveSettings persists settings to file and updates the cache
func (s *SettingsRepository) SaveSettings(settings *Settings) (*Settings, error) {
	const op = "SettingsRepository.SaveSettings"
	if settings == nil {
		s.logger.Error(fmt.Sprintf("%s: received nil settings to save", op))
		return nil, fmt.Errorf("%s: cannot save nil settings", op)
	}

	startTime := time.Now()
	s.logger.Info(fmt.Sprintf("%s: starting settings save operation", op))

	settingsPath, err := s.fileUtils.GetAppSettingsFilePath()
	if err != nil {
		s.logger.Error(fmt.Sprintf("%s: failed to get settings file path: %v", op, err))
		return nil, fmt.Errorf("%s: could not determine save location: %w", op, err)
	}
	s.logger.Trace(fmt.Sprintf("%s: saving settings to: %s", op, settingsPath))

	data, err := json.MarshalIndent(settings, "", "  ")
	if err != nil {
		s.logger.Error(fmt.Sprintf("%s: failed to marshal settings: %v", op, err))
		return nil, fmt.Errorf("%s: could not serialize settings to JSON: %w", op, err)
	}

	if err := os.WriteFile(settingsPath, data, 0600); err != nil {
		s.logger.Error(fmt.Sprintf("%s: failed to write settings file: %v", op, err))
		return nil, fmt.Errorf("%s: could not write to file '%s': %w", op, settingsPath, err)
	}

	s.currentSettings = settings
	duration := time.Since(startTime)
	s.logger.Info(fmt.Sprintf("%s: successfully saved settings in %v", op, duration))
	return s.currentSettings, nil
}

func (s *SettingsRepository) getSettingsAndValidateNotNil(operation string) (*Settings, error) {
	settings, err := s.GetSettings()
	if err != nil {
		s.logger.Error(fmt.Sprintf("%s: failed to get settings: %v", operation, err))
		return nil, fmt.Errorf("%s: %w", operation, err)
	}

	if settings == nil {
		s.logger.Error(fmt.Sprintf("%s: settings are nil", operation))
		return nil, fmt.Errorf("%s: settings are nil", operation)
	}

	return settings, nil
}

// GetAvailableProviderConfigs returns available provider configurations
func (s *SettingsRepository) GetAvailableProviderConfigs() ([]ProviderConfig, error) {
	const op = "SettingsRepository.GetAvailableProviderConfigs"
	settings, err := s.getSettingsAndValidateNotNil(op)
	if err != nil {
		return nil, err
	}

	if settings.AvailableProviderConfigs == nil {
		s.logger.Warning(fmt.Sprintf("%s: available provider configs are nil, returning empty slice", op))
		return []ProviderConfig{}, nil
	}

	return settings.AvailableProviderConfigs, nil
}

// GetCurrentProviderConfig returns current provider configuration
func (s *SettingsRepository) GetCurrentProviderConfig() (*ProviderConfig, error) {
	const op = "SettingsRepository.GetCurrentProviderConfig"
	settings, err := s.getSettingsAndValidateNotNil(op)
	if err != nil {
		return nil, err
	}

	s.logger.Debug(fmt.Sprintf("%s: returning current provider config", op))
	return &settings.CurrentProviderConfig, nil
}

// GetInferenceBaseConfig returns inference base configuration
func (s *SettingsRepository) GetInferenceBaseConfig() (*InferenceBaseConfig, error) {
	const op = "SettingsRepository.GetInferenceBaseConfig"
	settings, err := s.getSettingsAndValidateNotNil(op)
	if err != nil {
		return nil, err
	}

	s.logger.Debug(fmt.Sprintf("%s: returning inference base config", op))
	return &settings.InferenceBaseConfig, nil
}

// GetModelConfig returns model configuration
func (s *SettingsRepository) GetModelConfig() (*ModelConfig, error) {
	const op = "SettingsRepository.GetModelConfig"
	settings, err := s.getSettingsAndValidateNotNil(op)
	if err != nil {
		return nil, err
	}

	s.logger.Debug(fmt.Sprintf("%s: returning model config", op))
	return &settings.ModelConfig, nil
}

// GetLanguageConfig returns language configuration
func (s *SettingsRepository) GetLanguageConfig() (*LanguageConfig, error) {
	const op = "SettingsRepository.GetLanguageConfig"
	settings, err := s.getSettingsAndValidateNotNil(op)
	if err != nil {
		return nil, err
	}

	s.logger.Debug(fmt.Sprintf("%s: returning language config", op))
	return &settings.LanguageConfig, nil
}
