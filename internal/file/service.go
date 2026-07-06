package file

import (
	"fmt"
	"os"
	"path/filepath"
	"time"

	"go_text/internal/logging"

	"github.com/rs/zerolog"
)

const fileComponent = "file"

type FileUtilsServiceAPI interface {
	GetAppSettingsFolderPath() (string, error)
	GetAppDatabaseFilePath() (string, error)
	ResolveAppLogsFolderPath(customDir string) (string, error)
	EnsureAppLogsFolderExists(customDir string) (string, error)
}

type FileUtilsService struct {
	logger *logging.Logger
}

func NewFileUtilsService(logger *logging.Logger) FileUtilsServiceAPI {
	if logger == nil {
		panic("logger cannot be nil")
	}

	return &FileUtilsService{
		logger: logger,
	}
}

// log returns a sub-logger stamped with the calling method's op and the
// package component, matching the structured pattern used in internal/actions.
func (s *FileUtilsService) log(op string) zerolog.Logger {
	return s.logger.WithOp(op).With().Str("component", fileComponent).Logger()
}

func (s *FileUtilsService) ensureAppSettingsFolderExists() (string, error) {
	const op = "FileUtilsService.ensureAppSettingsFolderExists"
	startTime := time.Now()
	lg := s.log(op)
	lg.Info().Msg("ensuring application settings folder exists")

	configDir, err := os.UserConfigDir()
	if err != nil {
		lg.Trace().Err(err).Msg("failed to get user config directory, falling back to home directory")

		configDir, err = os.UserHomeDir()
		if err != nil {
			lg.Error().Err(err).Msg("failed to get user home directory")
			return "", fmt.Errorf("%s: failed to determine application directory: %w", op, err)
		}
	}

	appConfigDir := filepath.Join(configDir, AppName)
	lg.Trace().Str("path", appConfigDir).Msg("application config directory path")

	err = os.MkdirAll(appConfigDir, 0700)
	if err != nil {
		lg.Error().Err(err).Str("path", appConfigDir).Msg("failed to create directory")
		return "", fmt.Errorf("%s: failed to create application directory: %w", op, err)
	}

	duration := time.Since(startTime)
	lg.Info().Int64("duration_ms", duration.Milliseconds()).Msg("successfully ensured settings folder exists")

	return appConfigDir, nil
}

func (s *FileUtilsService) GetAppSettingsFolderPath() (string, error) {
	const op = "FileUtilsService.GetAppSettingsFolderPath"
	lg := s.log(op)
	lg.Debug().Msg("retrieving application settings folder path")
	return s.ensureAppSettingsFolderExists()
}

func (s *FileUtilsService) GetAppDatabaseFilePath() (string, error) {
	const op = "FileUtilsService.GetAppDatabaseFilePath"
	lg := s.log(op)
	lg.Debug().Msg("retrieving application database file path")

	appConfigDir, err := s.GetAppSettingsFolderPath()
	if err != nil {
		lg.Error().Err(err).Msg("failed to get application config directory")
		return "", fmt.Errorf("%s: failed to get config folder path: %w", op, err)
	}

	dbPath := filepath.Join(appConfigDir, DatabaseFileName)
	lg.Trace().Str("path", dbPath).Msg("database file path")

	return dbPath, nil
}

// ResolveAppLogsFolderPath resolves the logs folder path without creating any directories.
// If customDir is non-empty it is returned as-is; otherwise the OS default is used.
func (s *FileUtilsService) ResolveAppLogsFolderPath(customDir string) (string, error) {
	const op = "FileUtilsService.ResolveAppLogsFolderPath"
	lg := s.log(op)
	lg.Debug().Msg("resolving application logs folder path")

	if customDir != "" {
		lg.Trace().Str("customDir", customDir).Msg("using custom log directory")
		return customDir, nil
	}

	configDir, err := os.UserConfigDir()
	if err != nil {
		lg.Trace().Err(err).Msg("failed to get user config directory, falling back to home directory")

		configDir, err = os.UserHomeDir()
		if err != nil {
			lg.Error().Err(err).Msg("failed to get user home directory")
			return "", fmt.Errorf("%s: failed to determine logs directory: %w", op, err)
		}
	}

	logsPath := filepath.Join(configDir, AppName, LogsDirName)
	lg.Trace().Str("path", logsPath).Msg("resolved logs folder path")
	return logsPath, nil
}

// EnsureAppLogsFolderExists resolves the logs folder path and creates it if it does not exist.
func (s *FileUtilsService) EnsureAppLogsFolderExists(customDir string) (string, error) {
	const op = "FileUtilsService.EnsureAppLogsFolderExists"
	startTime := time.Now()
	lg := s.log(op)
	lg.Debug().Msg("ensuring application logs folder exists")

	logsPath, err := s.ResolveAppLogsFolderPath(customDir)
	if err != nil {
		lg.Error().Err(err).Msg("failed to resolve logs folder path")
		return "", fmt.Errorf("%s: failed to resolve logs folder path: %w", op, err)
	}

	if err := os.MkdirAll(logsPath, 0700); err != nil {
		lg.Error().Err(err).Str("path", logsPath).Msg("failed to create logs directory")
		return "", fmt.Errorf("%s: failed to create logs directory: %w", op, err)
	}

	duration := time.Since(startTime)
	lg.Debug().Int64("duration_ms", duration.Milliseconds()).Msg("successfully ensured logs folder exists")
	return logsPath, nil
}
