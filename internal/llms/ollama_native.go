package llms

import (
	"context"
	"strings"
	"time"

	"go_text/internal/apperr"
)

// OllamaNativeChatRequest is the wire format for Ollama's native /api/chat endpoint.
// T63: Ollama's OpenAI-compatible /v1/chat/completions endpoint silently ignores
// options.num_ctx; the native endpoint honors it.
type OllamaNativeChatRequest struct {
	Model    string                     `json:"model"`
	Messages []CompletionRequestMessage `json:"messages"`
	Stream   bool                       `json:"stream"`
	Options  *Options                   `json:"options,omitempty"`
}

// OllamaNativeChatResponse is the non-streaming response shape from /api/chat.
type OllamaNativeChatResponse struct {
	Message         CompletionRequestMessage `json:"message"`
	DoneReason      string                   `json:"done_reason"`
	PromptEvalCount int                      `json:"prompt_eval_count"`
	EvalCount       int                      `json:"eval_count"`
}

// chatNative sends the request to Ollama's native chat endpoint instead of the
// OpenAI-compatible shim (see ProviderProfile.NativeChatPath).
func (p *OpenAICompatibleProvider) chatNative(ctx context.Context, req ChatRequest) (ChatResponse, error) {
	start := time.Now()
	url := p.buildNativeChatURL()
	headers := p.buildHeaders()

	messages := make([]CompletionRequestMessage, 0, len(req.Messages)+1)
	if req.System != "" {
		messages = append(messages, CompletionRequestMessage{Role: "system", Content: req.System})
	}
	for _, m := range req.Messages {
		messages = append(messages, CompletionRequestMessage{Role: m.Role, Content: m.Content})
	}

	wireReq := OllamaNativeChatRequest{
		Model:    req.Model,
		Messages: messages,
		Stream:   false,
		Options:  nativeOptions(req),
	}

	var wireResp OllamaNativeChatResponse
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

	content := wireResp.Message.Content
	if p.profile.Capabilities.StripThinkTags {
		content = thinkTagRe.ReplaceAllString(content, "")
		content = strings.TrimSpace(content)
	}
	if content == "" {
		return ChatResponse{}, apperr.EmptyCompletion(p.cfg.Config.Name, req.Model)
	}

	return ChatResponse{
		Content:      content,
		FinishReason: wireResp.DoneReason,
		Usage: TokenUsage{
			PromptTokens:     wireResp.PromptEvalCount,
			CompletionTokens: wireResp.EvalCount,
			TotalTokens:      wireResp.PromptEvalCount + wireResp.EvalCount,
		},
		Duration: time.Since(start),
	}, nil
}

// nativeOptions builds the Ollama "options" bag from the provider-agnostic ChatRequest.
// Returns nil when temperature, num_ctx, and the output-token cap are all unset, so the
// field is omitted entirely (matches today's toggle-off behavior for the other providers).
func nativeOptions(req ChatRequest) *Options {
	if req.Temperature == nil && req.NumCtx == nil && req.MaxTokens == nil {
		return nil
	}
	return &Options{
		Temperature: req.Temperature,
		NumCtx:      req.NumCtx,
		NumPredict:  req.MaxTokens,
	}
}
