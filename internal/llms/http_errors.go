package llms

import (
	"context"
	"errors"
	"fmt"
	"net"

	"go_text/internal/apperr"
	"resty.dev/v3"
)

// mapTransportError converts a resty transport-level error (no HTTP response) to an apperr.
// Call only when resty.Execute returns a non-nil error.
func mapTransportError(provider, baseURL string, err error) *apperr.AppError {
	if errors.Is(err, context.DeadlineExceeded) || errors.Is(err, context.Canceled) {
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

	switch {
	case code == 401 || code == 403:
		return apperr.Auth(provider, status, "", nil)
	case code == 404:
		return apperr.ModelNotFound(provider, model, nil)
	case code == 429:
		retryAfter := parseRetryAfter(resp.Header().Get("Retry-After"))
		return apperr.RateLimited(provider, retryAfter, nil)
	default:
		return apperr.Upstream(provider, status, nil)
	}
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
