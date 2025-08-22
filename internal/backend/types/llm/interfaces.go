package llm

type OpenAIRestClient interface {
	GetModels(baseUrl string) ([]Model, error)
	GenerateCompletion(systemPrompt, userPrompt string, temperature float32) (ChatCompletionResponse, error)
}

type ModelNamesExtractor interface {
	GetModelNames(value ModelListResponse) ([]string, error)
}

type ResponseTextExtractor interface {
	GetText(value ChatCompletionResponse) (string, error)
}
