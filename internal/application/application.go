package application

import (
	"context"
	"fmt"

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
	SettingsService *settings.SettingsService
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
	// settingsRepo is nil until Init() opens the DB and wires SqliteSettingsRepository.
	settingsService := settings.NewSettingsService(appLogger, nil, fileUtilsService)
	settingsHandler := settings.NewSettingsHandler(appLogger, zlog.Logger, settingsService)

	taskLogService := tasklog.NewTaskLogService(appLogger, settingsService, fileUtilsService)
	promptService := prompts.NewPromptService(appLogger)
	providerFactory := llms.NewProviderFactory(restyClient)
	llmService := llms.NewLLMApiService(appLogger, providerFactory, settingsService)
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

// Init opens the database, wires the SQLite settings repository, and
// reconfigures the logger from the seeded log.* settings.
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

	// Wire SQLite-backed settings into the already-bound handler/service.
	sqliteRepo := settings.NewSqliteSettingsRepository(database)
	a.SettingsService.SetRepository(sqliteRepo)
	a.SettingsHandler.Configure(a.appLogger, zlog.Logger, a.SettingsService)

	// Read logging config via service (now SQLite-backed).
	logCfg, err := a.SettingsService.GetLoggingConfig()
	if err != nil {
		a.appLogger.Warning(fmt.Sprintf("read logging config: %v", err))
		return nil
	}

	isDev := runtime.Environment(ctx).BuildType == "dev"
	lc := logging.Config{
		FileEnabled: logCfg.LogFileEnabled,
		Level:       logCfg.LogLevel,
		MaxSizeMB:   logCfg.LogMaxSizeMB,
		MaxBackups:  logCfg.LogMaxBackups,
		MaxAgeDays:  logCfg.LogMaxAgeDays,
		Compress:    logCfg.LogCompress,
	}
	if logCfg.LogFileEnabled && logCfg.LogDirectory == "" {
		resolved, err := a.fileService.EnsureAppLogsFolderExists("")
		if err != nil {
			return fmt.Errorf("resolve logs dir: %w", err)
		}
		lc.Directory = resolved
	} else {
		lc.Directory = logCfg.LogDirectory
	}

	if err := a.appLogger.Reconfigure(lc, isDev); err != nil {
		a.appLogger.Warning(fmt.Sprintf("reconfigure logger: %v", err))
	}

	return nil
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
