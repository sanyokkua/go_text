package file

import (
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/wailsapp/wails/v2/pkg/logger"
)

type FileUtilsServiceAPI interface {
	GetAppSettingsFolderPath() (string, error)
	GetAppSettingsFilePath() (string, error)
	GetAppDatabaseFilePath() (string, error)
	ResolveAppLogsFolderPath(customDir string) (string, error)
	EnsureAppLogsFolderExists(customDir string) (string, error)
}

type FileUtilsService struct {
	logger logger.Logger
}

func NewFileUtilsService(logger logger.Logger) FileUtilsServiceAPI {
	if logger == nil {
		panic("logger cannot be nil")
	}

	return &FileUtilsService{
		logger: logger,
	}
}

func (s *FileUtilsService) ensureAppSettingsFolderExists() (string, error) {
	const op = "FileUtilsService.ensureAppSettingsFolderExists"
	startTime := time.Now()
	s.logger.Info(fmt.Sprintf("%s: ensuring application settings folder exists", op))

	configDir, err := os.UserConfigDir()
	if err != nil {
		s.logger.Trace(fmt.Sprintf("%s: failed to get user config directory: %v, falling back to home directory", op, err))

		configDir, err = os.UserHomeDir()
		if err != nil {
			s.logger.Error(fmt.Sprintf("%s: failed to get user home directory: %v", op, err))
			return "", fmt.Errorf("%s: failed to determine application directory: %w", op, err)
		}
	}

	appConfigDir := filepath.Join(configDir, AppName)
	s.logger.Trace(fmt.Sprintf("%s: application config directory path: %s", op, appConfigDir))

	err = os.MkdirAll(appConfigDir, 0700)
	if err != nil {
		s.logger.Error(fmt.Sprintf("%s: failed to create directory '%s': %v", op, appConfigDir, err))
		return "", fmt.Errorf("%s: failed to create application directory: %w", op, err)
	}

	duration := time.Since(startTime)
	s.logger.Info(fmt.Sprintf("%s: successfully ensured settings folder exists in %v", op, duration))

	return appConfigDir, nil
}

func (s *FileUtilsService) GetAppSettingsFolderPath() (string, error) {
	const op = "FileUtilsService.GetAppSettingsFolderPath"
	s.logger.Debug(fmt.Sprintf("%s: retrieving application settings folder path", op))
	return s.ensureAppSettingsFolderExists()
}

func (s *FileUtilsService) GetAppSettingsFilePath() (string, error) {
	const op = "FileUtilsService.GetAppSettingsFilePath"
	startTime := time.Now()
	s.logger.Debug(fmt.Sprintf("%s: retrieving application settings file path", op))

	appConfigDir, err := s.GetAppSettingsFolderPath()
	if err != nil {
		s.logger.Error(fmt.Sprintf("%s: failed to get application config directory: %v", op, err))
		return "", fmt.Errorf("%s: failed to get settings folder path: %w", op, err)
	}

	settingsPath := filepath.Join(appConfigDir, SettingsFileName)
	s.logger.Trace(fmt.Sprintf("%s: settings file path: %s", op, settingsPath))

	duration := time.Since(startTime)
	s.logger.Debug(fmt.Sprintf("%s: successfully retrieved settings file path in %v", op, duration))

	return settingsPath, nil
}

func (s *FileUtilsService) GetAppDatabaseFilePath() (string, error) {
	const op = "FileUtilsService.GetAppDatabaseFilePath"
	s.logger.Debug(fmt.Sprintf("%s: retrieving application database file path", op))

	appConfigDir, err := s.GetAppSettingsFolderPath()
	if err != nil {
		s.logger.Error(fmt.Sprintf("%s: failed to get application config directory: %v", op, err))
		return "", fmt.Errorf("%s: failed to get config folder path: %w", op, err)
	}

	dbPath := filepath.Join(appConfigDir, DatabaseFileName)
	s.logger.Trace(fmt.Sprintf("%s: database file path: %s", op, dbPath))

	return dbPath, nil
}

// ResolveAppLogsFolderPath resolves the logs folder path without creating any directories.
// If customDir is non-empty it is returned as-is; otherwise the OS default is used.
func (s *FileUtilsService) ResolveAppLogsFolderPath(customDir string) (string, error) {
	const op = "FileUtilsService.ResolveAppLogsFolderPath"
	s.logger.Debug(fmt.Sprintf("%s: resolving application logs folder path", op))

	if customDir != "" {
		s.logger.Trace(fmt.Sprintf("%s: using custom log directory: %s", op, customDir))
		return customDir, nil
	}

	configDir, err := os.UserConfigDir()
	if err != nil {
		s.logger.Trace(fmt.Sprintf("%s: failed to get user config directory: %v, falling back to home directory", op, err))

		configDir, err = os.UserHomeDir()
		if err != nil {
			s.logger.Error(fmt.Sprintf("%s: failed to get user home directory: %v", op, err))
			return "", fmt.Errorf("%s: failed to determine logs directory: %w", op, err)
		}
	}

	logsPath := filepath.Join(configDir, AppName, LogsDirName)
	s.logger.Trace(fmt.Sprintf("%s: resolved logs folder path: %s", op, logsPath))
	return logsPath, nil
}

// EnsureAppLogsFolderExists resolves the logs folder path and creates it if it does not exist.
func (s *FileUtilsService) EnsureAppLogsFolderExists(customDir string) (string, error) {
	const op = "FileUtilsService.EnsureAppLogsFolderExists"
	startTime := time.Now()
	s.logger.Debug(fmt.Sprintf("%s: ensuring application logs folder exists", op))

	logsPath, err := s.ResolveAppLogsFolderPath(customDir)
	if err != nil {
		s.logger.Error(fmt.Sprintf("%s: failed to resolve logs folder path: %v", op, err))
		return "", fmt.Errorf("%s: failed to resolve logs folder path: %w", op, err)
	}

	if err := os.MkdirAll(logsPath, 0700); err != nil {
		s.logger.Error(fmt.Sprintf("%s: failed to create logs directory '%s': %v", op, logsPath, err))
		return "", fmt.Errorf("%s: failed to create logs directory: %w", op, err)
	}

	duration := time.Since(startTime)
	s.logger.Debug(fmt.Sprintf("%s: successfully ensured logs folder exists in %v", op, duration))
	return logsPath, nil
}
