package llms

import (
	"context"
	"errors"
	"net"
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
	ae := mapTransportError("my-provider", context.DeadlineExceeded)
	if ae.Code != apperr.CodeTimeout {
		t.Errorf("want CodeTimeout, got %q", ae.Code)
	}
}

func TestMapTransportError_NetTimeout(t *testing.T) {
	t.Parallel()
	err := &fakeNetError{timeout: true}
	ae := mapTransportError("my-provider", err)
	if ae.Code != apperr.CodeTimeout {
		t.Errorf("want CodeTimeout, got %q", ae.Code)
	}
}

func TestMapTransportError_DialError(t *testing.T) {
	t.Parallel()
	err := &net.OpError{Op: "dial", Net: "tcp", Err: errors.New("connection refused")}
	ae := mapTransportError("my-provider", err)
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
