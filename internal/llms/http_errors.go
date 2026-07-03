package llms

import (
	"context"
	"errors"
	"fmt"
	"net"
	"regexp"
	"strconv"
	"strings"

	"go_text/internal/apperr"
	"resty.dev/v3"
)

// mapTransportError converts a resty transport-level error (no HTTP response) to an apperr.
// Call only when resty.Execute returns a non-nil error.
//
// The "0" passed to apperr.Timeout below is a documented placeholder, not a bug: this function
// has no access to the caller's configured timeout duration, only the transport error. Callers
// that own the configured timeout value fix it up via apperr.RewriteTimeoutSeconds before the
// error is surfaced to the user.
func mapTransportError(provider, baseURL string, err error) *apperr.AppError {
	if errors.Is(err, context.Canceled) {
		return apperr.CancelledRequest(err)
	}
	if errors.Is(err, context.DeadlineExceeded) {
		return apperr.Timeout(provider, 0, err)
	}
	var netErr net.Error
	if errors.As(err, &netErr) && netErr.Timeout() {
		return apperr.Timeout(provider, 0, err)
	}
	return apperr.Unreachable(provider, baseURL, err)
}

// mapHTTPStatus converts a non-2xx HTTP status to an apperr.
// Call only when resp.IsError() is true.
func mapHTTPStatus(provider, model string, resp *resty.Response) *apperr.AppError {
	code := resp.StatusCode()
	status := fmt.Sprintf("%d", code)

	switch code {
	case 401, 403:
		return apperr.Auth(provider, status, "", nil)
	case 404:
		return apperr.ModelNotFound(provider, model, nil)
	case 429:
		retryAfter := parseRetryAfter(resp.Header().Get("Retry-After"))
		return apperr.RateLimited(provider, retryAfter, nil)
	case 400:
		body := resp.String()
		if isContextExceededBody(body) {
			return apperr.ContextWindow(model, extractContextLimit(body), nil)
		}
		return apperr.Upstream(provider, status, nil)
	default:
		return apperr.Upstream(provider, status, nil)
	}
}

// isContextExceededBody reports whether an HTTP-400 body describes a context-window overflow.
// Provider/runtime phrasing varies even within the same server (live LM Studio testing observed
// both "exceeds the available context size" and "greater than the context length (n_keep: ...>=
// n_ctx: ...)" from the same llama.cpp backend, depending on runtime/quantization); OpenAI-compatible
// providers use "context_length_exceeded". This matches a case-insensitive, context-scoped substring
// set rather than one exact string. "n_ctx" is llama.cpp's internal context-size field name and is a
// strong, low-risk-of-overmatching signal on its own.
func isContextExceededBody(body string) bool {
	lower := strings.ToLower(body)
	if strings.Contains(lower, "context_length_exceeded") || strings.Contains(lower, "n_ctx") {
		return true
	}
	if !strings.Contains(lower, "context") {
		return false
	}
	return strings.Contains(lower, "exceed") ||
		strings.Contains(lower, "too long") ||
		strings.Contains(lower, "greater than")
}

var (
	// contextLimitNCtxRe matches llama.cpp's internal field name directly, e.g. "n_ctx: 2048".
	contextLimitNCtxRe = regexp.MustCompile(`(?i)n_ctx:?\s*(\d+)`)
	// contextLimitDescriptiveRe matches prose forms, e.g. "available context size (2048 tokens)"
	// or "maximum context length is 8192 tokens".
	contextLimitDescriptiveRe = regexp.MustCompile(`(?i)context (?:size|length)[^\d]{0,20}(\d+)`)
)

// extractContextLimit best-effort parses the model's context-window size out of a provider error
// body. Tries the precise "n_ctx" field first — a generic "context size/length (...)" match on a
// body like "...n_keep: 8530>= n_ctx: 2048..." would otherwise capture the requested token count
// (8530) instead of the actual limit (2048). Returns 0 if no recognizable limit is present, in
// which case apperr.ContextWindow omits the "limit" detail.
func extractContextLimit(body string) int {
	for _, re := range []*regexp.Regexp{contextLimitNCtxRe, contextLimitDescriptiveRe} {
		m := re.FindStringSubmatch(body)
		if len(m) < 2 {
			continue
		}
		if n, err := strconv.Atoi(m[1]); err == nil {
			return n
		}
	}
	return 0
}

// parseRetryAfter parses the Retry-After header value as seconds.
// Returns 0 if the value is absent, non-numeric, or a date string.
func parseRetryAfter(val string) int {
	if val == "" {
		return 0
	}
	var n int
	fmt.Sscanf(val, "%d", &n) //nolint:errcheck // 0 is the correct fallback for non-numeric values
	return n
}
