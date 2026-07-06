package llms

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"
	"time"

	"go_text/internal/apperr"
	"go_text/internal/settings"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/wailsapp/wails/v2/pkg/logger"
	"resty.dev/v3"
)

// ── T86 retry-loop tests: internal/llms/service.go chatWithRetry / retryBackoffDelay ──

// newRetryTestLLMService builds an *LLMService with a specific MaxRetries budget, mirroring
// newTestLLMService but allowing the caller to control InferenceBaseConfig.MaxRetries.
func newRetryTestLLMService(t *testing.T, maxRetries int) *LLMService {
	t.Helper()
	client := resty.New()
	factory := NewProviderFactory(client)
	stub := &stubSettingsService{inferCfg: &settings.InferenceBaseConfig{Timeout: 30, MaxRetries: maxRetries}}
	svc := NewLLMApiService(logger.NewDefaultLogger(), factory, stub)
	return svc.(*LLMService)
}

// successCompletionBody returns a minimal, valid JSON completion body with the given content.
func successCompletionBody(content string) string {
	return `{"id":"test-id","model":"model-1","choices":[{"index":0,"message":{"role":"assistant","content":"` +
		content + `"},"finish_reason":"stop"}]}`
}

func retryChatRequest() *ChatCompletionRequest {
	return &ChatCompletionRequest{
		Model:    "model-1",
		Messages: []CompletionRequestMessage{{Role: "user", Content: "hello"}},
		Stream:   false,
	}
}

func TestLLMService_ChatWithRetry_TransientFailureThenSucceeds(t *testing.T) {
	// Overrides the package-level retryBackoffDelay var — cannot run in parallel with
	// other tests doing the same.
	orig := retryBackoffDelay
	retryBackoffDelay = func(int, *apperr.AppError) time.Duration { return time.Millisecond }
	t.Cleanup(func() { retryBackoffDelay = orig })

	const failuresBeforeSuccess = 2
	var requestCount atomic.Int32

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		n := requestCount.Add(1)
		w.Header().Set("Content-Type", "application/json")
		if n <= failuresBeforeSuccess {
			http.Error(w, "server error", http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(successCompletionBody("recovered after retries")))
	}))
	defer srv.Close()

	svc := newRetryTestLLMService(t, failuresBeforeSuccess)
	provider := openAIProvider(srv.URL)

	got, err := svc.GetCompletionResponseForProvider(context.Background(), provider, retryChatRequest())

	require.NoError(t, err, "should succeed once the server recovers within the retry budget")
	assert.Equal(t, "recovered after retries", got)
	assert.EqualValues(t, failuresBeforeSuccess+1, requestCount.Load(),
		"expected exactly one request per failed attempt plus the final successful attempt")
}

func TestLLMService_ChatWithRetry_MaxRetriesZero_NeverRetries(t *testing.T) {
	t.Parallel()
	var requestCount atomic.Int32

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		requestCount.Add(1)
		http.Error(w, "server error", http.StatusInternalServerError)
	}))
	defer srv.Close()

	svc := newRetryTestLLMService(t, 0)
	provider := openAIProvider(srv.URL)

	_, err := svc.GetCompletionResponseForProvider(context.Background(), provider, retryChatRequest())

	require.Error(t, err, "want an error since the server always fails")
	assert.EqualValues(t, 1, requestCount.Load(), "MaxRetries=0 must result in exactly one attempt")

	var ae *apperr.AppError
	require.True(t, errors.As(err, &ae), "error should be an *apperr.AppError")
	assert.True(t, ae.Retryable, "the underlying failure is retryable in principle even though the budget was 0")
	assert.Equal(t, apperr.CodeUpstream, ae.Code)
}

func TestLLMService_ChatWithRetry_RetriesExhausted_ReturnsFinalError(t *testing.T) {
	orig := retryBackoffDelay
	retryBackoffDelay = func(int, *apperr.AppError) time.Duration { return time.Millisecond }
	t.Cleanup(func() { retryBackoffDelay = orig })

	const maxRetries = 2
	var requestCount atomic.Int32

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		requestCount.Add(1)
		http.Error(w, "server error", http.StatusInternalServerError)
	}))
	defer srv.Close()

	svc := newRetryTestLLMService(t, maxRetries)
	provider := openAIProvider(srv.URL)

	_, err := svc.GetCompletionResponseForProvider(context.Background(), provider, retryChatRequest())

	require.Error(t, err, "want the final error surfaced once retries are exhausted")
	assert.EqualValues(t, maxRetries+1, requestCount.Load(),
		"expected 1 initial attempt plus maxRetries retries")

	var ae *apperr.AppError
	require.True(t, errors.As(err, &ae), "error should be an *apperr.AppError")
	assert.Equal(t, apperr.CodeUpstream, ae.Code, "final error must not be swallowed or replaced")
}

func TestLLMService_ChatWithRetry_NonRetryableError_NeverRetries(t *testing.T) {
	t.Parallel()
	var requestCount atomic.Int32

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		requestCount.Add(1)
		http.Error(w, "unauthorized", http.StatusUnauthorized)
	}))
	defer srv.Close()

	// MaxRetries is deliberately non-zero to prove the error TYPE (non-retryable),
	// not the retry budget, is what stops further attempts.
	svc := newRetryTestLLMService(t, 3)
	provider := openAIProvider(srv.URL)

	_, err := svc.GetCompletionResponseForProvider(context.Background(), provider, retryChatRequest())

	require.Error(t, err, "want an error since the server always rejects auth")
	assert.EqualValues(t, 1, requestCount.Load(), "a non-retryable error must never be retried")

	var ae *apperr.AppError
	require.True(t, errors.As(err, &ae), "error should be an *apperr.AppError")
	assert.False(t, ae.Retryable, "401 must classify as non-retryable")
	assert.Equal(t, apperr.CodeAuth, ae.Code)
}

func TestLLMService_ChatWithRetry_CancellationDuringBackoff_StopsImmediately(t *testing.T) {
	// Overrides the package-level retryBackoffDelay var to guarantee the wait is still
	// pending when the context deadline fires — cannot run in parallel with other tests
	// mutating the same var.
	orig := retryBackoffDelay
	retryBackoffDelay = func(int, *apperr.AppError) time.Duration { return time.Hour }
	t.Cleanup(func() { retryBackoffDelay = orig })

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		http.Error(w, "server error", http.StatusInternalServerError)
	}))
	defer srv.Close()

	svc := newRetryTestLLMService(t, 3)
	provider := openAIProvider(srv.URL)

	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Millisecond)
	defer cancel()

	start := time.Now()
	_, err := svc.GetCompletionResponseForProvider(ctx, provider, retryChatRequest())
	elapsed := time.Since(start)

	require.Error(t, err, "want an error once the context is cancelled")
	assert.Less(t, elapsed, 2*time.Second,
		"cancellation must abort the pending backoff wait promptly, not sleep out the 1h override")

	var ae *apperr.AppError
	require.True(t, errors.As(err, &ae), "error should be an *apperr.AppError")
	assert.Equal(t, apperr.CodeCancelled, ae.Code, "context cancellation must surface CodeCancelled")
}

func TestDefaultRetryBackoffDelay(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name    string
		attempt int
		ae      *apperr.AppError
		want    time.Duration
	}{
		{
			name:    "attempt_0_nil_details_returns_base_delay",
			attempt: 0,
			ae:      &apperr.AppError{},
			want:    500 * time.Millisecond,
		},
		{
			name:    "attempt_1_nil_details_doubles_delay",
			attempt: 1,
			ae:      &apperr.AppError{},
			want:    1 * time.Second,
		},
		{
			name:    "attempt_2_nil_details_quadruples_delay",
			attempt: 2,
			ae:      &apperr.AppError{},
			want:    2 * time.Second,
		},
		{
			name:    "high_attempt_number_is_capped",
			attempt: 10,
			ae:      &apperr.AppError{},
			want:    8 * time.Second,
		},
		{
			name:    "nil_app_error_falls_back_to_exponential",
			attempt: 0,
			ae:      nil,
			want:    500 * time.Millisecond,
		},
		{
			name:    "retry_after_hint_overrides_exponential_value",
			attempt: 0,
			ae:      &apperr.AppError{Details: map[string]string{"retryAfter": "5"}},
			want:    5 * time.Second,
		},
		{
			name:    "retry_after_hint_overrides_exponential_value_even_at_high_attempt",
			attempt: 10,
			ae:      &apperr.AppError{Details: map[string]string{"retryAfter": "5"}},
			want:    5 * time.Second,
		},
		{
			name:    "retry_after_zero_falls_back_to_exponential",
			attempt: 1,
			ae:      &apperr.AppError{Details: map[string]string{"retryAfter": "0"}},
			want:    1 * time.Second,
		},
		{
			name:    "retry_after_non_numeric_falls_back_to_exponential",
			attempt: 1,
			ae:      &apperr.AppError{Details: map[string]string{"retryAfter": "notanumber"}},
			want:    1 * time.Second,
		},
		{
			name:    "retry_after_absent_key_falls_back_to_exponential",
			attempt: 1,
			ae:      &apperr.AppError{Details: map[string]string{}},
			want:    1 * time.Second,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			got := defaultRetryBackoffDelay(tt.attempt, tt.ae)
			assert.Equal(t, tt.want, got)
		})
	}
}
