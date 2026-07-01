package llms

import (
	"context"
	"errors"
	"net"
	"net/http"
	"net/http/httptest"
	"testing"

	"go_text/internal/apperr"
)

// fakeNetError satisfies net.Error for timeout testing.
type fakeNetError struct{ timeout bool }

func (e *fakeNetError) Error() string   { return "fake net error" }
func (e *fakeNetError) Timeout() bool   { return e.timeout }
func (e *fakeNetError) Temporary() bool { return false }

func TestMapTransportError_ContextDeadline(t *testing.T) {
	t.Parallel()
	ae := mapTransportError("my-provider", "http://localhost:11434/",context.DeadlineExceeded)
	if ae.Code != apperr.CodeTimeout {
		t.Errorf("want CodeTimeout, got %q", ae.Code)
	}
}

func TestMapTransportError_NetTimeout(t *testing.T) {
	t.Parallel()
	err := &fakeNetError{timeout: true}
	ae := mapTransportError("my-provider", "http://localhost:11434/",err)
	if ae.Code != apperr.CodeTimeout {
		t.Errorf("want CodeTimeout, got %q", ae.Code)
	}
}

func TestMapTransportError_DialError(t *testing.T) {
	t.Parallel()
	err := &net.OpError{Op: "dial", Net: "tcp", Err: errors.New("connection refused")}
	ae := mapTransportError("my-provider", "http://localhost:11434/",err)
	if ae.Code != apperr.CodeProviderUnreachable {
		t.Errorf("want CodeProviderUnreachable, got %q", ae.Code)
	}
}

func TestParseRetryAfter_Valid(t *testing.T) {
	t.Parallel()
	if n := parseRetryAfter("42"); n != 42 {
		t.Errorf("want 42, got %d", n)
	}
}

func TestParseRetryAfter_Empty(t *testing.T) {
	t.Parallel()
	if n := parseRetryAfter(""); n != 0 {
		t.Errorf("want 0, got %d", n)
	}
}

func TestParseRetryAfter_NonNumeric(t *testing.T) {
	t.Parallel()
	if n := parseRetryAfter("Thu, 01 Jan 2026 00:00:00 GMT"); n != 0 {
		t.Errorf("want 0 for date string, got %d", n)
	}
}

// lmStudioContextExceededBody is the HTTP-400 body quoted in this task's original discovery notes.
const lmStudioContextExceededBody = "request (8087 tokens) exceeds the available context size (2048 tokens), try increasing it"

// lmStudioContextExceededBodyNCtx is a second, differently-worded HTTP-400 body captured live
// against a real LM Studio instance (llama.cpp backend, qwen2.5-7b-instruct loaded with -c 2048)
// during this task's own verification — proof that provider wording varies even from the same
// backend, which is why isContextExceededBody matches a substring set rather than one exact string.
const lmStudioContextExceededBodyNCtx = `{"error":"The number of tokens to keep from the initial prompt is greater than the context length (n_keep: 8530>= n_ctx: 2048). Try to load the model with a larger context length, or provide a shorter input."}`

func TestIsContextExceededBody(t *testing.T) {
	t.Parallel()
	tests := []struct {
		name string
		body string
		want bool
	}{
		{
			name: "lm_studio_context_exceeded",
			body: lmStudioContextExceededBody,
			want: true,
		},
		{
			name: "lm_studio_context_exceeded_n_ctx_wording",
			body: lmStudioContextExceededBodyNCtx,
			want: true,
		},
		{
			name: "openai_style_context_length_exceeded",
			body: `{"error":{"message":"This model's maximum context length is 8192 tokens","code":"context_length_exceeded"}}`,
			want: true,
		},
		{
			name: "unrelated_validation_error",
			body: `{"error":"invalid request: missing field 'model'"}`,
			want: false,
		},
		{
			name: "too_long_without_context_word",
			body: "password too long",
			want: false,
		},
		{
			name: "empty_body",
			body: "",
			want: false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			if got := isContextExceededBody(tt.body); got != tt.want {
				t.Errorf("isContextExceededBody(%q) = %v, want %v", tt.body, got, tt.want)
			}
		})
	}
}

func TestExtractContextLimit(t *testing.T) {
	t.Parallel()
	tests := []struct {
		name string
		body string
		want int
	}{
		{
			name: "lm_studio_context_size",
			body: lmStudioContextExceededBody,
			want: 2048,
		},
		{
			name: "lm_studio_n_ctx_wording_extracts_actual_limit_not_n_keep",
			body: lmStudioContextExceededBodyNCtx,
			want: 2048,
		},
		{
			name: "openai_style_context_length",
			body: "This model's maximum context length is 8192 tokens, however you requested 10000 tokens",
			want: 8192,
		},
		{
			name: "no_digits",
			body: "context_length_exceeded",
			want: 0,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			if got := extractContextLimit(tt.body); got != tt.want {
				t.Errorf("extractContextLimit(%q) = %d, want %d", tt.body, got, tt.want)
			}
		})
	}
}

// --- mapHTTPStatus end-to-end via the real provider HTTP path ---

func TestOpenAICompatibleChat_400_ContextExceeded(t *testing.T) {
	t.Parallel()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(lmStudioContextExceededBody))
	}))
	defer srv.Close()

	p := newTestProvider(t, srv.URL+"/", KindLMStudio, "")
	_, err := p.Chat(context.Background(), ChatRequest{Model: "qwen2.5-7b-instruct", Messages: []Message{{Role: "user", Content: "hi"}}})

	var ae *apperr.AppError
	if !errors.As(err, &ae) || ae.Code != apperr.CodeContextWindow {
		t.Fatalf("want CodeContextWindow, got %v", err)
	}
	if ae.Details["limit"] != "2048" {
		t.Errorf("want limit detail 2048, got %q", ae.Details["limit"])
	}
	if ae.Details["model"] != "qwen2.5-7b-instruct" {
		t.Errorf("want model detail qwen2.5-7b-instruct, got %q", ae.Details["model"])
	}
}

// TestOpenAICompatibleChat_400_ContextExceeded_NCtxWording mirrors the body actually captured
// live from LM Studio during this task's own verification (see lmStudioContextExceededBodyNCtx),
// which differs from the wording quoted in the task's original discovery notes.
func TestOpenAICompatibleChat_400_ContextExceeded_NCtxWording(t *testing.T) {
	t.Parallel()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(lmStudioContextExceededBodyNCtx))
	}))
	defer srv.Close()

	p := newTestProvider(t, srv.URL+"/", KindLMStudio, "")
	_, err := p.Chat(context.Background(), ChatRequest{Model: "qwen2.5-7b-instruct", Messages: []Message{{Role: "user", Content: "hi"}}})

	var ae *apperr.AppError
	if !errors.As(err, &ae) || ae.Code != apperr.CodeContextWindow {
		t.Fatalf("want CodeContextWindow, got %v", err)
	}
	if ae.Details["limit"] != "2048" {
		t.Errorf("want limit detail 2048 (the actual n_ctx, not n_keep), got %q", ae.Details["limit"])
	}
}

func TestOpenAICompatibleChat_400_GenericUpstreamUnchanged(t *testing.T) {
	t.Parallel()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(`{"error":"invalid request: missing field 'model'"}`))
	}))
	defer srv.Close()

	p := newTestProvider(t, srv.URL+"/", KindLMStudio, "")
	_, err := p.Chat(context.Background(), ChatRequest{Model: "qwen2.5-7b-instruct", Messages: []Message{{Role: "user", Content: "hi"}}})

	var ae *apperr.AppError
	if !errors.As(err, &ae) || ae.Code != apperr.CodeUpstream {
		t.Fatalf("want CodeUpstream unchanged for a generic 400, got %v", err)
	}
}

func TestOllamaNativeChat_400_ContextExceeded(t *testing.T) {
	t.Parallel()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(lmStudioContextExceededBody))
	}))
	defer srv.Close()

	p := newTestProvider(t, srv.URL+"/", KindOllama, "")
	_, err := p.Chat(context.Background(), ChatRequest{Model: "llama3", Messages: []Message{{Role: "user", Content: "hi"}}})

	var ae *apperr.AppError
	if !errors.As(err, &ae) || ae.Code != apperr.CodeContextWindow {
		t.Fatalf("want CodeContextWindow, got %v", err)
	}
}
