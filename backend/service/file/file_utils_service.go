package file

import (
	"encoding/json"
	"fmt"
	"go_text/backend/abstract/backend"
	"go_text/backend/constant"
	"go_text/backend/model/settings"
	"os"
	"path/filepath"
	"time"
)

const AppName = "GoTextApp"
const SettingsFileName = "settings.json"

type fileUtilsService struct {
	logger backend.LoggingApi
}

func (s *fileUtilsService) InitAndGetAppSettingsFolder() (string, error) {
	startTime := time.Now()
	s.logger.Info("[fileUtilsService.initAndGetAppSettingsFolder] Initializing application settings folder")

	configDir, err := os.UserConfigDir()
	if err != nil {
		s.logger.Trace(fmt.Sprintf("[initAndGetAppSettingsFolder] Failed to get user config dir: %v, falling back to home directory", err))
		configDir, err = os.UserHomeDir()
		if err != nil {
			s.logger.Error(fmt.Sprintf("[initAndGetAppSettingsFolder] Failed to get user home directory: %v", err))
			return "", fmt.Errorf("failed to determine application directory: %w", err)
		}
	}

	appConfigDir := filepath.Join(configDir, AppName)
	s.logger.Trace(fmt.Sprintf("[initAndGetAppSettingsFolder] Application config directory: %s", appConfigDir))

	if err := os.MkdirAll(appConfigDir, 0700); err != nil {
		s.logger.Error(fmt.Sprintf("[initAndGetAppSettingsFolder] Failed to create directory '%s': %v", appConfigDir, err))
		return "", fmt.Errorf("failed to create application directory: %w", err)
	}

	duration := time.Since(startTime)
	s.logger.Info(fmt.Sprintf("[initAndGetAppSettingsFolder] Successfully initialized settings folder in %v", duration))

	return appConfigDir, nil
}

func (s *fileUtilsService) InitDefaultSettingsIfAbsent() error {
	startTime := time.Now()
	s.logger.Info("[InitDefaultSettingsIfAbsent] Checking for default settings initialization")

	appConfigDir, err := s.InitAndGetAppSettingsFolder()
	if err != nil {
		s.logger.Error(fmt.Sprintf("[InitDefaultSettingsIfAbsent] Failed to get app config directory: %v", err))
		return fmt.Errorf("failed to initialize settings: %w", err)
	}

	settingsPath := filepath.Join(appConfigDir, SettingsFileName)
	s.logger.Trace(fmt.Sprintf("[InitDefaultSettingsIfAbsent] Settings file path: %s", settingsPath))

	// Check if settings file already exists
	_, err = os.Stat(settingsPath)
	if err == nil {
		s.logger.Info("[InitDefaultSettingsIfAbsent] Settings file already exists, skipping initialization")
		return nil
	}

	// Return error if it's not a "file not found" error
	if !os.IsNotExist(err) {
		s.logger.Error(fmt.Sprintf("[InitDefaultSettingsIfAbsent] Error checking settings file: %v", err))
		return fmt.Errorf("failed to check settings file: %w", err)
	}

	// Create default settings file
	s.logger.Info("[InitDefaultSettingsIfAbsent] Creating default settings file")
	defaultSettings := constant.DefaultSetting
	data, err := json.MarshalIndent(defaultSettings, "", "  ")
	if err != nil {
		s.logger.Error(fmt.Sprintf("[InitDefaultSettingsIfAbsent] Failed to marshal default settings: %v", err))
		return fmt.Errorf("failed to create default settings: %w", err)
	}

	if err := os.WriteFile(settingsPath, data, 0600); err != nil {
		s.logger.Error(fmt.Sprintf("[InitDefaultSettingsIfAbsent] Failed to write default settings file: %v", err))
		return fmt.Errorf("failed to write default settings: %w", err)
	}

	duration := time.Since(startTime)
	s.logger.Info(fmt.Sprintf("[InitDefaultSettingsIfAbsent] Successfully created default settings in %v", duration))

	return nil
}

func (s *fileUtilsService) SaveSettings(settingsObj *settings.Settings) error {
	startTime := time.Now()
	s.logger.Info("[SaveSettings] Starting settings save operation")

	appConfigDir, err := s.InitAndGetAppSettingsFolder()
	if err != nil {
		s.logger.Error(fmt.Sprintf("[SaveSettings] Failed to get app config directory: %v", err))
		return fmt.Errorf("failed to save settings: %w", err)
	}

	settingsPath := filepath.Join(appConfigDir, SettingsFileName)
	s.logger.Trace(fmt.Sprintf("[SaveSettings] Saving settings to: %s", settingsPath))

	data, err := json.MarshalIndent(settingsObj, "", "  ")
	if err != nil {
		s.logger.Error(fmt.Sprintf("[SaveSettings] Failed to marshal settings: %v", err))
		return fmt.Errorf("failed to serialize settings: %w", err)
	}

	if err := os.WriteFile(settingsPath, data, 0600); err != nil {
		s.logger.Error(fmt.Sprintf("[SaveSettings] Failed to write settings file: %v", err))
		return fmt.Errorf("failed to write settings file: %w", err)
	}

	duration := time.Since(startTime)
	s.logger.Info(fmt.Sprintf("[SaveSettings] Successfully saved settings in %v", duration))

	return nil
}

func (s *fileUtilsService) LoadSettings() (*settings.Settings, error) {
	startTime := time.Now()
	s.logger.Info("[LoadSettings] Loading appSettings from file")

	appConfigDir, err := s.InitAndGetAppSettingsFolder()
	if err != nil {
		s.logger.Error(fmt.Sprintf("[LoadSettings] Failed to get app config directory: %v", err))
		return nil, fmt.Errorf("failed to get app config directory: %w", err)
	}

	settingsPath := filepath.Join(appConfigDir, SettingsFileName)
	s.logger.Trace(fmt.Sprintf("[LoadSettings] Loading appSettings from: %s", settingsPath))

	data, err := os.ReadFile(settingsPath)
	if err != nil {
		s.logger.Error(fmt.Sprintf("[LoadSettings] Failed to read appSettings file: %v", err))
		return nil, fmt.Errorf("failed to read appSettings file: %w", err)
	}

	var appSettings settings.Settings
	if err := json.Unmarshal(data, &appSettings); err != nil {
		s.logger.Error(fmt.Sprintf("[LoadSettings] Failed to parse settings JSON: %v", err))
		return nil, fmt.Errorf("failed to parse appSettings: %w", err)
	}

	duration := time.Since(startTime)
	s.logger.Info(fmt.Sprintf("[LoadSettings] Successfully loaded appSettings in %v", duration))

	return &appSettings, nil
}

func (s *fileUtilsService) GetSettingsFilePath() string {
	startTime := time.Now()
	s.logger.Trace("[GetSettingsFilePath] Retrieving settings file path")

	appConfigDir, err := s.InitAndGetAppSettingsFolder()
	if err != nil {
		s.logger.Error(fmt.Sprintf("[GetSettingsFilePath] Failed to get app config directory: %v", err))
		return ""
	}

	filePath := filepath.Join(appConfigDir, SettingsFileName)
	duration := time.Since(startTime)
	s.logger.Trace(fmt.Sprintf("[GetSettingsFilePath] Retrieved settings file path in %v", duration))

	return filePath
}

func NewFileUtilsService(logger backend.LoggingApi) backend.FileUtilsApi {
	return &fileUtilsService{
		logger: logger,
	}
}
