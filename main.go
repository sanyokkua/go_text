package main

import (
	"context"
	"embed"
	"go_text/backend/model/application"
	"go_text/backend/service/util"
	"time"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/logger"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"resty.dev/v3"
)

//go:embed all:frontend/dist
var assets embed.FS

const MinimalWidth = 830
const MinimalHeight = 550

func NewRestyClient() *resty.Client {
	return resty.New().
		SetTimeout(2*time.Minute).
		SetHeader("Content-Type", "application/json").
		SetHeader("Accept", "application/json")
}

func main() {
	// Create custom logger
	loggerApi := util.NewLogger()                             // Logger should be created to pass a link to it and later inject context
	restyClient := NewRestyClient()                           // To configure the REST client before all other objects are created
	app := application.NewApplication(loggerApi, restyClient) // Main App Structure with all dependencies

	// Create an application with options
	err := wails.Run(&options.App{
		Title:     "Text Processing Suite",
		Width:     MinimalWidth,
		Height:    MinimalHeight,
		MinWidth:  MinimalWidth,
		MinHeight: MinimalHeight,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		LogLevel:           logger.DEBUG,
		LogLevelProduction: logger.WARNING,
		BackgroundColour:   &options.RGBA{R: 27, G: 38, B: 54, A: 1},
		OnStartup: func(ctx context.Context) {
			loggerApi.SetContext(&ctx)
			app.SetContext(ctx)
			// Init settings
			err := app.FileUtilsService.InitDefaultSettingsIfAbsent()
			if err != nil {
				return // Ignoring error
			}
		},
		Bind: []interface{}{
			app, app.AppActionApi, app.AppSettingsApi,
		},
	})

	if err != nil {
		println("Error:", err.Error())
	}
}
