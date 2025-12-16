package internal

import (
	"go_text/internal/backend/core/http_client"
	"go_text/internal/backend/core/llm_client"
	"go_text/internal/backend/core/prompt"
	"go_text/internal/backend/core/settings"
	"go_text/internal/backend/core/ui"
	"go_text/internal/backend/core/utils"
	"go_text/internal/backend/core/utils/http_utils"
)

type ApplicationContext struct {
	ActionApi   ui.AppUIActionApi
	SettingsApi ui.AppUISettingsApi
	StateApi    ui.AppUIStateApi
}

func NewApplicationContext() *ApplicationContext {
	settingsService := settings.NewSettingsService()
	promptService := prompt.NewPromptService()
	utilsService := utils.NewUtilsService()
	restyClient := http_utils.NewRestyClient()
	restyClient.EnableDebug()

	appHttpClient := http_client.NewAppHttpClient(utilsService, settingsService, restyClient)
	appLlmService := llm_client.NewAppLLMService(appHttpClient, utilsService)

	actionApi := ui.NewAppUIActionApi(promptService, settingsService, appLlmService, utilsService)
	settingsApi := ui.NewAppUISettingsApi(settingsService, restyClient, utilsService)
	stateApi := ui.NewAppUIStateApi(settingsService, promptService, appLlmService, utilsService)

	return &ApplicationContext{
		ActionApi:   actionApi,
		SettingsApi: settingsApi,
		StateApi:    stateApi,
	}
}
