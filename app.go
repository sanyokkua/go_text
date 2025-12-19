package main

import (
	"context"
	"go_text/internal/backend/core/utils/http_utils"
	"go_text/internal/v2/api"
	"go_text/internal/v2/backend_api"
	actionapi "go_text/internal/v2/frontend/action"
	settingsapi "go_text/internal/v2/frontend/settings"
	stateapi "go_text/internal/v2/frontend/state"
	"go_text/internal/v2/service/completion"
	"go_text/internal/v2/service/file"
	"go_text/internal/v2/service/http"
	"go_text/internal/v2/service/llm"
	"go_text/internal/v2/service/mapper"
	"go_text/internal/v2/service/prompt"
	"go_text/internal/v2/service/settings"
	"go_text/internal/v2/service/strings"

	"github.com/wailsapp/wails/v2/pkg/runtime"
	"resty.dev/v3"
)

// App struct
type App struct {
	ctx context.Context

	AppActionApi     api.ActionApi
	AppStateApi      api.StateApi
	AppSettingsApi   api.SettingsApi
	FileUtilsService backend_api.FileUtilsApi
	RestyClient      *resty.Client
}

// NewApp creates a new App application struct
func NewApp(loggerApi backend_api.LoggingApi) *App {
	restyClient := http_utils.NewRestyClient()
	mapperService := mapper.NewMapperUtilsService()
	fileUtilsService := file.NewFileUtilsService(loggerApi)
	promptService := prompt.NewPromptService(loggerApi)
	stringUtils := strings.NewStringUtilsApi(loggerApi)
	llmHttpApi := http.NewLlmHttpApiService(loggerApi, restyClient)
	settingsService := settings.NewSettingsService(loggerApi, fileUtilsService, llmHttpApi, mapperService)
	llmService := llm.NewLlmApiService(loggerApi, llmHttpApi, settingsService, mapperService)
	completionService := completion.NewCompletionApiService(loggerApi, stringUtils, promptService, settingsService, llmService)

	// Main API Services
	appSettingsApi := settingsapi.NewSettingsApi(loggerApi, settingsService)
	appActionApi := actionapi.NewActionApi(loggerApi, promptService, completionService)
	appStateApi := stateapi.NewStateApiService(loggerApi, settingsService, mapperService)

	return &App{
		AppActionApi:     appActionApi,
		AppStateApi:      appStateApi,
		AppSettingsApi:   appSettingsApi,
		FileUtilsService: fileUtilsService,
		RestyClient:      restyClient,
	}
}

func (a *App) SetContext(ctx context.Context) {
	a.ctx = ctx
}

func (a *App) EnableLoggingForDev(ctx context.Context) {
	buildInfo := runtime.Environment(ctx)
	if buildInfo.BuildType == "dev" {
		a.RestyClient.EnableDebug()
	}
}
