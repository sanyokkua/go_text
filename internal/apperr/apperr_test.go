package apperr_test

import (
	"context"
	"errors"
	"fmt"
	"testing"

	"github.com/rs/zerolog"
	"go_text/internal/apperr"
)

// ─── Constructor tests ────────────────────────────────────────────────────

func TestValidation(t *testing.T) {
	e := apperr.Validation("email", "a valid email", "foo@")
	if e.Code != apperr.CodeValidation {
		t.Errorf("Code: got %q want %q", e.Code, apperr.CodeValidation)
	}
	if e.Retryable {
		t.Error("Retryable should be false")
	}
	if e.Details["field"] != "email" || e.Details["expected"] != "a valid email" || e.Details["got"] != "foo@" {
		t.Errorf("Details: got %v", e.Details)
	}
}

func TestInvalidPlan(t *testing.T) {
	e := apperr.InvalidPlan("too many steps", 6, 4)
	if e.Code != apperr.CodeInvalidPlan {
		t.Errorf("Code: got %q", e.Code)
	}
	if e.Retryable {
		t.Error("Retryable should be false")
	}
	if e.Details["steps"] != "6" || e.Details["inferences"] != "4" {
		t.Errorf("Details: got %v", e.Details)
	}
}

func TestBusy(t *testing.T) {
	e := apperr.Busy()
	if e.Code != apperr.CodeBusy {
		t.Errorf("Code: got %q", e.Code)
	}
	if e.Retryable {
		t.Error("Retryable should be false")
	}
	if len(e.Details) != 0 {
		t.Errorf("Busy should have no Details, got %v", e.Details)
	}
}

func TestAuth(t *testing.T) {
	cause := errors.New("upstream 401")
	tests := []struct {
		name       string
		reason     string
		wantReason bool
	}{
		{"with_reason", "invalid token", true},
		{"no_reason", "", false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			e := apperr.Auth("OpenAI", "401", tt.reason, cause)
			if e.Code != apperr.CodeAuth {
				t.Errorf("Code: got %q", e.Code)
			}
			if e.Retryable {
				t.Error("Retryable should be false")
			}
			if tt.wantReason && e.Details["reason"] != tt.reason {
				t.Errorf("Details[reason]: got %q want %q", e.Details["reason"], tt.reason)
			}
			if !tt.wantReason {
				if _, ok := e.Details["reason"]; ok {
					t.Error("Details[reason] should not be set when reason is empty")
				}
			}
			if !errors.Is(e, cause) {
				t.Error("cause should be reachable via errors.Is")
			}
		})
	}
}

func TestMissingCredential(t *testing.T) {
	e := apperr.MissingCredential("Anthropic", "ANTHROPIC_API_KEY")
	if e.Code != apperr.CodeMissingCredential {
		t.Errorf("Code: got %q", e.Code)
	}
	if e.Retryable {
		t.Error("Retryable should be false")
	}
	if e.Details["envVar"] != "ANTHROPIC_API_KEY" {
		t.Errorf("Details[envVar]: got %q", e.Details["envVar"])
	}
	if e.Details["provider"] != "Anthropic" {
		t.Errorf("Details[provider]: got %q", e.Details["provider"])
	}
}

func TestUnreachable(t *testing.T) {
	cause := errors.New("dial error")
	tests := []struct {
		name    string
		baseURL string
		wantKey bool
	}{
		{"with_url", "http://localhost:11434", true},
		{"no_url", "", false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			e := apperr.Unreachable("Ollama", tt.baseURL, cause)
			if e.Code != apperr.CodeProviderUnreachable {
				t.Errorf("Code: got %q", e.Code)
			}
			if !e.Retryable {
				t.Error("Retryable should be true")
			}
			if tt.wantKey && e.Details["baseUrl"] != tt.baseURL {
				t.Errorf("Details[baseUrl]: got %q want %q", e.Details["baseUrl"], tt.baseURL)
			}
			if !tt.wantKey {
				if _, ok := e.Details["baseUrl"]; ok {
					t.Error("Details[baseUrl] should not be present when empty")
				}
			}
		})
	}
}

func TestTimeout(t *testing.T) {
	e := apperr.Timeout("LM Studio", 60, nil)
	if e.Code != apperr.CodeTimeout {
		t.Errorf("Code: got %q", e.Code)
	}
	if !e.Retryable {
		t.Error("Retryable should be true")
	}
	if e.Details["timeout"] != "60" {
		t.Errorf("Details[timeout]: got %q", e.Details["timeout"])
	}
}

func TestRateLimited(t *testing.T) {
	tests := []struct {
		name         string
		retryAfter   int
		wantInDetail bool
	}{
		{"with_retry_after", 30, true},
		{"no_retry_after", 0, false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			e := apperr.RateLimited("OpenAI", tt.retryAfter, nil)
			if e.Code != apperr.CodeRateLimited {
				t.Errorf("Code: got %q", e.Code)
			}
			if !e.Retryable {
				t.Error("Retryable should be true")
			}
			if tt.wantInDetail && e.Details["retryAfter"] != "30" {
				t.Errorf("Details[retryAfter]: got %q", e.Details["retryAfter"])
			}
			if !tt.wantInDetail {
				if _, ok := e.Details["retryAfter"]; ok {
					t.Error("retryAfter should not be present when 0")
				}
			}
		})
	}
}

func TestModelNotFound(t *testing.T) {
	e := apperr.ModelNotFound("Azure", "gpt-99", nil)
	if e.Code != apperr.CodeModelNotFound {
		t.Errorf("Code: got %q", e.Code)
	}
	if e.Retryable {
		t.Error("Retryable should be false")
	}
	if e.Details["model"] != "gpt-99" {
		t.Errorf("Details[model]: got %q", e.Details["model"])
	}
}

func TestUpstream(t *testing.T) {
	e := apperr.Upstream("OpenRouter", "503", errors.New("bad gateway"))
	if e.Code != apperr.CodeUpstream {
		t.Errorf("Code: got %q", e.Code)
	}
	if !e.Retryable {
		t.Error("Retryable should be true")
	}
	if e.Details["statusCode"] != "503" {
		t.Errorf("Details[statusCode]: got %q", e.Details["statusCode"])
	}
}

func TestEmptyCompletion(t *testing.T) {
	e := apperr.EmptyCompletion("Ollama", "llama3")
	if e.Code != apperr.CodeEmptyCompletion {
		t.Errorf("Code: got %q", e.Code)
	}
	if e.Retryable {
		t.Error("Retryable should be false")
	}
	if e.Details["model"] != "llama3" {
		t.Errorf("Details[model]: got %q", e.Details["model"])
	}
}

func TestContextWindow(t *testing.T) {
	tests := []struct {
		name    string
		limit   int
		wantKey bool
	}{
		{"with_limit", 8192, true},
		{"no_limit", 0, false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			e := apperr.ContextWindow("gpt-4o", tt.limit, nil)
			if e.Code != apperr.CodeContextWindow {
				t.Errorf("Code: got %q", e.Code)
			}
			if e.Retryable {
				t.Error("Retryable should be false")
			}
			if tt.wantKey && e.Details["limit"] != "8192" {
				t.Errorf("Details[limit]: got %q", e.Details["limit"])
			}
			if !tt.wantKey {
				if _, ok := e.Details["limit"]; ok {
					t.Error("limit should not be present when 0")
				}
			}
		})
	}
}

func TestStepFailed(t *testing.T) {
	inner := apperr.Timeout("Ollama", 30, nil)
	e := apperr.StepFailed(0, "rewrite", inner)
	if e.Code != apperr.CodeStepFailed {
		t.Errorf("Code: got %q", e.Code)
	}
	if e.Retryable != inner.Retryable {
		t.Errorf("Retryable should inherit from inner: want %v got %v", inner.Retryable, e.Retryable)
	}
	if e.Details["stepIndex"] != "0" {
		t.Errorf("Details[stepIndex]: got %q", e.Details["stepIndex"])
	}
	if e.Details["family"] != "rewrite" {
		t.Errorf("Details[family]: got %q", e.Details["family"])
	}
	if e.Details["inner"] != inner.Message {
		t.Errorf("Details[inner]: want raw inner message %q, got %q", inner.Message, e.Details["inner"])
	}
	if e.Details["innerCode"] != string(inner.Code) {
		t.Errorf("Details[innerCode]: want %q, got %q", inner.Code, e.Details["innerCode"])
	}
	if e.Details["innerTitle"] != inner.Title {
		t.Errorf("Details[innerTitle]: want %q, got %q", inner.Title, e.Details["innerTitle"])
	}
	// Check that the inner Timeout AppError is accessible via Unwrap.
	unwrapped := errors.Unwrap(e)
	if unwrapped == nil {
		t.Fatal("StepFailed should wrap the inner error")
	}
	var innerTarget *apperr.AppError
	if !errors.As(unwrapped, &innerTarget) {
		t.Error("inner error should be an *AppError")
	}
	if innerTarget.Code != apperr.CodeTimeout {
		t.Errorf("inner code: want CodeTimeout, got %q", innerTarget.Code)
	}
}

func TestStepFailed_NilInner(t *testing.T) {
	// Nil inner must not panic; the guard clause returns CodeInternal instead.
	e := apperr.StepFailed(1, "rewrite", nil)
	if e.Code != apperr.CodeInternal {
		t.Errorf("nil inner should produce CodeInternal, got %q", e.Code)
	}
}

func TestStepFailed_PreservesInnerClassification(t *testing.T) {
	// Guards T69: the frontend toast needs innerCode/innerTitle to show the specific
	// error instead of a generic "Step N failed" title. Covers a parameterized-title
	// case (Validation, whose Title embeds the field name) to confirm the already-rendered
	// string round-trips rather than being rebuilt from Code alone.
	tests := []struct {
		name  string
		inner *apperr.AppError
	}{
		{name: "context_window", inner: apperr.ContextWindow("qwen3:1.7b", 4096, nil)},
		{name: "auth", inner: apperr.Auth("Ollama", "401", "invalid key", nil)},
		{name: "validation_parameterized_title", inner: apperr.Validation("temperature", "must be 0-2", "3.5")},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			e := apperr.StepFailed(0, "rewrite", tt.inner)
			if e.Details["innerCode"] != string(tt.inner.Code) {
				t.Errorf("Details[innerCode]: want %q, got %q", tt.inner.Code, e.Details["innerCode"])
			}
			if e.Details["innerTitle"] != tt.inner.Title {
				t.Errorf("Details[innerTitle]: want %q, got %q", tt.inner.Title, e.Details["innerTitle"])
			}
		})
	}
}

func TestCancelled(t *testing.T) {
	e := apperr.Cancelled(2)
	if e.Code != apperr.CodeCancelled {
		t.Errorf("Code: got %q", e.Code)
	}
	if e.Retryable {
		t.Error("Retryable should be false")
	}
	if e.Details["stepIndex"] != "2" {
		t.Errorf("Details[stepIndex]: got %q", e.Details["stepIndex"])
	}
}

func TestCancelledRequest(t *testing.T) {
	cause := context.Canceled
	e := apperr.CancelledRequest(cause)

	if e.Code != apperr.CodeCancelled {
		t.Errorf("want CodeCancelled, got %q", e.Code)
	}
	if e.Retryable {
		t.Error("want Retryable=false")
	}
	if !errors.Is(e, context.Canceled) {
		t.Error("want errors.Is(e, context.Canceled) to hold through Unwrap()")
	}
}

func TestInternal(t *testing.T) {
	cause := errors.New("panic: nil deref")
	e := apperr.Internal(cause)
	if e.Code != apperr.CodeInternal {
		t.Errorf("Code: got %q", e.Code)
	}
	if !e.Retryable {
		t.Error("Retryable should be true")
	}
	if len(e.Details) != 0 {
		t.Errorf("Internal should have no Details (no internal state leakage), got %v", e.Details)
	}
	if !errors.Is(e, cause) {
		t.Error("cause should be reachable via errors.Is")
	}
}

// ─── ToWire mapping tests ─────────────────────────────────────────────────

func TestToWire_ClassifiedError(t *testing.T) {
	ae := apperr.Validation("name", "non-empty", "")
	w := apperr.ToWire(zerolog.Nop(), ae)
	if w.Code != apperr.CodeValidation {
		t.Errorf("Code: got %q want %q", w.Code, apperr.CodeValidation)
	}
	if w.Title != ae.Title {
		t.Errorf("Title: got %q want %q", w.Title, ae.Title)
	}
	if w.Message != ae.Message {
		t.Errorf("Message: got %q want %q", w.Message, ae.Message)
	}
	if w.Retryable != ae.Retryable {
		t.Errorf("Retryable: got %v want %v", w.Retryable, ae.Retryable)
	}
	if w.Details["field"] != "name" {
		t.Errorf("Details propagated: got %v", w.Details)
	}
}

func TestToWire_UnclassifiedError(t *testing.T) {
	plain := errors.New("database connection failed")
	w := apperr.ToWire(zerolog.Nop(), plain)
	if w.Code != apperr.CodeInternal {
		t.Errorf("Code: got %q want CodeInternal", w.Code)
	}
	if !w.Retryable {
		t.Error("unclassified errors should be retryable (CodeInternal)")
	}
}

func TestToWire_NilError(t *testing.T) {
	w := apperr.ToWire(zerolog.Nop(), nil)
	if w.Code != apperr.CodeInternal {
		t.Errorf("nil error should map to CodeInternal, got %q", w.Code)
	}
}

func TestToWire_WrappedAppError(t *testing.T) {
	// Use a non-nil cause to exercise the ae.cause != nil logging branch in ToWire.
	inner := apperr.Timeout("Provider", 60, errors.New("upstream"))
	wrapped := fmt.Errorf("service layer: %w", inner)
	w := apperr.ToWire(zerolog.Nop(), wrapped)
	if w.Code != apperr.CodeTimeout {
		t.Errorf("wrapped AppError should be extracted: got %q want CodeTimeout", w.Code)
	}
}

// ─── Edge cases ───────────────────────────────────────────────────────────

func TestAppError_ErrorMethod_ReturnsMessage(t *testing.T) {
	e := apperr.Busy()
	if e.Error() != e.Message {
		t.Errorf("Error() = %q; want Message = %q", e.Error(), e.Message)
	}
}

func TestAppError_UnwrapPreservesSentinel(t *testing.T) {
	sentinel := errors.New("sentinel cause")
	e := apperr.Unreachable("Ollama", "", sentinel)
	if !errors.Is(e, sentinel) {
		t.Error("sentinel should be reachable via errors.Is through Unwrap chain")
	}
}

// TestToWire_TypedNil guards against a typed-nil (*AppError)(nil) passed as
// error interface. errors.As would match but return a nil pointer; accessing
// ae.Code without the nil check panics.
func TestToWire_TypedNil(t *testing.T) {
	var ae *apperr.AppError // typed nil
	var err error = ae      // non-nil interface wrapping nil pointer
	defer func() {
		if r := recover(); r != nil {
			t.Errorf("ToWire panicked on typed-nil: %v", r)
		}
	}()
	w := apperr.ToWire(zerolog.Nop(), err)
	if w.Code != apperr.CodeInternal {
		t.Errorf("typed-nil should fall through to CodeInternal, got %q", w.Code)
	}
}
