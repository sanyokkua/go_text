package application

import (
	"context"
	"go_text/backend/abstract/backend"
	"go_text/backend/abstract/frontend"
	actionapi "go_text/backend/controller/action"
	settingsapi "go_text/backend/controller/settings"
	"go_text/backend/service/completion"
	"go_text/backend/service/file"
	"go_text/backend/service/http"
	"go_text/backend/service/llm"
	"go_text/backend/service/mapper"
	"go_text/backend/service/prompt"
	"go_text/backend/service/settings"
	"go_text/backend/service/strings"

	"github.com/wailsapp/wails/v2/pkg/runtime"
	"resty.dev/v3"
)

type Application struct {
	ctx              context.Context
	AppActionApi     frontend.ActionApi
	AppSettingsApi   frontend.SettingsApi
	FileUtilsService backend.FileUtilsApi
	RestyClient      *resty.Client
}

// NewApplication creates a new App application struct
func NewApplication(loggerApi backend.LoggingApi, restyClient *resty.Client) *Application {
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

	return &Application{
		AppActionApi:     appActionApi,
		AppSettingsApi:   appSettingsApi,
		FileUtilsService: fileUtilsService,
		RestyClient:      restyClient,
	}
}

func (a *Application) SetContext(ctx context.Context) {
	a.ctx = ctx
}

func (a *Application) EnableLoggingForDev(ctx context.Context) {
	buildInfo := runtime.Environment(ctx)
	if buildInfo.BuildType == "dev" {
		a.RestyClient.EnableDebug()
	}
}
