package backend_api

type StringUtilsApi interface {
	IsBlankString(value string) bool
	ReplaceTemplateParameter(template, value, prompt string) (string, error)
	SanitizeReasoningBlock(llmResponse string) (string, error)
}
