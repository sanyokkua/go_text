package strings

import (
	"fmt"
	"regexp"
	"strings"
	"time"

	"go_text/backend/v2/backend_api"
)

type stringUtilsService struct {
	logger backend_api.LoggingApi
}

func (s stringUtilsService) IsBlankString(value string) bool {
	return strings.TrimSpace(value) == ""
}

func (s stringUtilsService) ReplaceTemplateParameter(template, value, prompt string) (string, error) {
	startTime := time.Now()
	s.logger.LogDebug(fmt.Sprintf("[ReplaceTemplateParameter] Starting replacement - Template: %s, Value length: %d, Prompt length: %d", template, len(value), len(prompt)))

	if s.IsBlankString(prompt) {
		errorMsg := "prompt cannot be blank"
		s.logger.LogError(fmt.Sprintf("[ReplaceTemplateParameter] %s", errorMsg))
		return "", fmt.Errorf("invalid input: %s", errorMsg)
	}
	if s.IsBlankString(template) {
		errorMsg := "template cannot be blank"
		s.logger.LogError(fmt.Sprintf("[ReplaceTemplateParameter] %s", errorMsg))
		return prompt, fmt.Errorf("invalid input: %s", errorMsg)
	}
	if !strings.Contains(prompt, template) {
		s.logger.LogDebug(fmt.Sprintf("[ReplaceTemplateParameter] Template '%s' not found in prompt, no replacement needed", template))
		return prompt, nil
	}

	originalPrompt := prompt
	replaceResult := strings.ReplaceAll(prompt, template, value)

	duration := time.Since(startTime)
	s.logger.LogDebug(fmt.Sprintf("[ReplaceTemplateParameter] Successfully replaced template '%s' in %v. Before length: %d, After length: %d", template, duration, len(originalPrompt), len(replaceResult)))

	return replaceResult, nil
}

func (s stringUtilsService) SanitizeReasoningBlock(llmResponse string) (string, error) {
	startTime := time.Now()
	s.logger.LogInfo("[SanitizeReasoningBlock] Starting sanitization of LLM response")

	if s.IsBlankString(llmResponse) {
		s.logger.LogDebug("[SanitizeReasoningBlock] Response is blank, no sanitization needed")
		return "", nil
	}

	re, err := regexp.Compile(`(?s)<think>.*?</think>`)
	if err != nil {
		s.logger.LogError(fmt.Sprintf("[SanitizeReasoningBlock] Failed to compile regex pattern: %v", err))
		return "", fmt.Errorf("failed to compile sanitization regex: %w", err)
	}

	originalLength := len(llmResponse)
	cleaned := re.ReplaceAllString(llmResponse, "")
	cleaned = strings.TrimSpace(cleaned)
	cleanedLength := len(cleaned)

	duration := time.Since(startTime)
	s.logger.LogInfo(fmt.Sprintf("[SanitizeReasoningBlock] Successfully sanitized response in %v. Original length: %d, Cleaned length: %d, Characters removed: %d", duration, originalLength, cleanedLength, originalLength-cleanedLength))

	return cleaned, nil
}

func NewStringUtilsApi(logger backend_api.LoggingApi) backend_api.StringUtilsApi {
	return &stringUtilsService{
		logger: logger,
	}
}
