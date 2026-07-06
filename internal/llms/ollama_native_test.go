package llms

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"go_text/internal/apperr"
)

// --- Only Ollama has a native chat path (T63 fix is Ollama-scoped) ---

func TestNativeChatPath_OnlySetForOllama(t *testing.T) {
	t.Parallel()
	profiles := map[ProviderKind]ProviderProfile{
		KindOllama:   ollamaProfile,
		KindLMStudio: lmStudioProfile,
		KindLlamaCpp: llamaCppProfile,
		KindOpenAI:   openAIProfile,
		KindAzure:    azureProfile,
	}
	for kind, profile := range profiles {
		if kind == KindOllama {
			if profile.NativeChatPath != "api/chat" {
				t.Errorf("want ollama NativeChatPath=%q, got %q", "api/chat", profile.NativeChatPath)
			}
			continue
		}
		if profile.NativeChatPath != "" {
			t.Errorf("want %s NativeChatPath empty, got %q", kind, profile.NativeChatPath)
		}
	}
}

// --- Chat: ollama routes to native /api/chat, not /v1/chat/completions ---

func TestOllamaChat_HitsNativeEndpoint(t *testing.T) {
	t.Parallel()
	var gotPath string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotPath = r.URL.Path
		w.Header().Set("Content-Type", "application/json")
		w.Write(successNativeChatBody("hi there"))
	}))
	defer srv.Close()

	p := newTestProvider(t, srv.URL+"/", KindOllama, "")
	resp, err := p.Chat(context.Background(), ChatRequest{Model: "llama3", Messages: []Message{{Role: "user", Content: "hi"}}})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if gotPath != "/api/chat" {
		t.Errorf("want /api/chat, got %q", gotPath)
	}
	if resp.Content != "hi there" {
		t.Errorf("unexpected content: %q", resp.Content)
	}
}

// --- Chat: num_ctx and the output-token cap route into options, never to a top-level field ---

func TestOllamaChat_SendsNumCtxAndNumPredictInOptions(t *testing.T) {
	t.Parallel()
	var capturedBody map[string]any
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if err := json.NewDecoder(r.Body).Decode(&capturedBody); err != nil {
			t.Fatalf("decode request body: %v", err)
		}
		w.Header().Set("Content-Type", "application/json")
		w.Write(successNativeChatBody("ok"))
	}))
	defer srv.Close()

	numCtx := 4096
	maxTokens := 256
	p := newTestProvider(t, srv.URL+"/", KindOllama, "")
	_, err := p.Chat(context.Background(), ChatRequest{
		Model:     "llama3",
		Messages:  []Message{{Role: "user", Content: "hi"}},
		NumCtx:    &numCtx,
		MaxTokens: &maxTokens,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if _, ok := capturedBody["max_tokens"]; ok {
		t.Error("max_tokens must not be sent as a top-level field for the native endpoint")
	}
	if _, ok := capturedBody["max_completion_tokens"]; ok {
		t.Error("max_completion_tokens must not be sent as a top-level field for the native endpoint")
	}

	options, ok := capturedBody["options"].(map[string]any)
	if !ok {
		t.Fatalf("expected options object, got body: %v", capturedBody)
	}
	if options["num_ctx"] != float64(numCtx) {
		t.Errorf("want num_ctx=%d, got %v", numCtx, options["num_ctx"])
	}
	if options["num_predict"] != float64(maxTokens) {
		t.Errorf("want num_predict=%d, got %v", maxTokens, options["num_predict"])
	}
}

// --- Chat: UseLegacyMaxTokens has no effect on the native endpoint; num_predict is always used ---

func TestOllamaChat_IgnoresUseLegacyMaxTokensToggle(t *testing.T) {
	t.Parallel()
	var capturedBody map[string]any
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if err := json.NewDecoder(r.Body).Decode(&capturedBody); err != nil {
			t.Fatalf("decode request body: %v", err)
		}
		w.Header().Set("Content-Type", "application/json")
		w.Write(successNativeChatBody("ok"))
	}))
	defer srv.Close()

	maxTokens := 512
	p := newTestProvider(t, srv.URL+"/", KindOllama, "")
	_, err := p.Chat(context.Background(), ChatRequest{
		Model:              "llama3",
		Messages:           []Message{{Role: "user", Content: "hi"}},
		MaxTokens:          &maxTokens,
		UseLegacyMaxTokens: true,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if _, ok := capturedBody["max_tokens"]; ok {
		t.Error("max_tokens must not be sent as a top-level field, even with UseLegacyMaxTokens=true")
	}
	if _, ok := capturedBody["max_completion_tokens"]; ok {
		t.Error("max_completion_tokens must not be sent as a top-level field, even with UseLegacyMaxTokens=true")
	}

	options, ok := capturedBody["options"].(map[string]any)
	if !ok {
		t.Fatalf("expected options object, got body: %v", capturedBody)
	}
	if options["num_predict"] != float64(maxTokens) {
		t.Errorf("want num_predict=%d, got %v", maxTokens, options["num_predict"])
	}
}

// --- Chat: options omitted entirely when temperature/num_ctx/max_tokens are all unset ---

func TestOllamaChat_OmitsOptionsWhenNothingSet(t *testing.T) {
	t.Parallel()
	var capturedBody map[string]any
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if err := json.NewDecoder(r.Body).Decode(&capturedBody); err != nil {
			t.Fatalf("decode request body: %v", err)
		}
		w.Header().Set("Content-Type", "application/json")
		w.Write(successNativeChatBody("ok"))
	}))
	defer srv.Close()

	p := newTestProvider(t, srv.URL+"/", KindOllama, "")
	_, err := p.Chat(context.Background(), ChatRequest{Model: "llama3", Messages: []Message{{Role: "user", Content: "hi"}}})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if _, ok := capturedBody["options"]; ok {
		t.Errorf("want options omitted entirely, got: %v", capturedBody["options"])
	}
}

// --- Chat: native response usage fields map into TokenUsage ---

func TestOllamaChat_MapsUsageFromNativeResponse(t *testing.T) {
	t.Parallel()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		b, _ := json.Marshal(OllamaNativeChatResponse{
			Message:         CompletionRequestMessage{Role: "assistant", Content: "answer"},
			DoneReason:      "stop",
			PromptEvalCount: 10,
			EvalCount:       5,
		})
		w.Write(b)
	}))
	defer srv.Close()

	p := newTestProvider(t, srv.URL+"/", KindOllama, "")
	resp, err := p.Chat(context.Background(), ChatRequest{Model: "llama3", Messages: []Message{{Role: "user", Content: "hi"}}})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.FinishReason != "stop" {
		t.Errorf("want finish reason 'stop', got %q", resp.FinishReason)
	}
	if resp.Usage.PromptTokens != 10 || resp.Usage.CompletionTokens != 5 || resp.Usage.TotalTokens != 15 {
		t.Errorf("unexpected usage: %+v", resp.Usage)
	}
}

// --- Chat: empty content → CodeEmptyCompletion (native endpoint) ---

func TestOllamaChat_EmptyContent(t *testing.T) {
	t.Parallel()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write(successNativeChatBody(""))
	}))
	defer srv.Close()

	p := newTestProvider(t, srv.URL+"/", KindOllama, "")
	_, err := p.Chat(context.Background(), ChatRequest{Model: "llama3", Messages: []Message{{Role: "user", Content: "hi"}}})
	var ae *apperr.AppError
	if !errors.As(err, &ae) || ae.Code != apperr.CodeEmptyCompletion {
		t.Errorf("want CodeEmptyCompletion, got %v", err)
	}
}

// --- Chat: 404 from the native endpoint still maps via mapHTTPStatus ---

func TestOllamaChat_404_ModelNotFound(t *testing.T) {
	t.Parallel()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
	}))
	defer srv.Close()

	p := newTestProvider(t, srv.URL+"/", KindOllama, "")
	_, err := p.Chat(context.Background(), ChatRequest{Model: "missing-model", Messages: []Message{{Role: "user", Content: "hi"}}})
	var ae *apperr.AppError
	if !errors.As(err, &ae) || ae.Code != apperr.CodeModelNotFound {
		t.Errorf("want CodeModelNotFound, got %v", err)
	}
}
