package main

import (
	"context"
	"go_text/internal/backend/core/utils/file_utils"
)

// App struct
type App struct {
	ctx context.Context
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	err := file_utils.InitDefaultSettingsIfAbsent()
	if err != nil {
		return
	}
}
