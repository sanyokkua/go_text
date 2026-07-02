package application

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	stdruntime "runtime"
	"strings"

	"go_text/internal/actions"
	"go_text/internal/apperr"
	"go_text/internal/db"
	"go_text/internal/file"
	"go_text/internal/gate"
	"go_text/internal/history"
	"go_text/internal/llms"
	"go_text/internal/logging"
	"go_text/internal/prompts"
	"go_text/internal/settings"
	"go_text/internal/stacks"
	"go_text/internal/tasklog"
	"go_text/internal/verification"

	zlog "github.com/rs/zerolog/log"
	"github.com/wailsapp/wails/v2/pkg/runtime"
	"resty.dev/v3"
)

const panicFmt = "panic: %v"

// ApplicationContextHolder is the DI root. All exported fields are Wails-bound.
type ApplicationContextHolder struct {
	ctx             context.Context
	SettingsHandler *settings.SettingsHandler
	SettingsService *settings.SettingsService
	ActionHandler   *actions.ActionHandler
	StackHandler    *stacks.StackHandler
	HistoryHandler  *history.HistoryHandler
	RestyClient     *resty.Client
	DB              *db.Database

	fileService    file.FileUtilsServiceAPI
	appLogger      *logging.Logger
	historyService *history.HistoryService
}

// NewApplicationContextHolder wires the DI graph.
// The bootstrap appLogger is console-only; Init() reconfigures it from DB settings.
func NewApplicationContextHolder(appLogger *logging.Logger, restyClient *resty.Client) *ApplicationContextHolder {
	fileUtilsService := file.NewFileUtilsService(appLogger)
	// settingsRepo is nil until Init() opens the DB and wires SqliteSettingsRepository.
	settingsService := settings.NewSettingsService(appLogger, nil, fileUtilsService)
	settingsHandler := settings.NewSettingsHandler(appLogger, zlog.Logger, settingsService, providerPresets())

	taskLogService := tasklog.NewTaskLogService(appLogger, settingsService, fileUtilsService)
	historyService := history.NewHistoryService(appLogger, settingsService)
	promptService := prompts.NewPromptService(appLogger)
	providerFactory := llms.NewProviderFactory(restyClient)
	llmService := llms.NewLLMApiService(appLogger, providerFactory, settingsService)
	actionService := actions.NewActionService(appLogger, promptService, llmService, settingsService, taskLogService, historyService)

	inferenceGate := gate.New()
	verificationService := verification.NewService(appLogger, providerFactory, settingsService, inferenceGate)
	actionHandler := actions.NewActionHandler(appLogger, zlog.Logger, actionService, verificationService, inferenceGate)

	catalog := actionService.GetActionCatalog()
	stackHandler := stacks.NewStackHandler(appLogger, zlog.Logger, nil, catalog, suggestedStackRecipes())
	historyHandler := history.NewHistoryHandler(appLogger, zlog.Logger, historyService)

	return &ApplicationContextHolder{
		SettingsHandler: settingsHandler,
		SettingsService: settingsService,
		ActionHandler:   actionHandler,
		StackHandler:    stackHandler,
		HistoryHandler:  historyHandler,
		RestyClient:     restyClient,
		fileService:     fileUtilsService,
		appLogger:       appLogger,
		historyService:  historyService,
	}
}

// providerPresets converts the db-owned provider presets into the apperr wire
// type. Kept here (not in db) so the db package stays free of apperr imports.
func providerPresets() []apperr.ProviderPreset {
	src := db.ProviderPresets()
	out := make([]apperr.ProviderPreset, len(src))
	for i, p := range src {
		out[i] = apperr.ProviderPreset{
			Name:           p.Name,
			Kind:           p.Kind,
			BaseURL:        p.BaseURL,
			AuthScheme:     p.AuthScheme,
			CompletionPath: p.CompletionPath,
			ModelsPath:     p.ModelsPath,
			APIKeyEnvVar:   p.APIKeyEnvVar,
			Headers:        p.Headers,
		}
	}
	return out
}

// suggestedStackRecipes converts the db-owned starter-stack recipes into the
// stacks handler's input type, keeping the stacks package free of a db import.
func suggestedStackRecipes() []stacks.SuggestedStackRecipe {
	src := db.StarterStackRecipes()
	out := make([]stacks.SuggestedStackRecipe, len(src))
	for i, r := range src {
		out[i] = stacks.SuggestedStackRecipe{
			Name:    r.Name,
			Icon:    r.Icon,
			Actions: r.Actions,
		}
	}
	return out
}

// SetContext stores the Wails runtime context for use by bound methods.
func (a *ApplicationContextHolder) SetContext(ctx context.Context) {
	a.ctx = ctx
	a.ActionHandler.SetContext(ctx)
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
	if err := a.restoreWindowSize(ctx); err != nil {
		a.appLogger.Warning(fmt.Sprintf("restore window size: %v", err))
	}
	a.SettingsHandler.Configure(a.appLogger, zlog.Logger, a.SettingsService)

	historyRepo := history.NewSqliteHistoryRepository(database)
	a.historyService.SetRepository(historyRepo)

	stackRepo := stacks.NewSqliteStackRepository(database)
	a.StackHandler.SetRepository(stackRepo)
	a.ActionHandler.SetStackLookup(a.StackHandler)

	// Read logging config via service (now SQLite-backed).
	logCfg, err := a.SettingsService.GetLoggingConfig()
	if err != nil {
		a.appLogger.Warning(fmt.Sprintf("read logging config: %v", err))
		return nil
	}

	isDev := runtime.Environment(ctx).BuildType == "dev"
	a.SettingsHandler.SetAppLogger(a.appLogger, a.fileService, isDev)
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

// restoreWindowSize applies the last-persisted window size on startup, falling
// back to the options.App defaults (already applied at window creation) if no
// settings-backed size can be read.
func (a *ApplicationContextHolder) restoreWindowSize(ctx context.Context) error {
	cfg, err := a.SettingsService.GetWindowSizeConfig()
	if err != nil {
		return fmt.Errorf("get window size: %w", err)
	}
	runtime.WindowSetSize(ctx, cfg.Width, cfg.Height)
	return nil
}

// CancelAllRuns cancels every in-flight chain run (called on shutdown).
func (a *ApplicationContextHolder) CancelAllRuns() {
	a.ActionHandler.CancelAllRuns()
}

// EnableLoggingForDev enables resty debug logging in dev builds.
func (a *ApplicationContextHolder) EnableLoggingForDev(ctx context.Context) {
	if runtime.Environment(ctx).BuildType == "dev" {
		a.RestyClient.EnableDebug()
	}
}

func (a *ApplicationContextHolder) LogError(message string) (res apperr.VoidResult) {
	defer func() {
		if r := recover(); r != nil {
			ae := apperr.Internal(fmt.Errorf(panicFmt, r))
			wire := apperr.ToWire(zlog.Logger, ae)
			res = apperr.VoidResult{Error: &wire}
		}
	}()
	a.appLogger.Error(message)
	return apperr.VoidResult{}
}

func (a *ApplicationContextHolder) ClipboardGetText() (res apperr.StringResult) {
	defer func() {
		if r := recover(); r != nil {
			ae := apperr.Internal(fmt.Errorf(panicFmt, r))
			wire := apperr.ToWire(zlog.Logger, ae)
			res = apperr.StringResult{Error: &wire}
		}
	}()
	text, err := runtime.ClipboardGetText(a.ctx)
	if err != nil {
		ae := apperr.Internal(fmt.Errorf("clipboard get: %w", err))
		wire := apperr.ToWire(zlog.Logger, ae)
		return apperr.StringResult{Error: &wire}
	}
	return apperr.StringResult{Data: text}
}

func (a *ApplicationContextHolder) ClipboardSetText(text string) (res apperr.VoidResult) {
	defer func() {
		if r := recover(); r != nil {
			ae := apperr.Internal(fmt.Errorf(panicFmt, r))
			wire := apperr.ToWire(zlog.Logger, ae)
			res = apperr.VoidResult{Error: &wire}
		}
	}()
	if err := runtime.ClipboardSetText(a.ctx, text); err != nil {
		ae := apperr.Internal(fmt.Errorf("clipboard set: %w", err))
		wire := apperr.ToWire(zlog.Logger, ae)
		return apperr.VoidResult{Error: &wire}
	}
	return apperr.VoidResult{}
}

func (a *ApplicationContextHolder) BrowserOpenURL(url string) (res apperr.VoidResult) {
	defer func() {
		if r := recover(); r != nil {
			ae := apperr.Internal(fmt.Errorf(panicFmt, r))
			wire := apperr.ToWire(zlog.Logger, ae)
			res = apperr.VoidResult{Error: &wire}
		}
	}()
	if !strings.HasPrefix(url, "http://") && !strings.HasPrefix(url, "https://") {
		ae := apperr.Validation("url", "http or https URL", url)
		wire := apperr.ToWire(zlog.Logger, ae)
		return apperr.VoidResult{Error: &wire}
	}
	runtime.BrowserOpenURL(a.ctx, url)
	return apperr.VoidResult{}
}

// SaveWindowSize persists the native window's current dimensions so they can
// be restored on next launch. Called by the frontend (debounced) on resize.
func (a *ApplicationContextHolder) SaveWindowSize(width, height int) (res apperr.VoidResult) {
	defer func() {
		if r := recover(); r != nil {
			ae := apperr.Internal(fmt.Errorf(panicFmt, r))
			wire := apperr.ToWire(zlog.Logger, ae)
			res = apperr.VoidResult{Error: &wire}
		}
	}()
	if err := a.SettingsService.SaveWindowSize(width, height); err != nil {
		wire := apperr.ToWire(zlog.Logger, err)
		return apperr.VoidResult{Error: &wire}
	}
	return apperr.VoidResult{}
}

// runOpenCommand is the execution seam for OpenPath. Tests swap it to assert
// the chosen argv without launching a real OS file manager.
var runOpenCommand = func(name string, args ...string) error {
	return exec.Command(name, args...).Run()
}

// openPathArgs returns the OS file-manager command and arguments for goos.
// It is a pure function (no side effects) so tests can assert the argv per
// platform directly. An unsupported platform yields a validation error.
func openPathArgs(goos, path string) (name string, args []string, err error) {
	switch goos {
	case "darwin":
		return "open", []string{path}, nil
	case "windows":
		return "explorer", []string{path}, nil
	case "linux":
		return "xdg-open", []string{path}, nil
	default:
		return "", nil, apperr.Validation("platform", "darwin, windows, or linux", goos)
	}
}

// OpenPath opens a folder or file in the OS file manager. It validates that the
// path is non-empty and exists before launching, then dispatches by GOOS.
// On Windows, explorer commonly exits non-zero even on success, so its exit
// error is not treated as failure.
func (a *ApplicationContextHolder) OpenPath(path string) (res apperr.VoidResult) {
	defer func() {
		if r := recover(); r != nil {
			ae := apperr.Internal(fmt.Errorf(panicFmt, r))
			wire := apperr.ToWire(zlog.Logger, ae)
			res = apperr.VoidResult{Error: &wire}
		}
	}()
	if strings.TrimSpace(path) == "" {
		ae := apperr.Validation("path", "be non-empty", "empty string")
		wire := apperr.ToWire(zlog.Logger, ae)
		return apperr.VoidResult{Error: &wire}
	}
	if _, err := os.Stat(path); err != nil {
		ae := apperr.Validation("path", "point to an existing path", "not found")
		wire := apperr.ToWire(zlog.Logger, ae)
		return apperr.VoidResult{Error: &wire}
	}
	name, args, err := openPathArgs(stdruntime.GOOS, path)
	if err != nil {
		wire := apperr.ToWire(zlog.Logger, err)
		return apperr.VoidResult{Error: &wire}
	}
	if err := runOpenCommand(name, args...); err != nil && stdruntime.GOOS != "windows" {
		ae := apperr.Internal(fmt.Errorf("open path: %w", err))
		wire := apperr.ToWire(zlog.Logger, ae)
		return apperr.VoidResult{Error: &wire}
	}
	return apperr.VoidResult{}
}
