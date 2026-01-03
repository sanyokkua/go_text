package prompts

import (
	"errors"
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/wailsapp/wails/v2/pkg/logger"
)

type PromptService struct {
	logger         logger.Logger
	sanitizeRegexp *regexp.Regexp
}

func NewPromptService(logger logger.Logger) *PromptService {
	if logger == nil {
		panic("PromptService: logger must not be nil")
	}

	return &PromptService{
		logger: logger,
	}
}

func (s *PromptService) ReplaceTemplateParameter(token, replacementValue, sourceTemplate string) (string, error) {
	const op = "PromptService.ReplaceTemplateParameter"
	startTime := time.Now()

	s.logger.Trace(fmt.Sprintf(
		"%s: starting template replacement, token=%q, replacement_length=%d, template_length=%d",
		op, token, len(replacementValue), len(sourceTemplate),
	))

	if strings.TrimSpace(sourceTemplate) == "" {
		err := errors.New("source template is empty or whitespace")
		s.logger.Error(fmt.Sprintf("%s: validation failed: %v", op, err))
		return "", fmt.Errorf("%s: invalid input: %w", op, err)
	}

	if strings.TrimSpace(token) == "" {
		err := errors.New("template token is empty or whitespace")
		s.logger.Error(fmt.Sprintf("%s: validation failed: %v", op, err))
		return sourceTemplate, fmt.Errorf("%s: invalid input: %w", op, err)
	}

	if !strings.Contains(sourceTemplate, token) {
		s.logger.Trace(fmt.Sprintf(
			"%s: token not found in template, skipping replacement, token=%q",
			op, token,
		))
		return sourceTemplate, nil
	}

	result := strings.ReplaceAll(sourceTemplate, token, replacementValue)

	s.logger.Trace(fmt.Sprintf(
		"%s: replacement completed in %dms, length_before=%d, length_after=%d",
		op,
		time.Since(startTime).Milliseconds(),
		len(sourceTemplate),
		len(result),
	))

	return result, nil
}

func (s *PromptService) SanitizeReasoningBlock(llmResponse string) (string, error) {
	const op = "PromptService.SanitizeReasoningBlock"
	startTime := time.Now()

	s.logger.Info(fmt.Sprintf("%s: starting LLM response sanitization", op))

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

	s.logger.Info(fmt.Sprintf(
		"%s: sanitization completed in %dms, original_length=%d, cleaned_length=%d",
		op,
		time.Since(startTime).Milliseconds(),
		originalLength,
		len(cleaned),
	))

	return cleaned, nil
}

func (p *PromptService) GetAppPrompts() *Prompts {
	return &ApplicationPrompts
}

func (p *PromptService) GetSystemPromptByCategory(category string) (Prompt, error) {
	const op = "PromptService.GetSystemPromptByCategory"

	if strings.TrimSpace(category) == "" {
		return Prompt{}, fmt.Errorf("%s: category must not be empty", op)
	}

	group, ok := p.GetAppPrompts().PromptGroups[category]
	if !ok {
		return Prompt{}, fmt.Errorf("%s: unknown prompt category %q", op, category)
	}

	return group.SystemPrompt, nil
}

func (p *PromptService) GetUserPromptById(id string) (Prompt, error) {
	const op = "PromptService.GetUserPromptById"

	if strings.TrimSpace(id) == "" {
		return Prompt{}, fmt.Errorf("%s: prompt id must not be empty", op)
	}

	for _, group := range p.GetAppPrompts().PromptGroups {
		if prompt, ok := group.Prompts[id]; ok {
			return prompt, nil
		}
	}

	return Prompt{}, fmt.Errorf("%s: unknown prompt id %q", op, id)
}

func (p *PromptService) GetPrompt(promptID string) (Prompt, error) {
	const op = "PromptService.GetPrompt"
	startTime := time.Now()

	p.logger.Info(fmt.Sprintf("%s: retrieving prompt, id=%q", op, promptID))

	prompt, err := p.GetUserPromptById(promptID)
	if err != nil {
		p.logger.Error(fmt.Sprintf("%s: failed to retrieve prompt: %v", op, err))
		return Prompt{}, fmt.Errorf("%s: prompt retrieval failed: %w", op, err)
	}

	p.logger.Info(fmt.Sprintf(
		"%s: prompt retrieved successfully in %dms",
		op, time.Since(startTime).Milliseconds(),
	))

	return prompt, nil
}

func (p *PromptService) GetSystemPrompt(category string) (string, error) {
	const op = "PromptService.GetSystemPrompt"
	startTime := time.Now()

	p.logger.Info(fmt.Sprintf("%s: retrieving system prompt, category=%q", op, category))

	systemPrompt, err := p.GetSystemPromptByCategory(category)
	if err != nil {
		p.logger.Error(fmt.Sprintf("%s: failed to retrieve system prompt: %v", op, err))
		return "", fmt.Errorf("%s: system prompt retrieval failed: %w", op, err)
	}

	p.logger.Info(fmt.Sprintf(
		"%s: system prompt retrieved successfully in %dms",
		op, time.Since(startTime).Milliseconds(),
	))

	return systemPrompt.Value, nil
}

func (p *PromptService) BuildPrompt(template, category string, action *PromptActionRequest, useMarkdown bool) (string, error) {
	const op = "PromptService.BuildPrompt"
	startTime := time.Now()

	if action == nil {
		err := errors.New("action request is nil")
		p.logger.Error(fmt.Sprintf("%s: validation failed: %v", op, err))
		return "", fmt.Errorf("%s: %w", op, err)
	}

	p.logger.Info(fmt.Sprintf(
		"%s: building prompt, category=%q, action_id=%q",
		op, category, action.ID,
	))

	if err := p.validateActionRequest(action, category == PromptCategoryTranslation); err != nil {
		p.logger.Error(fmt.Sprintf("%s: action validation failed: %v", op, err))
		return "", fmt.Errorf("%s: %w", op, err)
	}

	replacements := map[string]string{
		TemplateParamText: action.InputText,
	}

	if category == PromptCategoryTranslation {
		replacements[TemplateParamInputLanguage] = action.InputLanguageID
		replacements[TemplateParamOutputLanguage] = action.OutputLanguageID
	}

	if strings.Contains(template, TemplateParamFormat) {
		if useMarkdown {
			replacements[TemplateParamFormat] = OutputFormatMarkdown
		} else {
			replacements[TemplateParamFormat] = OutputFormatPlainText
		}
	}

	var err error
	for token, value := range replacements {
		template, err = p.ReplaceTemplateParameter(token, value, template)
		if err != nil {
			p.logger.Error(fmt.Sprintf(
				"%s: failed to replace token %q: %v",
				op, token, err,
			))
			return "", fmt.Errorf("%s: template replacement failed: %w", op, err)
		}
	}

	p.logger.Info(fmt.Sprintf(
		"%s: prompt built successfully in %dms, final_length=%d",
		op, time.Since(startTime).Milliseconds(), len(template),
	))

	return template, nil
}

func (p *PromptService) validateActionRequest(req *PromptActionRequest, isTranslation bool) error {
	if strings.TrimSpace(req.ID) == "" {
		return errors.New("action ID must not be empty")
	}
	if strings.TrimSpace(req.InputText) == "" {
		return errors.New("input text must not be empty")
	}

	if isTranslation {
		if strings.TrimSpace(req.InputLanguageID) == "" {
			return errors.New("input language ID must not be empty for translation")
		}
		if strings.TrimSpace(req.OutputLanguageID) == "" {
			return errors.New("output language ID must not be empty for translation")
		}
	}

	return nil
}
