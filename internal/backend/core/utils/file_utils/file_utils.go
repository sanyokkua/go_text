package file_utils

import (
	"encoding/json"
	"fmt"
	"go_text/internal/backend/constants"
	"go_text/internal/backend/models"
	"os"
	"path/filepath"
)

const AppName = "GoTextApp"
const SettingsFileName = "settings.json"

func InitAndGetAppSettingsFolder() (string, error) {
	configDir, err := os.UserConfigDir()
	if err != nil {
		configDir, err = os.UserHomeDir()
		if err != nil {
			return "", err
		}
	}
	appConfigDir := filepath.Join(configDir, AppName)

	if err := os.MkdirAll(appConfigDir, 0700); err != nil {
		return "", err
	}

	return appConfigDir, nil
}

func InitDefaultSettingsIfAbsent() error {
	appConfigDir, err := InitAndGetAppSettingsFolder()
	if err != nil {
		return err
	}

	settingsPath := filepath.Join(appConfigDir, SettingsFileName)

	// Check if settings file already exists
	_, err = os.Stat(settingsPath)
	if err == nil {
		// File exists, nothing to do
		return nil
	}

	// Return error if it's not a "file not found" error
	if !os.IsNotExist(err) {
		return err
	}

	// Create default settings file
	defaultSettings := constants.DefaultSetting
	data, err := json.MarshalIndent(defaultSettings, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(settingsPath, data, 0600)
}

func SaveSettings(settingsObj *models.Settings) error {
	appConfigDir, err := InitAndGetAppSettingsFolder()
	if err != nil {
		return err
	}

	settingsPath := filepath.Join(appConfigDir, SettingsFileName)
	data, err := json.MarshalIndent(settingsObj, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(settingsPath, data, 0600)
}

func LoadSettings() (*models.Settings, error) {
	appConfigDir, err := InitAndGetAppSettingsFolder()
	if err != nil {
		return nil, fmt.Errorf("failed to get app config directory: %w", err)
	}

	settingsPath := filepath.Join(appConfigDir, SettingsFileName)
	data, err := os.ReadFile(settingsPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read settings file: %w", err)
	}

	var settings models.Settings
	if err := json.Unmarshal(data, &settings); err != nil {
		return nil, fmt.Errorf("failed to parse settings: %w", err)
	}

	return &settings, nil
}
