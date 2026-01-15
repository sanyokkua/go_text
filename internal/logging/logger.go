package logging

import "github.com/rs/zerolog/log"

type AppStructLogger struct {
}

func (a *AppStructLogger) Print(message string) {
	log.Print(message)
}
func (a *AppStructLogger) Trace(message string) {
	log.Trace().Msg(message)
}
func (a *AppStructLogger) Debug(message string) {
	log.Debug().Msg(message)
}
func (a *AppStructLogger) Info(message string) {
	log.Info().Msg(message)
}
func (a *AppStructLogger) Warning(message string) {
	log.Warn().Msg(message)
}
func (a *AppStructLogger) Error(message string) {
	log.Error().Msg(message)
}
func (a *AppStructLogger) Fatal(message string) {
	log.Fatal().Msg(message)
}

func NewAppStructLogger() *AppStructLogger {
	return &AppStructLogger{}
}
