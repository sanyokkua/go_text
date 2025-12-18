package main

import (
	"context"
	"embed"
	"go_text/internal"
	"go_text/internal/v2/util"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/logger"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
)

//go:embed all:frontend/dist
var assets embed.FS

const MinimalWidth = 830
const MinimalHeight = 550

func main() {
	// Create custom logger
	loggerApi := util.NewLogger()
	// Create an instance of the app structure
	app := NewApp(loggerApi, true)

	apiContext := internal.NewApplicationContext()

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
			app, app.AppActionApi, app.AppStateApi, app.AppSettingsApi,
			apiContext.ActionApi, apiContext.SettingsApi, apiContext.StateApi,
		},
	})

	if err != nil {
		println("Error:", err.Error())
	}
}
