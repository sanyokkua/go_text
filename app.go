package main

import (
	"context"
	"go_text/backend/v2/api"
	"go_text/backend/v2/backend_api"
	actionapi "go_text/backend/v2/frontend/action"
	settingsapi "go_text/backend/v2/frontend/settings"
	"go_text/backend/v2/service/completion"
	"go_text/backend/v2/service/file"
	"go_text/backend/v2/service/http"
	"go_text/backend/v2/service/llm"
	"go_text/backend/v2/service/mapper"
	"go_text/backend/v2/service/prompt"
	"go_text/backend/v2/service/settings"
	"go_text/backend/v2/service/strings"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
	"resty.dev/v3"
)

func NewRestyClient() *resty.Client {
	return resty.New().
		SetTimeout(time.Minute).
		SetHeader("Content-Type", "application/json").
		SetHeader("Accept", "application/json")
}

// App struct
type App struct {
	ctx context.Context

	AppActionApi     api.ActionApi
	AppSettingsApi   api.SettingsApi
	FileUtilsService backend_api.FileUtilsApi
	RestyClient      *resty.Client
}

// NewApp creates a new App application struct
func NewApp(loggerApi backend_api.LoggingApi) *App {
	restyClient := NewRestyClient()
	stringUtils := strings.NewStringUtilsApi(loggerApi)
	mapperService := mapper.NewMapperUtilsService(stringUtils)
	fileUtilsService := file.NewFileUtilsService(loggerApi)
	promptService := prompt.NewPromptService(loggerApi, stringUtils)
	llmHttpApi := http.NewLlmHttpApiService(loggerApi, restyClient, stringUtils)
	settingsService := settings.NewSettingsService(loggerApi, fileUtilsService, llmHttpApi, mapperService)
	llmService := llm.NewLlmApiService(loggerApi, llmHttpApi, settingsService, mapperService)
	completionService := completion.NewCompletionApiService(loggerApi, stringUtils, promptService, settingsService, llmService)

	// Main API Services
	appSettingsApi := settingsapi.NewSettingsApi(loggerApi, settingsService)
	appActionApi := actionapi.NewActionApi(loggerApi, promptService, completionService)

	return &App{
		AppActionApi:     appActionApi,
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
