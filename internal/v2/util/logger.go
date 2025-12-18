package util

import (
	"context"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type AppLoggerStruct struct {
	ctx *context.Context
}

func (a *AppLoggerStruct) SetContext(ctx *context.Context) {
	a.ctx = ctx
}

func (a *AppLoggerStruct) LogDebug(msg string, keysAndValues ...interface{}) {
	if len(keysAndValues) > 0 {
		runtime.LogDebugf(*a.ctx, msg, keysAndValues...)
		return
	}
	runtime.LogDebug(*a.ctx, msg)
}

func (a *AppLoggerStruct) LogInfo(msg string, keysAndValues ...interface{}) {
	if len(keysAndValues) > 0 {
		runtime.LogInfof(*a.ctx, msg, keysAndValues...)
		return
	}
	runtime.LogInfo(*a.ctx, msg)

}

func (a *AppLoggerStruct) LogWarn(msg string, keysAndValues ...interface{}) {
	if len(keysAndValues) > 0 {
		runtime.LogWarningf(*a.ctx, msg, keysAndValues...)
		return
	}
	runtime.LogWarning(*a.ctx, msg)
}

func (a *AppLoggerStruct) LogError(msg string, keysAndValues ...interface{}) {
	if len(keysAndValues) > 0 {
		runtime.LogErrorf(*a.ctx, msg, keysAndValues...)
		return
	}
	runtime.LogError(*a.ctx, msg)
}

func NewLogger() *AppLoggerStruct {
	return &AppLoggerStruct{}
}
