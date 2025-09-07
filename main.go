package main

import (
	"embed"
	"go_text/internal"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
)

//go:embed all:frontend/dist
var assets embed.FS

const MinimalWidth = 830
const MinimalHeight = 550

func main() {
	// Create an instance of the app structure
	app := NewApp()
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
		BackgroundColour: &options.RGBA{R: 27, G: 38, B: 54, A: 1},
		OnStartup:        app.startup,
		Bind: []interface{}{
			app, apiContext.ActionApi, apiContext.SettingsApi, apiContext.StateApi,
		},
	})

	if err != nil {
		println("Error:", err.Error())
	}
}
