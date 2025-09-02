package internal

import (
	"go_text/internal/backend/core/http_client"
	"go_text/internal/backend/core/llm"
	"go_text/internal/backend/core/prompt"
	"go_text/internal/backend/core/settings"
	coreUI "go_text/internal/backend/core/ui"
	"go_text/internal/backend/interfaces/ui"
)

type ApplicationContext struct {
	ActionApi   ui.AppUIActionApi
	SettingsApi ui.AppUISettingsApi
	StateApi    ui.AppUIStateApi
}

func NewApplicationContext() *ApplicationContext {
	settingsService := settings.NewSettingsService()
	promptService := prompt.NewPromptService()

	httpService := http_client.NewHttpClient(settingsService)
	llmService := llm.NewLLMService(httpService)

	actionApi := coreUI.NewAppUIActionApi(promptService, settingsService, llmService)
	settingsApi := coreUI.NewAppUISettingsApi(settingsService)
	stateApi := coreUI.NewAppUIStateApi(settingsService, promptService, llmService)

	return &ApplicationContext{
		ActionApi:   actionApi,
		SettingsApi: settingsApi,
		StateApi:    stateApi,
	}
}
