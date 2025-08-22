package settings

func NewSettings(baseUrl string, headers map[string]string, modelName string, temperature float32, defaultInputLanguage, defaultOutputLanguage string) Settings {
	return Settings{
		BaseUrl:               baseUrl,
		Headers:               headers,
		ModelName:             modelName,
		Temperature:           temperature,
		DefaultInputLanguage:  defaultInputLanguage,
		DefaultOutputLanguage: defaultOutputLanguage,
	}
}
