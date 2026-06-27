package tasklog

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"

	"go_text/internal/settings"

	"github.com/stretchr/testify/assert"
)

// testLogger is a minimal no-op logger satisfying github.com/wailsapp/wails/v2/pkg/logger.Logger.
type testLogger struct{}

func (l *testLogger) Print(msg string)   {}
func (l *testLogger) Trace(msg string)   {}
func (l *testLogger) Debug(msg string)   {}
func (l *testLogger) Info(msg string)    {}
func (l *testLogger) Warning(msg string) {}
func (l *testLogger) Error(msg string)   {}
func (l *testLogger) Fatal(msg string)   {}

// mockSettingsService stubs SettingsServiceAPI.
// cfg controls GetAppBehaviorConfig; logCfg controls GetLoggingConfig.
// All other methods return zero values so the compiler is satisfied.
type mockSettingsService struct {
	cfg       *settings.AppBehaviorConfig
	cfgErr    error
	logCfg    *settings.LoggingConfig
	logCfgErr error
}

func (m *mockSettingsService) GetAppBehaviorConfig() (*settings.AppBehaviorConfig, error) {
	return m.cfg, m.cfgErr
}

func (m *mockSettingsService) GetLoggingConfig() (*settings.LoggingConfig, error) {
	if m.logCfgErr != nil {
		return nil, m.logCfgErr
	}
	if m.logCfg != nil {
		return m.logCfg, nil
	}
	return &settings.LoggingConfig{}, nil
}

func (m *mockSettingsService) UpdateLoggingConfig(cfg *settings.LoggingConfig) (*settings.LoggingConfig, error) {
	return cfg, nil
}

func (m *mockSettingsService) GetAppSettingsMetadata() (*settings.AppSettingsMetadata, error) {
	return nil, nil
}
func (m *mockSettingsService) GetSettings() (*settings.Settings, error)            { return nil, nil }
func (m *mockSettingsService) ResetSettingsToDefault() (*settings.Settings, error) { return nil, nil }
func (m *mockSettingsService) GetAllProviderConfigs() ([]settings.ProviderConfig, error) {
	return nil, nil
}
func (m *mockSettingsService) GetCurrentProviderConfig() (*settings.ProviderConfig, error) {
	return nil, nil
}
func (m *mockSettingsService) GetProviderConfig(_ string) (*settings.ProviderConfig, error) {
	return nil, nil
}
func (m *mockSettingsService) CreateProviderConfig(_ *settings.ProviderConfig) (*settings.ProviderConfig, error) {
	return nil, nil
}
func (m *mockSettingsService) UpdateProviderConfig(_ *settings.ProviderConfig) (*settings.ProviderConfig, error) {
	return nil, nil
}
func (m *mockSettingsService) DeleteProviderConfig(_ string) error { return nil }
func (m *mockSettingsService) SetAsCurrentProviderConfig(_ string) (*settings.ProviderConfig, error) {
	return nil, nil
}
func (m *mockSettingsService) GetInferenceBaseConfig() (*settings.InferenceBaseConfig, error) {
	return nil, nil
}
func (m *mockSettingsService) GetModelConfig() (*settings.ModelConfig, error) { return nil, nil }
func (m *mockSettingsService) UpdateInferenceBaseConfig(_ *settings.InferenceBaseConfig) (*settings.InferenceBaseConfig, error) {
	return nil, nil
}
func (m *mockSettingsService) UpdateModelConfig(_ *settings.ModelConfig) (*settings.ModelConfig, error) {
	return nil, nil
}
func (m *mockSettingsService) GetLanguageConfig() (*settings.LanguageConfig, error) { return nil, nil }
func (m *mockSettingsService) SetDefaultInputLanguage(_ string) error               { return nil }
func (m *mockSettingsService) SetDefaultOutputLanguage(_ string) error              { return nil }
func (m *mockSettingsService) AddLanguage(_ string) ([]string, error)               { return nil, nil }
func (m *mockSettingsService) RemoveLanguage(_ string) ([]string, error)            { return nil, nil }
func (m *mockSettingsService) UpdateAppBehaviorConfig(_ *settings.AppBehaviorConfig) (*settings.AppBehaviorConfig, error) {
	return nil, nil
}

// mockFileUtilsService stubs file.FileUtilsServiceAPI.
// EnsureAppLogsFolderExists records the call and returns configured values.
// All other methods return ("", nil).
type mockFileUtilsService struct {
	ensurePath string
	ensureErr  error
	called     bool
}

func (m *mockFileUtilsService) EnsureAppLogsFolderExists(_ string) (string, error) {
	m.called = true
	return m.ensurePath, m.ensureErr
}

func (m *mockFileUtilsService) GetAppSettingsFolderPath() (string, error) { return "", nil }
func (m *mockFileUtilsService) GetAppSettingsFilePath() (string, error)   { return "", nil }
func (m *mockFileUtilsService) GetAppDatabaseFilePath() (string, error)   { return "", nil }
func (m *mockFileUtilsService) ResolveAppLogsFolderPath(_ string) (string, error) {
	return "", nil
}

// makeEntry returns a fully-populated TaskLogEntry for use across test cases.
func makeEntry() TaskLogEntry {
	return TaskLogEntry{
		SchemaVersion:  1,
		Timestamp:      "2024-01-15T10:00:00Z",
		ActionID:       "action-123",
		ActionName:     "Translate",
		Category:       "translation",
		InputText:      "Hello",
		OutputText:     "Hola",
		SystemPrompt:   "You are a translator",
		UserPrompt:     "Translate to Spanish",
		ProviderName:   "Ollama",
		ProviderType:   "ollama",
		Model:          "llama3",
		DurationMs:     1234,
		InputLanguage:  "English",
		OutputLanguage: "Spanish",
	}
}

// newService is a helper that constructs a TaskLogService with supplied mocks.
func newService(t *testing.T, ms *mockSettingsService, mf *mockFileUtilsService) TaskLogServiceAPI {
	t.Helper()
	return NewTaskLogService(&testLogger{}, ms, mf)
}

// TestNewTaskLogService verifies constructor panics on nil dependencies and
// returns a non-nil service when all dependencies are provided.
func TestNewTaskLogService(t *testing.T) {
	t.Parallel()

	validLogger := &testLogger{}
	validSettings := &mockSettingsService{}
	validFile := &mockFileUtilsService{}

	tests := []struct {
		name         string
		log          any
		settingsSvc  any
		fileUtils    any
		wantPanic    bool
		panicMessage string
	}{
		{
			name:        "success",
			log:         validLogger,
			settingsSvc: validSettings,
			fileUtils:   validFile,
			wantPanic:   false,
		},
		{
			name:         "nil_logger",
			log:          nil,
			settingsSvc:  validSettings,
			fileUtils:    validFile,
			wantPanic:    true,
			panicMessage: "TaskLogService.NewTaskLogService: logger cannot be nil",
		},
		{
			name:         "nil_settingsService",
			log:          validLogger,
			settingsSvc:  nil,
			fileUtils:    validFile,
			wantPanic:    true,
			panicMessage: "TaskLogService.NewTaskLogService: settings service cannot be nil",
		},
		{
			name:         "nil_fileUtils",
			log:          validLogger,
			settingsSvc:  validSettings,
			fileUtils:    nil,
			wantPanic:    true,
			panicMessage: "TaskLogService.NewTaskLogService: file utils service cannot be nil",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			// Resolve typed interface values so nil comparisons work correctly at
			// the interface level inside the constructor.
			var log interface {
				Print(string)
				Trace(string)
				Debug(string)
				Info(string)
				Warning(string)
				Error(string)
				Fatal(string)
			}
			var svc settings.SettingsServiceAPI
			var fu interface {
				GetAppSettingsFolderPath() (string, error)
				GetAppSettingsFilePath() (string, error)
				GetAppDatabaseFilePath() (string, error)
				ResolveAppLogsFolderPath(string) (string, error)
				EnsureAppLogsFolderExists(string) (string, error)
			}

			if tt.log != nil {
				log = tt.log.(*testLogger)
			}
			if tt.settingsSvc != nil {
				svc = tt.settingsSvc.(*mockSettingsService)
			}
			if tt.fileUtils != nil {
				fu = tt.fileUtils.(*mockFileUtilsService)
			}

			if tt.wantPanic {
				assert.PanicsWithValue(t, tt.panicMessage, func() {
					NewTaskLogService(log, svc, fu)
				})
			} else {
				var result TaskLogServiceAPI
				assert.NotPanics(t, func() {
					result = NewTaskLogService(log, svc, fu)
				})
				assert.NotNil(t, result)
			}
		})
	}
}

// TestTaskLogService_LogTaskExecution covers every branch inside LogTaskExecution.
func TestTaskLogService_LogTaskExecution(t *testing.T) {
	t.Parallel()

	// Snapshot the expected filename before any subtest runs to avoid
	// midnight-boundary flakiness.
	todayFilename := fmt.Sprintf("tasks-%s.jsonl", time.Now().UTC().Format("2006-01-02"))

	t.Run("logging_disabled_noop", func(t *testing.T) {
		t.Parallel()

		// Arrange
		mockSettings := &mockSettingsService{
			cfg:    &settings.AppBehaviorConfig{EnableTaskLogging: false},
			cfgErr: nil,
		}
		mockFile := &mockFileUtilsService{ensureErr: nil, ensurePath: ""}
		svc := newService(t, mockSettings, mockFile)

		// Act
		err := svc.LogTaskExecution(makeEntry())

		// Assert
		assert.NoError(t, err)
		assert.False(t, mockFile.called, "EnsureAppLogsFolderExists must not be called when logging is disabled")
	})

	t.Run("settings_error_swallowed", func(t *testing.T) {
		t.Parallel()

		// Arrange
		mockSettings := &mockSettingsService{
			cfgErr: errors.New("settings unavailable"),
		}
		mockFile := &mockFileUtilsService{}
		svc := newService(t, mockSettings, mockFile)

		// Act
		err := svc.LogTaskExecution(makeEntry())

		// Assert
		assert.NoError(t, err)
		assert.False(t, mockFile.called, "EnsureAppLogsFolderExists must not be called when settings lookup fails")
	})

	t.Run("ensure_folder_error_swallowed", func(t *testing.T) {
		t.Parallel()

		// Arrange
		mockSettings := &mockSettingsService{
			cfg:    &settings.AppBehaviorConfig{EnableTaskLogging: true},
			cfgErr: nil,
			logCfg: &settings.LoggingConfig{LogDirectory: "/tmp/logs"},
		}
		mockFile := &mockFileUtilsService{
			ensureErr:  errors.New("disk full"),
			ensurePath: "",
		}
		svc := newService(t, mockSettings, mockFile)

		// Act
		err := svc.LogTaskExecution(makeEntry())

		// Assert
		assert.NoError(t, err)
		assert.True(t, mockFile.called, "EnsureAppLogsFolderExists must be called when logging is enabled")

		// No file should have been created anywhere under /tmp/logs
		expectedPath := filepath.Join("/tmp/logs", todayFilename)
		_, statErr := os.Stat(expectedPath)
		assert.True(t, os.IsNotExist(statErr), "log file must not exist when folder creation fails")
	})

	t.Run("open_file_error_swallowed", func(t *testing.T) {
		t.Parallel()

		// Arrange: create a regular file where the service expects a directory so
		// os.OpenFile(filepath.Join(blockPath, filename), ...) returns ENOTDIR.
		tmpDir, err := os.MkdirTemp("", "tasklog_openfile_*")
		assert.NoError(t, err)
		defer os.RemoveAll(tmpDir)

		blockPath := filepath.Join(tmpDir, "block")
		writeErr := os.WriteFile(blockPath, []byte("not a directory"), 0600)
		assert.NoError(t, writeErr)

		mockSettings := &mockSettingsService{
			cfg:    &settings.AppBehaviorConfig{EnableTaskLogging: true},
			cfgErr: nil,
		}
		// Return the regular file's path as the "log directory" so that the
		// service tries to open a file inside it and fails with ENOTDIR.
		mockFile := &mockFileUtilsService{
			ensurePath: blockPath,
			ensureErr:  nil,
		}
		svc := newService(t, mockSettings, mockFile)

		// Act
		result := svc.LogTaskExecution(makeEntry())

		// Assert: error is swallowed
		assert.NoError(t, result)
	})

	t.Run("happy_path_single_entry", func(t *testing.T) {
		t.Parallel()

		// Arrange
		tmpDir, err := os.MkdirTemp("", "tasklog_single_*")
		assert.NoError(t, err)
		defer os.RemoveAll(tmpDir)

		mockSettings := &mockSettingsService{
			cfg:    &settings.AppBehaviorConfig{EnableTaskLogging: true},
			cfgErr: nil,
			logCfg: &settings.LoggingConfig{LogDirectory: tmpDir},
		}
		mockFile := &mockFileUtilsService{
			ensurePath: tmpDir,
			ensureErr:  nil,
		}
		svc := newService(t, mockSettings, mockFile)
		entry := makeEntry()

		// Act
		logErr := svc.LogTaskExecution(entry)

		// Assert: no error returned
		assert.NoError(t, logErr)

		logFilePath := filepath.Join(tmpDir, todayFilename)

		// Assert: file exists with correct permissions
		info, statErr := os.Stat(logFilePath)
		assert.NoError(t, statErr, "log file must exist after a successful write")
		assert.Equal(t, os.FileMode(0600), info.Mode().Perm(), "log file must have mode 0600")

		// Assert: exactly one JSON line
		rawBytes, readErr := os.ReadFile(logFilePath)
		assert.NoError(t, readErr)

		lines := filterNonEmpty(strings.Split(string(rawBytes), "\n"))
		assert.Len(t, lines, 1, "exactly one log line expected")

		// Assert: JSON content matches the entry
		var decoded TaskLogEntry
		assert.NoError(t, json.Unmarshal([]byte(lines[0]), &decoded))
		assert.Equal(t, entry, decoded)
	})

	t.Run("happy_path_two_entries_appended", func(t *testing.T) {
		t.Parallel()

		// Arrange
		tmpDir, err := os.MkdirTemp("", "tasklog_two_*")
		assert.NoError(t, err)
		defer os.RemoveAll(tmpDir)

		mockSettings := &mockSettingsService{
			cfg:    &settings.AppBehaviorConfig{EnableTaskLogging: true},
			cfgErr: nil,
			logCfg: &settings.LoggingConfig{LogDirectory: tmpDir},
		}
		mockFile := &mockFileUtilsService{
			ensurePath: tmpDir,
			ensureErr:  nil,
		}
		svc := newService(t, mockSettings, mockFile)
		entry := makeEntry()

		// Act: write two entries
		assert.NoError(t, svc.LogTaskExecution(entry))
		assert.NoError(t, svc.LogTaskExecution(entry))

		// Assert: exactly two JSON lines in order
		logFilePath := filepath.Join(tmpDir, todayFilename)
		rawBytes, readErr := os.ReadFile(logFilePath)
		assert.NoError(t, readErr)

		lines := filterNonEmpty(strings.Split(string(rawBytes), "\n"))
		assert.Len(t, lines, 2, "exactly two log lines expected")

		for i, line := range lines {
			var decoded TaskLogEntry
			assert.NoError(t, json.Unmarshal([]byte(line), &decoded), "line %d must be valid JSON", i)
			assert.Equal(t, entry, decoded, "line %d must match the written entry", i)
		}
	})

	t.Run("concurrent_writes_no_data_race", func(t *testing.T) {
		// Do NOT call t.Parallel() here: the test already exercises concurrency
		// via goroutines and the race detector validates the mutex correctness.

		// Arrange
		tmpDir, err := os.MkdirTemp("", "tasklog_concurrent_*")
		assert.NoError(t, err)
		defer os.RemoveAll(tmpDir)

		mockSettings := &mockSettingsService{
			cfg:    &settings.AppBehaviorConfig{EnableTaskLogging: true},
			cfgErr: nil,
			logCfg: &settings.LoggingConfig{LogDirectory: tmpDir},
		}
		mockFile := &mockFileUtilsService{
			ensurePath: tmpDir,
			ensureErr:  nil,
		}
		svc := newService(t, mockSettings, mockFile)

		const goroutines = 5
		var wg sync.WaitGroup
		wg.Add(goroutines)

		// Act: 5 goroutines write concurrently
		for range goroutines {
			go func() {
				defer wg.Done()
				_ = svc.LogTaskExecution(makeEntry())
			}()
		}
		wg.Wait()

		// Assert: exactly 5 lines were written (mutex guarantees no interleaving)
		logFilePath := filepath.Join(tmpDir, todayFilename)
		rawBytes, readErr := os.ReadFile(logFilePath)
		assert.NoError(t, readErr)

		lines := filterNonEmpty(strings.Split(string(rawBytes), "\n"))
		assert.Len(t, lines, goroutines, "each goroutine must write exactly one line")
	})
}

// filterNonEmpty removes empty strings from a slice, used to strip the
// trailing empty element produced by strings.Split on a newline-terminated file.
func filterNonEmpty(ss []string) []string {
	t := ss[:0]
	for _, s := range ss {
		if s != "" {
			t = append(t, s)
		}
	}
	return t
}

// json.Marshal on TaskLogEntry with primitive fields cannot fail; branch is unreachable.
