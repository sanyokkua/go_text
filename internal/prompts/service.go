package prompts

import (
	"fmt"
	"regexp"
	"strings"
	"time"

	"go_text/internal/apperr"
	v3 "go_text/internal/prompts/v3"

	"github.com/wailsapp/wails/v2/pkg/logger"
)

type PromptServiceAPI interface {
	SanitizeReasoningBlock(llmResponse string) (string, error)
	Catalog() []apperr.ActionMeta
}

type PromptService struct {
	logger         logger.Logger
	sanitizeRegexp *regexp.Regexp
}

func NewPromptService(logger logger.Logger) PromptServiceAPI {
	if logger == nil {
		panic("PromptService: logger must not be nil")
	}

	return &PromptService{
		logger: logger,
	}
}

func (s *PromptService) SanitizeReasoningBlock(llmResponse string) (string, error) {
	const op = "PromptService.SanitizeReasoningBlock"
	startTime := time.Now()

	s.logger.Debug(fmt.Sprintf("%s: starting LLM response sanitization", op))

	if strings.TrimSpace(llmResponse) == "" {
		s.logger.Trace(fmt.Sprintf("%s: response is empty, nothing to sanitize", op))
		return "", nil
	}

	if s.sanitizeRegexp == nil {
		re, err := regexp.Compile(`(?s)<think>.*?</think>`)
		if err != nil {
			s.logger.Error(fmt.Sprintf("%s: failed to compile regex: %v", op, err))
			return "", fmt.Errorf("%s: regex compilation failed: %w", op, err)
		}
		s.sanitizeRegexp = re
	}

	originalLength := len(llmResponse)
	cleaned := strings.TrimSpace(s.sanitizeRegexp.ReplaceAllString(llmResponse, ""))

	if originalLength != len(cleaned) {
		s.logger.Debug(fmt.Sprintf(
			"%s: sanitization completed in %dms, original_length=%d, cleaned_length=%d",
			op,
			time.Since(startTime).Milliseconds(),
			originalLength,
			len(cleaned),
		))
	}

	return cleaned, nil
}

func (p *PromptService) Catalog() []apperr.ActionMeta {
	return v3.Catalog()
}
