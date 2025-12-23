package strings

import (
	"fmt"
	"go_text/backend/abstract/backend"
	"regexp"
	"strings"
	"time"
)

type stringUtilsService struct {
	logger backend.LoggingApi
}

func (s stringUtilsService) IsBlankString(value string) bool {
	return strings.TrimSpace(value) == ""
}

func (s stringUtilsService) ReplaceTemplateParameter(template, value, prompt string) (string, error) {
	startTime := time.Now()

	s.logger.Trace(fmt.Sprintf("[stringUtilsService.ReplaceTemplateParameter] Starting template replacement, template=%s, value_length=%d, prompt_length=%d", template, len(value), len(prompt)))

	if s.IsBlankString(prompt) {
		errorMsg := "prompt cannot be blank"
		s.logger.Error(fmt.Sprintf("[stringUtilsService.ReplaceTemplateParameter] Validation failed, error=%s, template=%s, value_length=%d", errorMsg, template, len(value)))
		return "", fmt.Errorf("invalid input: %s", errorMsg)
	}
	if s.IsBlankString(template) {
		errorMsg := "template cannot be blank"
		s.logger.Error(fmt.Sprintf("[stringUtilsService.ReplaceTemplateParameter] Validation failed, error=%s, prompt_length=%d", errorMsg, len(prompt)))
		return prompt, fmt.Errorf("invalid input: %s", errorMsg)
	}
	if !strings.Contains(prompt, template) {
		s.logger.Trace(fmt.Sprintf("[stringUtilsService.ReplaceTemplateParameter] Template not found, no replacement needed, template=%s, prompt_length=%d", template, len(prompt)))
		return prompt, nil
	}

	originalPrompt := prompt
	replaceResult := strings.ReplaceAll(prompt, template, value)

	duration := time.Since(startTime)
	s.logger.Trace(fmt.Sprintf("[stringUtilsService.ReplaceTemplateParameter] Template replacement completed, duration_ms=%d, template=%s, original_length=%d, result_length=%d, length_change=%d", duration.Milliseconds(), template, len(originalPrompt), len(replaceResult), len(replaceResult)-len(originalPrompt)))

	return replaceResult, nil
}

func (s stringUtilsService) SanitizeReasoningBlock(llmResponse string) (string, error) {
	startTime := time.Now()
	s.logger.Info("[SanitizeReasoningBlock] Starting sanitization of LLM response")

	if s.IsBlankString(llmResponse) {
		s.logger.Trace("[SanitizeReasoningBlock] Response is blank, no sanitization needed")
		return "", nil
	}

	re, err := regexp.Compile(`(?s)<think>.*?</think>`)
	if err != nil {
		s.logger.Error(fmt.Sprintf("[SanitizeReasoningBlock] Failed to compile regex pattern: %v", err))
		return "", fmt.Errorf("failed to compile sanitization regex: %w", err)
	}

	originalLength := len(llmResponse)
	cleaned := re.ReplaceAllString(llmResponse, "")
	cleaned = strings.TrimSpace(cleaned)
	cleanedLength := len(cleaned)

	duration := time.Since(startTime)
	s.logger.Info(fmt.Sprintf("[SanitizeReasoningBlock] Successfully sanitized response in %v. Original length: %d, Cleaned length: %d, Characters removed: %d", duration, originalLength, cleanedLength, originalLength-cleanedLength))

	return cleaned, nil
}

func NewStringUtilsApi(logger backend.LoggingApi) backend.StringUtilsApi {
	return &stringUtilsService{
		logger: logger,
	}
}
