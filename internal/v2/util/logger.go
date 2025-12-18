package util

import (
	"context"
	"go_text/internal/v2/backend_api"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type appLogger struct {
	ctx *context.Context
}

func (a appLogger) LogDebug(msg string, keysAndValues ...interface{}) {
	if len(keysAndValues) > 0 {
		runtime.LogDebugf(*a.ctx, msg, keysAndValues...)
		return
	}
	runtime.LogDebug(*a.ctx, msg)
}

func (a appLogger) LogInfo(msg string, keysAndValues ...interface{}) {
	if len(keysAndValues) > 0 {
		runtime.LogInfof(*a.ctx, msg, keysAndValues...)
		return
	}
	runtime.LogInfo(*a.ctx, msg)

}

func (a appLogger) LogWarn(msg string, keysAndValues ...interface{}) {
	if len(keysAndValues) > 0 {
		runtime.LogWarningf(*a.ctx, msg, keysAndValues...)
		return
	}
	runtime.LogWarning(*a.ctx, msg)
}

func (a appLogger) LogError(msg string, keysAndValues ...interface{}) {
	if len(keysAndValues) > 0 {
		runtime.LogErrorf(*a.ctx, msg, keysAndValues...)
		return
	}
	runtime.LogError(*a.ctx, msg)
}

func NewLogger(ctx *context.Context) backend_api.LoggingApi {
	return &appLogger{ctx: ctx}
}
