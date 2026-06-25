package application

import (
	"context"
	"go_text/internal/actions"
	"go_text/internal/file"
	"go_text/internal/llms"
	"go_text/internal/prompts"
	"go_text/internal/settings"
	"go_text/internal/tasklog"

	zlog "github.com/rs/zerolog/log"
	"github.com/wailsapp/wails/v2/pkg/logger"
	"github.com/wailsapp/wails/v2/pkg/runtime"
	"resty.dev/v3"
)

type ApplicationContextHolder struct {
	ctx             context.Context
	SettingsHandler *settings.SettingsHandler
	SettingsService settings.SettingsServiceAPI
	ActionHandler   *actions.ActionHandler
	RestyClient     *resty.Client
}

// ApplicationContextHolder creates a new App application struct
func NewApplicationContextHolder(wailsLogger logger.Logger, restyClient *resty.Client) *ApplicationContextHolder {
	fileUtilsService := file.NewFileUtilsService(wailsLogger)
	settingsRepo := settings.NewSettingsRepository(wailsLogger, fileUtilsService)
	settingsService := settings.NewSettingsService(wailsLogger, settingsRepo, fileUtilsService)
	settingsHandler := settings.NewSettingsHandler(wailsLogger, zlog.Logger, settingsService)

	taskLogService := tasklog.NewTaskLogService(wailsLogger, settingsService, fileUtilsService)
	promptService := prompts.NewPromptService(wailsLogger)
	llmService := llms.NewLLMApiService(wailsLogger, restyClient, settingsService)
	actionService := actions.NewActionService(wailsLogger, promptService, llmService, settingsService, taskLogService)
	actionHandler := actions.NewActionHandler(wailsLogger, zlog.Logger, actionService)

	return &ApplicationContextHolder{
		SettingsHandler: settingsHandler,
		SettingsService: settingsService,
		ActionHandler:   actionHandler,
		RestyClient:     restyClient,
	}
}

func (a *ApplicationContextHolder) SetContext(ctx context.Context) {
	a.ctx = ctx
}

func (a *ApplicationContextHolder) EnableLoggingForDev(ctx context.Context) {
	buildInfo := runtime.Environment(ctx)
	if buildInfo.BuildType == "dev" {
		a.RestyClient.EnableDebug()
	}
}
