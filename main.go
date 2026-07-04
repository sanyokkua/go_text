package main

import (
	"context"
	"embed"
	"errors"
	"fmt"
	"os"
	"time"

	"go_text/internal/apperr"
	"go_text/internal/application"
	"go_text/internal/bootstrap"
	"go_text/internal/db"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/runtime"
	"resty.dev/v3"
)

//go:embed all:frontend/dist
var assets embed.FS

const MinimalWidth = 830
const MinimalHeight = 550

var allErrorCodes = []struct {
	Value  apperr.ErrorCode
	TSName string
}{
	{apperr.CodeValidation, "CodeValidation"},
	{apperr.CodeInvalidPlan, "CodeInvalidPlan"},
	{apperr.CodeBusy, "CodeBusy"},
	{apperr.CodeAuth, "CodeAuth"},
	{apperr.CodeMissingCredential, "CodeMissingCredential"},
	{apperr.CodeProviderUnreachable, "CodeProviderUnreachable"},
	{apperr.CodeTimeout, "CodeTimeout"},
	{apperr.CodeRateLimited, "CodeRateLimited"},
	{apperr.CodeModelNotFound, "CodeModelNotFound"},
	{apperr.CodeUpstream, "CodeUpstream"},
	{apperr.CodeEmptyCompletion, "CodeEmptyCompletion"},
	{apperr.CodeContextWindow, "CodeContextWindow"},
	{apperr.CodeStepFailed, "CodeStepFailed"},
	{apperr.CodeCancelled, "CodeCancelled"},
	{apperr.CodeInternal, "CodeInternal"},
}

func NewRestyClient() *resty.Client {
	return resty.New().
		SetTimeout(2*time.Minute).
		SetHeader("Content-Type", "application/json").
		SetHeader("Accept", "application/json")
}

func main() {
	appLogger, err := bootstrap.NewLogger()
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to create logger: %v\n", err)
		os.Exit(1)
	}

	restyClient := NewRestyClient()
	app := application.NewApplicationContextHolder(appLogger, restyClient)

	err = wails.Run(&options.App{
		Title:     "GoText",
		Width:     MinimalWidth,
		Height:    MinimalHeight,
		MinWidth:  MinimalWidth,
		MinHeight: MinimalHeight,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		Logger:           appLogger,
		BackgroundColour: &options.RGBA{R: 27, G: 38, B: 54, A: 1},
		OnStartup: func(ctx context.Context) {
			app.SetContext(ctx)
			if err := app.Init(ctx); err != nil {
				appLogger.Error(fmt.Sprintf("startup failed: %v", err))
				title, message := "Startup error", "The application could not start (database unavailable). See logs for details."
				if errors.Is(err, db.ErrInstanceLocked) {
					title, message = "Already running", "GoText is already running. Please close the other instance before starting a new one."
				}
				runtime.MessageDialog(ctx, runtime.MessageDialogOptions{
					Type:    runtime.ErrorDialog,
					Title:   title,
					Message: message,
				})
				os.Exit(1)
			}
		},
		OnShutdown: func(ctx context.Context) {
			app.CancelAllRuns()
			if app.DB != nil {
				if err := app.DB.Close(); err != nil {
					appLogger.Error(fmt.Sprintf("close DB: %v", err))
				}
			}
			if err := appLogger.Close(); err != nil {
				fmt.Fprintf(os.Stderr, "close logger: %v\n", err)
			}
		},
		Bind: []any{
			app, app.ActionHandler, app.SettingsHandler, app.StackHandler, app.HistoryHandler,
		},
		EnumBind: []any{
			allErrorCodes,
		},
	})

	if err != nil {
		appLogger.Error(fmt.Sprintf("wails.Run: %v", err))
		os.Exit(1)
	}
}
