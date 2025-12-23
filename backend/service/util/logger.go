package util

import (
	"github.com/rs/zerolog/log"
)

type AppLoggerStruct struct {
}

func (a *AppLoggerStruct) Print(message string) {
	log.Print(message)
}
func (a *AppLoggerStruct) Trace(message string) {
	log.Trace().Msg(message)
}
func (a *AppLoggerStruct) Debug(message string) {
	log.Debug().Msg(message)
}
func (a *AppLoggerStruct) Info(message string) {
	log.Info().Msg(message)
}
func (a *AppLoggerStruct) Warning(message string) {
	log.Warn().Msg(message)
}
func (a *AppLoggerStruct) Error(message string) {
	log.Error().Msg(message)
}
func (a *AppLoggerStruct) Fatal(message string) {
	log.Fatal().Msg(message)
}

func (a *AppLoggerStruct) LogDebug(msg string, keysAndValues ...interface{}) {
	log.Debug().Msg(msg)
}

func (a *AppLoggerStruct) LogInfo(msg string, keysAndValues ...interface{}) {
	log.Info().Msg(msg)
}

func (a *AppLoggerStruct) LogWarn(msg string, keysAndValues ...interface{}) {
	log.Warn().Msg(msg)
}

func (a *AppLoggerStruct) LogError(msg string, keysAndValues ...interface{}) {
	log.Error().Msg(msg)
}

func NewLogger() *AppLoggerStruct {
	return &AppLoggerStruct{}
}
