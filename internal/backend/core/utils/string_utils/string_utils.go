package string_utils

import (
	"fmt"
	"regexp"
	"strings"
)

func IsBlankString(value string) bool {
	return strings.TrimSpace(value) == ""
}

func ReplaceTemplateParameter(template, value, prompt string) (string, error) {
	if IsBlankString(prompt) {
		return "", fmt.Errorf("prompt cannot be blank")
	}
	if IsBlankString(template) {
		return prompt, fmt.Errorf("template cannot be blank")
	}
	if !strings.Contains(prompt, template) {
		return prompt, nil
	}
	replaceResult := strings.ReplaceAll(prompt, template, value)
	return replaceResult, nil
}

func SanitizeReasoningBlock(llmResponse string) (string, error) {
	re, err := regexp.Compile(`(?s)<think>.*?</think>`)
	if err != nil {
		return "", err
	}
	cleaned := re.ReplaceAllString(llmResponse, "")
	return strings.TrimSpace(cleaned), nil
}
