package application

import (
	"context"
	"go_text/internal/file"
	"go_text/internal/llms"
	"go_text/internal/prompts"
	"go_text/internal/settings"

	"go_text/internal/actions"

	"github.com/wailsapp/wails/v2/pkg/logger"
	"github.com/wailsapp/wails/v2/pkg/runtime"
	"resty.dev/v3"
)

type ApplicationContextHolder struct {
	ctx             context.Context
	SettingsHandler *settings.SettingsHandler
	SettingsService *settings.SettingsService
	ActionHandler   *actions.ActionHandler
	RestyClient     *resty.Client
}

// ApplicationContextHolder creates a new App application struct
func NewApplicationContextHolder(logger logger.Logger, restyClient *resty.Client) *ApplicationContextHolder {
	fileUtilsService := file.NewFileUtilsService(logger)
	settingsRepo := settings.NewSettingsRepository(logger, fileUtilsService)
	settingsService := settings.NewSettingsService(logger, settingsRepo, fileUtilsService)
	settingsHandler := settings.NewSettingsHandler(logger, settingsService)

	promptService := prompts.NewPromptService(logger)
	llmService := llms.NewLLMApiService(logger, restyClient, settingsService)
	actionService := actions.NewActionService(logger, promptService, llmService, settingsService)
	actionHandler := actions.NewActionHandler(logger, actionService)

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
