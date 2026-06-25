package tasklog

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"

	"go_text/internal/file"
	"go_text/internal/settings"

	"github.com/wailsapp/wails/v2/pkg/logger"
)

// TaskLogEntry holds a single structured record of a completed LLM task.
type TaskLogEntry struct {
	SchemaVersion  int    `json:"schemaVersion"`
	Timestamp      string `json:"timestamp"`
	ActionID       string `json:"actionId"`
	ActionName     string `json:"actionName"`
	Category       string `json:"category"`
	InputText      string `json:"inputText"`
	OutputText     string `json:"outputText"`
	SystemPrompt   string `json:"systemPrompt"`
	UserPrompt     string `json:"userPrompt"`
	ProviderName   string `json:"providerName"`
	ProviderType   string `json:"providerType"`
	Model          string `json:"model"`
	DurationMs     int64  `json:"durationMs"`
	InputLanguage  string `json:"inputLanguage,omitempty"`
	OutputLanguage string `json:"outputLanguage,omitempty"`
}

// TaskLogServiceAPI is the contract for appending task log entries to disk.
type TaskLogServiceAPI interface {
	LogTaskExecution(entry TaskLogEntry) error
}

// TaskLogService writes task entries to a daily JSONL log file.
// All I/O errors are intentionally swallowed (WARN-logged only) so that
// logging never disrupts the main processing flow.
type TaskLogService struct {
	logger          logger.Logger
	settingsService settings.SettingsServiceAPI
	fileUtils       file.FileUtilsServiceAPI
	mu              sync.Mutex
}

// NewTaskLogService constructs a TaskLogService and panics on nil dependencies.
func NewTaskLogService(
	log logger.Logger,
	settingsService settings.SettingsServiceAPI,
	fileUtils file.FileUtilsServiceAPI,
) TaskLogServiceAPI {
	const op = "TaskLogService.NewTaskLogService"

	if log == nil {
		panic(fmt.Sprintf("%s: logger cannot be nil", op))
	}
	if settingsService == nil {
		panic(fmt.Sprintf("%s: settings service cannot be nil", op))
	}
	if fileUtils == nil {
		panic(fmt.Sprintf("%s: file utils service cannot be nil", op))
	}

	log.Info(fmt.Sprintf("[%s] Initializing task log service", op))
	return &TaskLogService{
		logger:          log,
		settingsService: settingsService,
		fileUtils:       fileUtils,
	}
}

// LogTaskExecution appends a single JSON line for the entry to today's log file.
// Errors are WARN-logged and swallowed — callers always receive nil.
func (s *TaskLogService) LogTaskExecution(entry TaskLogEntry) error {
	const op = "TaskLogService.LogTaskExecution"

	s.mu.Lock()
	defer s.mu.Unlock()

	cfg, err := s.settingsService.GetAppBehaviorConfig()
	if err != nil {
		s.logger.Warning(fmt.Sprintf("[%s] Failed to get app behavior config: %v", op, err))
		return nil
	}

	if !cfg.EnableTaskLogging {
		return nil
	}

	logCfg, err := s.settingsService.GetLoggingConfig()
	if err != nil {
		s.logger.Warning(fmt.Sprintf("[%s] Failed to get logging config: %v", op, err))
		return nil
	}
	logsDir, err := s.fileUtils.EnsureAppLogsFolderExists(logCfg.LogDirectory)
	if err != nil {
		s.logger.Warning(fmt.Sprintf("[%s] Failed to ensure logs folder exists: %v", op, err))
		return nil
	}

	filename := fmt.Sprintf("tasks-%s.jsonl", time.Now().UTC().Format("2006-01-02"))
	filePath := filepath.Join(logsDir, filename)

	f, err := os.OpenFile(filePath, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0600)
	if err != nil {
		s.logger.Warning(fmt.Sprintf("[%s] Failed to open log file '%s': %v", op, filePath, err))
		return nil
	}
	defer f.Close()

	data, err := json.Marshal(entry)
	if err != nil {
		s.logger.Warning(fmt.Sprintf("[%s] Failed to marshal log entry: %v", op, err))
		return nil
	}

	if _, err = f.Write(append(data, '\n')); err != nil {
		s.logger.Warning(fmt.Sprintf("[%s] Failed to write log entry to '%s': %v", op, filePath, err))
		return nil
	}

	return nil
}
