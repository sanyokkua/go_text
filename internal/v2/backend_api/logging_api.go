package backend_api

type LoggingApi interface {
	LogDebug(msg string, keysAndValues ...interface{})
	LogInfo(msg string, keysAndValues ...interface{})
	LogWarn(msg string, keysAndValues ...interface{})
	LogError(msg string, keysAndValues ...interface{})
}
