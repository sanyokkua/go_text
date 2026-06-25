package application

import (
	"context"
	"fmt"
	"strconv"

	"go_text/internal/actions"
	"go_text/internal/db"
	"go_text/internal/file"
	"go_text/internal/llms"
	"go_text/internal/logging"
	"go_text/internal/prompts"
	"go_text/internal/settings"
	"go_text/internal/tasklog"

	zlog "github.com/rs/zerolog/log"
	"github.com/wailsapp/wails/v2/pkg/runtime"
	"resty.dev/v3"
)

// ApplicationContextHolder is the DI root. All exported fields are Wails-bound.
type ApplicationContextHolder struct {
	ctx             context.Context
	SettingsHandler *settings.SettingsHandler
	SettingsService settings.SettingsServiceAPI
	ActionHandler   *actions.ActionHandler
	RestyClient     *resty.Client
	DB              *db.Database

	fileService file.FileUtilsServiceAPI
	appLogger   *logging.Logger
}

// NewApplicationContextHolder wires the DI graph.
// The bootstrap appLogger is console-only; Init() reconfigures it from DB settings.
func NewApplicationContextHolder(appLogger *logging.Logger, restyClient *resty.Client) *ApplicationContextHolder {
	fileUtilsService := file.NewFileUtilsService(appLogger)
	settingsRepo := settings.NewSettingsRepository(appLogger, fileUtilsService)
	settingsService := settings.NewSettingsService(appLogger, settingsRepo, fileUtilsService)
	settingsHandler := settings.NewSettingsHandler(appLogger, zlog.Logger, settingsService)

	taskLogService := tasklog.NewTaskLogService(appLogger, settingsService, fileUtilsService)
	promptService := prompts.NewPromptService(appLogger)
	llmService := llms.NewLLMApiService(appLogger, restyClient, settingsService)
	actionService := actions.NewActionService(appLogger, promptService, llmService, settingsService, taskLogService)
	actionHandler := actions.NewActionHandler(appLogger, zlog.Logger, actionService)

	return &ApplicationContextHolder{
		SettingsHandler: settingsHandler,
		SettingsService: settingsService,
		ActionHandler:   actionHandler,
		RestyClient:     restyClient,
		fileService:     fileUtilsService,
		appLogger:       appLogger,
	}
}

// SetContext stores the Wails runtime context for use by bound methods.
func (a *ApplicationContextHolder) SetContext(ctx context.Context) {
	a.ctx = ctx
}

// Init opens the database and reconfigures the logger from the seeded log.* settings.
// Called from OnStartup after SetContext.
func (a *ApplicationContextHolder) Init(ctx context.Context) error {
	dbPath, err := a.fileService.GetAppDatabaseFilePath()
	if err != nil {
		return fmt.Errorf("resolve db path: %w", err)
	}

	database, err := db.Open(dbPath)
	if err != nil {
		return fmt.Errorf("open database: %w", err)
	}
	a.DB = database

	if err := a.SettingsService.InitDefaultSettingsIfAbsent(); err != nil {
		a.appLogger.Warning(fmt.Sprintf("init default settings: %v", err))
	}

	cfg, err := a.readLoggingConfig(ctx)
	if err != nil {
		a.appLogger.Warning(fmt.Sprintf("read logging config from DB: %v", err))
		return nil
	}

	isDev := runtime.Environment(ctx).BuildType == "dev"
	if err := a.appLogger.Reconfigure(cfg, isDev); err != nil {
		a.appLogger.Warning(fmt.Sprintf("reconfigure logger: %v", err))
	}

	return nil
}

// readLoggingConfig reads the seven log.* KV rows from the DB.
func (a *ApplicationContextHolder) readLoggingConfig(ctx context.Context) (logging.Config, error) {
	q := a.DB.Queries

	fileEnabledRow, err := q.GetSetting(ctx, "log.fileEnabled")
	if err != nil {
		return logging.DefaultConfig(), fmt.Errorf("GetSetting log.fileEnabled: %w", err)
	}
	levelRow, _ := q.GetSetting(ctx, "log.level")
	dirRow, _ := q.GetSetting(ctx, "log.directory")
	maxSizeRow, _ := q.GetSetting(ctx, "log.maxSizeMB")
	maxBackupsRow, _ := q.GetSetting(ctx, "log.maxBackups")
	maxAgeRow, _ := q.GetSetting(ctx, "log.maxAgeDays")
	compressRow, _ := q.GetSetting(ctx, "log.compress")

	fileEnabled, _ := strconv.ParseBool(fileEnabledRow.Value)
	compress, _ := strconv.ParseBool(compressRow.Value)
	maxSize, _ := strconv.Atoi(maxSizeRow.Value)
	if maxSize == 0 {
		maxSize = 10
	}
	maxBackups, _ := strconv.Atoi(maxBackupsRow.Value)
	if maxBackups == 0 {
		maxBackups = 5
	}
	maxAge, _ := strconv.Atoi(maxAgeRow.Value)
	if maxAge == 0 {
		maxAge = 30
	}

	cfg := logging.Config{
		FileEnabled: fileEnabled,
		Level:       levelRow.Value,
		MaxSizeMB:   maxSize,
		MaxBackups:  maxBackups,
		MaxAgeDays:  maxAge,
		Compress:    compress,
	}

	if fileEnabled && dirRow.Value == "" {
		resolved, err := a.fileService.EnsureAppLogsFolderExists("")
		if err != nil {
			return cfg, fmt.Errorf("resolve logs dir: %w", err)
		}
		cfg.Directory = resolved
	} else {
		cfg.Directory = dirRow.Value
	}

	return cfg, nil
}

// CancelAllRuns cancels any in-flight background goroutines.
func (a *ApplicationContextHolder) CancelAllRuns() {
	// No background goroutines exist yet; expanded when background processing is introduced.
}

// EnableLoggingForDev enables resty debug logging in dev builds.
func (a *ApplicationContextHolder) EnableLoggingForDev(ctx context.Context) {
	if runtime.Environment(ctx).BuildType == "dev" {
		a.RestyClient.EnableDebug()
	}
}
