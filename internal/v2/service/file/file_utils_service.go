package file

import (
	"context"
	"encoding/json"
	"fmt"
	"go_text/internal/v2/backend_api"
	"os"
	"path/filepath"
	"time"

	"go_text/internal/v2/constants"
	"go_text/internal/v2/model/settings"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

const AppName = "GoTextApp"
const SettingsFileName = "settings.json"

type fileUtilsService struct {
	ctx *context.Context
}

func (s *fileUtilsService) InitAndGetAppSettingsFolder() (string, error) {
	startTime := time.Now()
	runtime.LogInfo(*s.ctx, "[InitAndGetAppSettingsFolder] Initializing application settings folder")

	configDir, err := os.UserConfigDir()
	if err != nil {
		runtime.LogDebug(*s.ctx, fmt.Sprintf("[InitAndGetAppSettingsFolder] Failed to get user config dir: %v, falling back to home directory", err))
		configDir, err = os.UserHomeDir()
		if err != nil {
			runtime.LogError(*s.ctx, fmt.Sprintf("[InitAndGetAppSettingsFolder] Failed to get user home directory: %v", err))
			return "", fmt.Errorf("failed to determine application directory: %w", err)
		}
	}

	appConfigDir := filepath.Join(configDir, AppName)
	runtime.LogDebug(*s.ctx, fmt.Sprintf("[InitAndGetAppSettingsFolder] Application config directory: %s", appConfigDir))

	if err := os.MkdirAll(appConfigDir, 0700); err != nil {
		runtime.LogError(*s.ctx, fmt.Sprintf("[InitAndGetAppSettingsFolder] Failed to create directory '%s': %v", appConfigDir, err))
		return "", fmt.Errorf("failed to create application directory: %w", err)
	}

	duration := time.Since(startTime)
	runtime.LogInfo(*s.ctx, fmt.Sprintf("[InitAndGetAppSettingsFolder] Successfully initialized settings folder in %v", duration))

	return appConfigDir, nil
}

func (s *fileUtilsService) InitDefaultSettingsIfAbsent() error {
	startTime := time.Now()
	runtime.LogInfo(*s.ctx, "[InitDefaultSettingsIfAbsent] Checking for default settings initialization")

	appConfigDir, err := s.InitAndGetAppSettingsFolder()
	if err != nil {
		runtime.LogError(*s.ctx, fmt.Sprintf("[InitDefaultSettingsIfAbsent] Failed to get app config directory: %v", err))
		return fmt.Errorf("failed to initialize settings: %w", err)
	}

	settingsPath := filepath.Join(appConfigDir, SettingsFileName)
	runtime.LogDebug(*s.ctx, fmt.Sprintf("[InitDefaultSettingsIfAbsent] Settings file path: %s", settingsPath))

	// Check if settings file already exists
	_, err = os.Stat(settingsPath)
	if err == nil {
		runtime.LogInfo(*s.ctx, "[InitDefaultSettingsIfAbsent] Settings file already exists, skipping initialization")
		return nil
	}

	// Return error if it's not a "file not found" error
	if !os.IsNotExist(err) {
		runtime.LogError(*s.ctx, fmt.Sprintf("[InitDefaultSettingsIfAbsent] Error checking settings file: %v", err))
		return fmt.Errorf("failed to check settings file: %w", err)
	}

	// Create default settings file
	runtime.LogInfo(*s.ctx, "[InitDefaultSettingsIfAbsent] Creating default settings file")
	defaultSettings := constants.DefaultSetting
	data, err := json.MarshalIndent(defaultSettings, "", "  ")
	if err != nil {
		runtime.LogError(*s.ctx, fmt.Sprintf("[InitDefaultSettingsIfAbsent] Failed to marshal default settings: %v", err))
		return fmt.Errorf("failed to create default settings: %w", err)
	}

	if err := os.WriteFile(settingsPath, data, 0600); err != nil {
		runtime.LogError(*s.ctx, fmt.Sprintf("[InitDefaultSettingsIfAbsent] Failed to write default settings file: %v", err))
		return fmt.Errorf("failed to write default settings: %w", err)
	}

	duration := time.Since(startTime)
	runtime.LogInfo(*s.ctx, fmt.Sprintf("[InitDefaultSettingsIfAbsent] Successfully created default settings in %v", duration))

	return nil
}

func (s *fileUtilsService) SaveSettings(settingsObj *settings.Settings) error {
	startTime := time.Now()
	runtime.LogInfo(*s.ctx, "[SaveSettings] Starting settings save operation")

	appConfigDir, err := s.InitAndGetAppSettingsFolder()
	if err != nil {
		runtime.LogError(*s.ctx, fmt.Sprintf("[SaveSettings] Failed to get app config directory: %v", err))
		return fmt.Errorf("failed to save settings: %w", err)
	}

	settingsPath := filepath.Join(appConfigDir, SettingsFileName)
	runtime.LogDebug(*s.ctx, fmt.Sprintf("[SaveSettings] Saving settings to: %s", settingsPath))

	data, err := json.MarshalIndent(settingsObj, "", "  ")
	if err != nil {
		runtime.LogError(*s.ctx, fmt.Sprintf("[SaveSettings] Failed to marshal settings: %v", err))
		return fmt.Errorf("failed to serialize settings: %w", err)
	}

	if err := os.WriteFile(settingsPath, data, 0600); err != nil {
		runtime.LogError(*s.ctx, fmt.Sprintf("[SaveSettings] Failed to write settings file: %v", err))
		return fmt.Errorf("failed to write settings file: %w", err)
	}

	duration := time.Since(startTime)
	runtime.LogInfo(*s.ctx, fmt.Sprintf("[SaveSettings] Successfully saved settings in %v", duration))

	return nil
}

func (s *fileUtilsService) LoadSettings() (*settings.Settings, error) {
	startTime := time.Now()
	runtime.LogInfo(*s.ctx, "[LoadSettings] Loading appSettings from file")

	appConfigDir, err := s.InitAndGetAppSettingsFolder()
	if err != nil {
		runtime.LogError(*s.ctx, fmt.Sprintf("[LoadSettings] Failed to get app config directory: %v", err))
		return nil, fmt.Errorf("failed to get app config directory: %w", err)
	}

	settingsPath := filepath.Join(appConfigDir, SettingsFileName)
	runtime.LogDebug(*s.ctx, fmt.Sprintf("[LoadSettings] Loading appSettings from: %s", settingsPath))

	data, err := os.ReadFile(settingsPath)
	if err != nil {
		runtime.LogError(*s.ctx, fmt.Sprintf("[LoadSettings] Failed to read appSettings file: %v", err))
		return nil, fmt.Errorf("failed to read appSettings file: %w", err)
	}

	var appSettings settings.Settings
	if err := json.Unmarshal(data, &appSettings); err != nil {
		runtime.LogError(*s.ctx, fmt.Sprintf("[LoadSettings] Failed to parse settings JSON: %v", err))
		return nil, fmt.Errorf("failed to parse appSettings: %w", err)
	}

	duration := time.Since(startTime)
	runtime.LogInfo(*s.ctx, fmt.Sprintf("[LoadSettings] Successfully loaded appSettings in %v", duration))

	return &appSettings, nil
}

func (s *fileUtilsService) GetSettingsFilePath() string {
	startTime := time.Now()
	runtime.LogDebug(*s.ctx, "[GetSettingsFilePath] Retrieving settings file path")

	appConfigDir, err := s.InitAndGetAppSettingsFolder()
	if err != nil {
		runtime.LogError(*s.ctx, fmt.Sprintf("[GetSettingsFilePath] Failed to get app config directory: %v", err))
		return ""
	}

	filePath := filepath.Join(appConfigDir, SettingsFileName)
	duration := time.Since(startTime)
	runtime.LogDebug(*s.ctx, fmt.Sprintf("[GetSettingsFilePath] Retrieved settings file path in %v", duration))

	return filePath
}

func NewFileUtilsService(ctx *context.Context) backend_api.FileUtilsApi {
	return &fileUtilsService{
		ctx: ctx,
	}
}
