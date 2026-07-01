package llms

import (
	"context"
	"fmt"
	"regexp"
	"strings"
	"time"

	"go_text/internal/apperr"
	"resty.dev/v3"
)

// thinkTagRe matches <think>…</think> blocks including whitespace, case-insensitive.
var thinkTagRe = regexp.MustCompile(`(?is)<think>.*?</think>`)

// OpenAICompatibleProvider implements Provider for all five provider kinds
// by parameterising URL templates, auth schemes, and discovery parsers via ProviderProfile.
type OpenAICompatibleProvider struct {
	cfg     ResolvedProviderConfig
	profile ProviderProfile
	client  *resty.Client
}

func (p *OpenAICompatibleProvider) Kind() ProviderKind                 { return p.profile.Kind }
func (p *OpenAICompatibleProvider) Capabilities() ProviderCapabilities { return p.profile.Capabilities }

func (p *OpenAICompatibleProvider) buildBaseURL() string {
	base := p.cfg.Config.BaseURL
	if base == "" {
		base = p.profile.DefaultBaseURL
	}
	return strings.TrimSuffix(base, "/") + "/"
}

func (p *OpenAICompatibleProvider) buildCompletionURL() string {
	base := p.buildBaseURL()
	tmpl := p.cfg.Config.CompletionPath
	if tmpl == "" {
		tmpl = p.profile.CompletionPathTemplate
	}
	tmpl = strings.ReplaceAll(tmpl, "{deployment}", p.cfg.Config.SelectedModel)
	return base + strings.TrimPrefix(tmpl, "/")
}

func (p *OpenAICompatibleProvider) buildNativeChatURL() string {
	return p.buildBaseURL() + strings.TrimPrefix(p.profile.NativeChatPath, "/")
}

func (p *OpenAICompatibleProvider) buildModelsURL() string {
	base := p.buildBaseURL()
	tmpl := p.cfg.Config.ModelsPath
	if tmpl == "" {
		tmpl = p.profile.ModelsPathTemplate
	}
	url := base + strings.TrimPrefix(tmpl, "/")
	if p.cfg.Config.APIVersion != "" {
		url += "?api-version=" + p.cfg.Config.APIVersion
	}
	return url
}

func (p *OpenAICompatibleProvider) buildHeaders() map[string]string {
	headers := make(map[string]string)

	scheme := AuthScheme(p.cfg.Config.AuthScheme)
	if scheme == "" {
		scheme = p.profile.DefaultAuthScheme
	}

	switch scheme {
	case AuthBearer:
		if p.cfg.Secret != "" {
			headers["Authorization"] = "Bearer " + p.cfg.Secret
		}
	case AuthAPIKey:
		if p.cfg.Secret != "" {
			headers["Api-Key"] = p.cfg.Secret
		}
	}

	for k, v := range p.cfg.Config.Headers {
		if k != "" && v != "" {
			headers[k] = v
		}
	}
	return headers
}

func (p *OpenAICompatibleProvider) Chat(ctx context.Context, req ChatRequest) (ChatResponse, error) {
	if p.profile.NativeChatPath != "" {
		return p.chatNative(ctx, req)
	}

	start := time.Now()
	url := p.buildCompletionURL()
	headers := p.buildHeaders()

	messages := make([]CompletionRequestMessage, 0, len(req.Messages)+1)
	if req.System != "" {
		messages = append(messages, CompletionRequestMessage{Role: "system", Content: req.System})
	}
	for _, m := range req.Messages {
		messages = append(messages, CompletionRequestMessage{Role: m.Role, Content: m.Content})
	}

	wireReq := ChatCompletionRequest{
		Model:    req.Model,
		Messages: messages,
		Stream:   false,
		N:        1,
	}
	if req.Temperature != nil {
		wireReq.Temperature = req.Temperature
	}
	if req.MaxTokens != nil {
		if req.UseLegacyMaxTokens {
			wireReq.MaxTokens = req.MaxTokens
		} else {
			wireReq.MaxCompletionTokens = req.MaxTokens
		}
	}
	var wireResp ChatCompletionResponse
	resp, err := p.client.R().
		SetContext(ctx).
		SetHeaders(headers).
		SetBody(wireReq).
		SetResult(&wireResp).
		SetRetryCount(0). // T12 owns the retry loop
		Post(url)

	if err != nil {
		return ChatResponse{}, mapTransportError(p.cfg.Config.Name, p.buildBaseURL(), err)
	}
	if resp.IsError() {
		return ChatResponse{}, mapHTTPStatus(p.cfg.Config.Name, req.Model, resp)
	}

	if len(wireResp.Choices) == 0 {
		return ChatResponse{}, apperr.EmptyCompletion(p.cfg.Config.Name, req.Model)
	}

	content := wireResp.Choices[0].Message.Content
	if p.profile.Capabilities.StripThinkTags {
		content = thinkTagRe.ReplaceAllString(content, "")
		content = strings.TrimSpace(content)
	}
	if content == "" {
		return ChatResponse{}, apperr.EmptyCompletion(p.cfg.Config.Name, req.Model)
	}

	return ChatResponse{
		Content:      content,
		FinishReason: wireResp.Choices[0].FinishReason,
		Usage: TokenUsage{
			PromptTokens:     wireResp.Usage.PromptTokens,
			CompletionTokens: wireResp.Usage.CompletionTokens,
			TotalTokens:      wireResp.Usage.TotalTokens,
		},
		Duration: time.Since(start),
	}, nil
}

func (p *OpenAICompatibleProvider) ListModels(ctx context.Context) ([]apperr.ModelInfo, error) {
	url := p.buildModelsURL()
	headers := p.buildHeaders()

	resp, err := p.client.R().
		SetContext(ctx).
		SetHeaders(headers).
		SetRetryCount(0).
		Get(url)

	if err != nil {
		return nil, mapTransportError(p.cfg.Config.Name, p.buildBaseURL(), err)
	}
	if resp.IsError() {
		return nil, mapHTTPStatus(p.cfg.Config.Name, "", resp)
	}

	models, err := p.profile.DiscoveryStrategy(resp.Bytes())
	if err != nil {
		return nil, apperr.Internal(fmt.Errorf("parse discovery response: %w", err))
	}
	return models, nil
}
