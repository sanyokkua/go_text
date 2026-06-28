package llms

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"go_text/internal/apperr"
	"go_text/internal/settings"
	"resty.dev/v3"
)

func newTestProvider(t *testing.T, baseURL string, kind ProviderKind, secret string) *OpenAICompatibleProvider {
	t.Helper()
	profiles := map[ProviderKind]ProviderProfile{
		KindOllama:   ollamaProfile,
		KindLMStudio: lmStudioProfile,
		KindOpenAI:   openAIProfile,
		KindAzure:    azureProfile,
	}
	profile := profiles[kind]

	client := resty.New()
	return &OpenAICompatibleProvider{
		cfg: ResolvedProviderConfig{
			Config: settings.ProviderConfig{
				Name:    "test",
				Kind:    string(kind),
				BaseURL: baseURL,
			},
			Secret: secret,
		},
		profile: profile,
		client:  client,
	}
}

func successChatBody(content string) []byte {
	resp := ChatCompletionResponse{
		Choices: []Choice{{Message: CompletionRequestMessage{Role: "assistant", Content: content}}},
	}
	b, _ := json.Marshal(resp)
	return b
}

// --- Chat: 200 success ---

func TestOpenAICompatibleProvider_Chat_Success(t *testing.T) {
	t.Parallel()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write(successChatBody("Hello from the model"))
	}))
	defer srv.Close()

	p := newTestProvider(t, srv.URL+"/", KindOpenAI, "")
	resp, err := p.Chat(context.Background(), ChatRequest{Model: "gpt-4", Messages: []Message{{Role: "user", Content: "Hi"}}})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.Content != "Hello from the model" {
		t.Errorf("unexpected content: %q", resp.Content)
	}
}

// --- Chat: think-tag stripping for ollama ---

func TestOpenAICompatibleProvider_Chat_StripsThinkTags(t *testing.T) {
	t.Parallel()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write(successChatBody("<think>reasoning</think>Final answer"))
	}))
	defer srv.Close()

	p := newTestProvider(t, srv.URL+"/", KindOllama, "")
	resp, err := p.Chat(context.Background(), ChatRequest{Model: "llama3", Messages: []Message{{Role: "user", Content: "q"}}})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.Content != "Final answer" {
		t.Errorf("think tags not stripped, got: %q", resp.Content)
	}
}

func TestOpenAICompatibleProvider_Chat_DoesNotStripThinkTags_OpenAI(t *testing.T) {
	t.Parallel()
	raw := "<think>reasoning</think>Answer"
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write(successChatBody(raw))
	}))
	defer srv.Close()

	p := newTestProvider(t, srv.URL+"/", KindOpenAI, "")
	resp, err := p.Chat(context.Background(), ChatRequest{Model: "gpt-4", Messages: []Message{{Role: "user", Content: "q"}}})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.Content != raw {
		t.Errorf("openai should NOT strip think tags, got: %q", resp.Content)
	}
}

// --- Chat: 401 → CodeAuth ---

func TestOpenAICompatibleProvider_Chat_401_Auth(t *testing.T) {
	t.Parallel()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
	}))
	defer srv.Close()

	p := newTestProvider(t, srv.URL+"/", KindOpenAI, "bad-key")
	_, err := p.Chat(context.Background(), ChatRequest{Model: "gpt-4", Messages: []Message{{Role: "user", Content: "q"}}})
	var ae *apperr.AppError
	if !errors.As(err, &ae) {
		t.Fatalf("want *apperr.AppError, got %T: %v", err, err)
	}
	if ae.Code != apperr.CodeAuth {
		t.Errorf("want CodeAuth, got %q", ae.Code)
	}
}

// --- Chat: 403 → CodeAuth ---

func TestOpenAICompatibleProvider_Chat_403_Auth(t *testing.T) {
	t.Parallel()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusForbidden)
	}))
	defer srv.Close()

	p := newTestProvider(t, srv.URL+"/", KindOpenAI, "")
	_, err := p.Chat(context.Background(), ChatRequest{Model: "gpt-4", Messages: []Message{{Role: "user", Content: "q"}}})
	var ae *apperr.AppError
	if !errors.As(err, &ae) || ae.Code != apperr.CodeAuth {
		t.Errorf("want CodeAuth, got %v", err)
	}
}

// --- Chat: 404 → CodeModelNotFound ---

func TestOpenAICompatibleProvider_Chat_404_ModelNotFound(t *testing.T) {
	t.Parallel()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
	}))
	defer srv.Close()

	p := newTestProvider(t, srv.URL+"/", KindOpenAI, "")
	_, err := p.Chat(context.Background(), ChatRequest{Model: "missing-model", Messages: []Message{{Role: "user", Content: "q"}}})
	var ae *apperr.AppError
	if !errors.As(err, &ae) || ae.Code != apperr.CodeModelNotFound {
		t.Errorf("want CodeModelNotFound, got %v", err)
	}
}

// --- Chat: 429 → CodeRateLimited (with retryAfter) ---

func TestOpenAICompatibleProvider_Chat_429_RateLimited(t *testing.T) {
	t.Parallel()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Retry-After", "30")
		w.WriteHeader(http.StatusTooManyRequests)
	}))
	defer srv.Close()

	p := newTestProvider(t, srv.URL+"/", KindOpenAI, "")
	_, err := p.Chat(context.Background(), ChatRequest{Model: "gpt-4", Messages: []Message{{Role: "user", Content: "q"}}})
	var ae *apperr.AppError
	if !errors.As(err, &ae) || ae.Code != apperr.CodeRateLimited {
		t.Errorf("want CodeRateLimited, got %v", err)
	}
	if ae.Details["retryAfter"] != "30" {
		t.Errorf("want retryAfter=30, got %q", ae.Details["retryAfter"])
	}
	if !ae.Retryable {
		t.Error("want Retryable=true for rate limited")
	}
}

// --- Chat: 500 → CodeUpstream ---

func TestOpenAICompatibleProvider_Chat_500_Upstream(t *testing.T) {
	t.Parallel()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer srv.Close()

	p := newTestProvider(t, srv.URL+"/", KindOpenAI, "")
	_, err := p.Chat(context.Background(), ChatRequest{Model: "gpt-4", Messages: []Message{{Role: "user", Content: "q"}}})
	var ae *apperr.AppError
	if !errors.As(err, &ae) || ae.Code != apperr.CodeUpstream {
		t.Errorf("want CodeUpstream, got %v", err)
	}
}

// --- Chat: 200 empty content → CodeEmptyCompletion ---

func TestOpenAICompatibleProvider_Chat_EmptyContent(t *testing.T) {
	t.Parallel()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write(successChatBody(""))
	}))
	defer srv.Close()

	p := newTestProvider(t, srv.URL+"/", KindOpenAI, "")
	_, err := p.Chat(context.Background(), ChatRequest{Model: "gpt-4", Messages: []Message{{Role: "user", Content: "q"}}})
	var ae *apperr.AppError
	if !errors.As(err, &ae) || ae.Code != apperr.CodeEmptyCompletion {
		t.Errorf("want CodeEmptyCompletion, got %v", err)
	}
}

// --- Chat: timeout → CodeTimeout ---

func TestOpenAICompatibleProvider_Chat_Timeout(t *testing.T) {
	t.Parallel()
	// unblock is closed after the provider call returns so the handler goroutine
	// can exit cleanly before srv.Close() waits for active connections.
	unblock := make(chan struct{})
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Block until either the client's deadline fires or the test unblocks us.
		select {
		case <-r.Context().Done():
		case <-unblock:
		}
	}))

	p := newTestProvider(t, srv.URL+"/", KindOpenAI, "")
	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Millisecond)
	defer cancel()

	_, err := p.Chat(ctx, ChatRequest{Model: "gpt-4", Messages: []Message{{Role: "user", Content: "q"}}})
	// Signal the handler to exit, then close the server.
	close(unblock)
	srv.Close()

	var ae *apperr.AppError
	if !errors.As(err, &ae) || ae.Code != apperr.CodeTimeout {
		t.Errorf("want CodeTimeout, got %v", err)
	}
}

// --- Chat: no choices → CodeEmptyCompletion ---

func TestOpenAICompatibleProvider_Chat_NoChoices(t *testing.T) {
	t.Parallel()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		b, _ := json.Marshal(ChatCompletionResponse{Choices: []Choice{}})
		w.Write(b)
	}))
	defer srv.Close()

	p := newTestProvider(t, srv.URL+"/", KindOpenAI, "")
	_, err := p.Chat(context.Background(), ChatRequest{Model: "gpt-4", Messages: []Message{{Role: "user", Content: "q"}}})
	var ae *apperr.AppError
	if !errors.As(err, &ae) || ae.Code != apperr.CodeEmptyCompletion {
		t.Errorf("want CodeEmptyCompletion, got %v", err)
	}
}

// --- ListModels: ollama tags ---

func TestOpenAICompatibleProvider_ListModels_OllamaV1Models(t *testing.T) {
	t.Parallel()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v1/models" {
			t.Errorf("unexpected path: %s", r.URL.Path)
		}
		w.Header().Set("Content-Type", "application/json")
		b, _ := json.Marshal(ModelsListResponse{
			Data: []ModelsResponse{{ID: "llama3:8b"}, {ID: "mistral:7b"}},
		})
		w.Write(b)
	}))
	defer srv.Close()

	p := newTestProvider(t, srv.URL+"/", KindOllama, "")
	models, err := p.ListModels(context.Background())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(models) != 2 || models[0].ID != "llama3:8b" {
		t.Errorf("unexpected models: %v", models)
	}
}

// --- ListModels: standard {data:[]} ---

func TestOpenAICompatibleProvider_ListModels_Standard(t *testing.T) {
	t.Parallel()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		b, _ := json.Marshal(ModelsListResponse{
			Data: []ModelsResponse{{ID: "gpt-4o"}, {ID: "gpt-4-turbo"}},
		})
		w.Write(b)
	}))
	defer srv.Close()

	p := newTestProvider(t, srv.URL+"/", KindOpenAI, "")
	models, err := p.ListModels(context.Background())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(models) != 2 {
		t.Errorf("want 2 models, got %d", len(models))
	}
}

// --- ListModels: 401 → CodeAuth ---

func TestOpenAICompatibleProvider_ListModels_401_Auth(t *testing.T) {
	t.Parallel()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
	}))
	defer srv.Close()

	p := newTestProvider(t, srv.URL+"/", KindOpenAI, "bad")
	_, err := p.ListModels(context.Background())
	var ae *apperr.AppError
	if !errors.As(err, &ae) || ae.Code != apperr.CodeAuth {
		t.Errorf("want CodeAuth, got %v", err)
	}
}
