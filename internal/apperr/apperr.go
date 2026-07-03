package apperr

import (
	"errors"
	"fmt"
	"strconv"
)

// ErrorCode is the machine-readable error classification; registered as a
// Wails EnumBind so the TypeScript bridge gets a typed enum.
type ErrorCode string

const (
	CodeValidation          ErrorCode = "validation"
	CodeInvalidPlan         ErrorCode = "invalid_plan"
	CodeBusy                ErrorCode = "busy"
	CodeAuth                ErrorCode = "auth"
	CodeMissingCredential   ErrorCode = "missing_credential"
	CodeProviderUnreachable ErrorCode = "provider_unreachable"
	CodeTimeout             ErrorCode = "timeout"
	CodeRateLimited         ErrorCode = "rate_limited"
	CodeModelNotFound       ErrorCode = "model_not_found"
	CodeUpstream            ErrorCode = "upstream"
	CodeEmptyCompletion     ErrorCode = "empty_completion"
	CodeContextWindow       ErrorCode = "context_window"
	CodeStepFailed          ErrorCode = "step_failed"
	CodeCancelled           ErrorCode = "cancelled"
	CodeInternal            ErrorCode = "internal"
)

// AppError is the single typed error used throughout the backend.
// cause is never serialized — it is logged at the handler boundary only.
type AppError struct {
	Code      ErrorCode
	Title     string
	Message   string
	Details   map[string]string // safe allowlist only; never secrets or full API URLs
	Retryable bool
	cause     error
}

func (e *AppError) Error() string { return e.Message }
func (e *AppError) Unwrap() error { return e.cause }

func Validation(field, expected, got string) *AppError {
	return &AppError{
		Code:    CodeValidation,
		Title:   fmt.Sprintf("Invalid %s", field),
		Message: fmt.Sprintf("%s %s; got %s.", field, expected, got),
		Details: map[string]string{
			"field":    field,
			"expected": expected,
			"got":      got,
		},
		Retryable: false,
	}
}

func InvalidPlan(reason string, steps, inferences int) *AppError {
	return &AppError{
		Code:    CodeInvalidPlan,
		Title:   "Stack not allowed",
		Message: fmt.Sprintf("%s (max 5 steps, 3 inferences).", reason),
		Details: map[string]string{
			"reason":     reason,
			"steps":      strconv.Itoa(steps),
			"inferences": strconv.Itoa(inferences),
		},
		Retryable: false,
	}
}

// Busy signals the single-flight gate: an inference is already running.
// Non-retryable; no details (no sensitive context needed).
func Busy() *AppError {
	return &AppError{
		Code:      CodeBusy,
		Title:     "Already running",
		Message:   "An inference is already in progress — wait for it to finish before starting another.",
		Retryable: false,
	}
}

func Auth(provider, statusCode, reason string, cause error) *AppError {
	details := map[string]string{
		"provider":   provider,
		"statusCode": statusCode,
	}
	msg := fmt.Sprintf("Request to %s was rejected: authentication failed.", provider)
	if reason != "" {
		details["reason"] = reason
		msg = fmt.Sprintf("Request to %s was rejected: authentication failed — %s.", provider, reason)
	}
	return &AppError{
		Code:      CodeAuth,
		Title:     "Authentication failed",
		Message:   msg,
		Details:   details,
		Retryable: false,
		cause:     cause,
	}
}

// MissingCredential stores only the env-var NAME — never the secret value.
func MissingCredential(provider, envVar string) *AppError {
	return &AppError{
		Code:    CodeMissingCredential,
		Title:   "API key not set",
		Message: fmt.Sprintf("Set the %s environment variable for %s.", envVar, provider),
		Details: map[string]string{
			"provider": provider,
			"envVar":   envVar,
		},
		Retryable: false,
	}
}

func Unreachable(provider, baseURL string, cause error) *AppError {
	details := map[string]string{"provider": provider}
	if baseURL != "" {
		details["baseUrl"] = baseURL
	}
	return &AppError{
		Code:      CodeProviderUnreachable,
		Title:     "Provider unreachable",
		Message:   fmt.Sprintf("Couldn't reach %s — check the Base URL and that it's running.", provider),
		Details:   details,
		Retryable: true,
		cause:     cause,
	}
}

func Timeout(provider string, seconds int, cause error) *AppError {
	return &AppError{
		Code:    CodeTimeout,
		Title:   "Request timed out",
		Message: fmt.Sprintf("%s did not respond within %ds.", provider, seconds),
		Details: map[string]string{
			"provider": provider,
			"timeout":  strconv.Itoa(seconds),
		},
		Retryable: true,
		cause:     cause,
	}
}

// RewriteTimeoutSeconds rebuilds a CodeTimeout error with the caller's actual configured
// timeout. mapTransportError (internal/llms) has no access to the configured duration — only
// the transport error — so it emits a 0 placeholder; callers that own the timeout value fix it
// up here before the error is surfaced. Non-timeout errors pass through unchanged.
func RewriteTimeoutSeconds(err error, seconds int) error {
	var ae *AppError
	if errors.As(err, &ae) && ae.Code == CodeTimeout {
		return Timeout(ae.Details["provider"], seconds, ae.Unwrap())
	}
	return err
}

func RateLimited(provider string, retryAfter int, cause error) *AppError {
	details := map[string]string{"provider": provider}
	msg := fmt.Sprintf("%s is rate-limiting requests.", provider)
	if retryAfter > 0 {
		details["retryAfter"] = strconv.Itoa(retryAfter)
		msg = fmt.Sprintf("%s is rate-limiting requests — retrying in %ds.", provider, retryAfter)
	}
	return &AppError{
		Code:      CodeRateLimited,
		Title:     "Rate limited",
		Message:   msg,
		Details:   details,
		Retryable: true,
		cause:     cause,
	}
}

func ModelNotFound(provider, model string, cause error) *AppError {
	return &AppError{
		Code:    CodeModelNotFound,
		Title:   "Model not found",
		Message: fmt.Sprintf("Model/deployment %s wasn't found on %s.", model, provider),
		Details: map[string]string{
			"provider": provider,
			"model":    model,
		},
		Retryable: false,
		cause:     cause,
	}
}

func Upstream(provider, statusCode string, cause error) *AppError {
	return &AppError{
		Code:    CodeUpstream,
		Title:   "Provider error",
		Message: fmt.Sprintf("%s had a server error (%s). Please retry.", provider, statusCode),
		Details: map[string]string{
			"provider":   provider,
			"statusCode": statusCode,
		},
		Retryable: true,
		cause:     cause,
	}
}

func EmptyCompletion(provider, model string) *AppError {
	return &AppError{
		Code:    CodeEmptyCompletion,
		Title:   "No response",
		Message: fmt.Sprintf("%s returned an empty result.", provider),
		Details: map[string]string{
			"provider": provider,
			"model":    model,
		},
		Retryable: false,
	}
}

func ContextWindow(model string, limit int, cause error) *AppError {
	details := map[string]string{"model": model}
	if limit > 0 {
		details["limit"] = strconv.Itoa(limit)
	}
	return &AppError{
		Code:      CodeContextWindow,
		Title:     "Input too long",
		Message:   "The text exceeds the model's context window.",
		Details:   details,
		Retryable: false,
		cause:     cause,
	}
}

// StepFailed wraps a step's *AppError with chain context.
// Retryable inherits from the inner error. stepIndex is 0-based; messages display 1-based.
// inner must not be nil; passing nil returns an Internal error to prevent a nil-dereference panic.
func StepFailed(index int, family string, inner *AppError) *AppError {
	if inner == nil {
		return Internal(fmt.Errorf("StepFailed called with nil inner error at step %d", index+1))
	}
	return &AppError{
		Code:    CodeStepFailed,
		Title:   fmt.Sprintf("Step %d failed", index+1),
		Message: fmt.Sprintf("Step %d (%s) failed: %s. Earlier steps completed.", index+1, family, inner.Message),
		Details: map[string]string{
			"stepIndex":  strconv.Itoa(index),
			"family":     family,
			"inner":      inner.Message,
			"innerCode":  string(inner.Code),
			"innerTitle": inner.Title,
		},
		Retryable: inner.Retryable,
		cause:     inner,
	}
}

// Cancelled signals a ctx-cancelled chain. stepIndex is the 0-based step that was
// running when cancelled; message displays 1-based for readability.
func Cancelled(stepIndex int) *AppError {
	return &AppError{
		Code:    CodeCancelled,
		Title:   "Cancelled",
		Message: fmt.Sprintf("Run cancelled after step %d. Partial result kept.", stepIndex+1),
		Details: map[string]string{
			"stepIndex": strconv.Itoa(stepIndex),
		},
		Retryable: false,
	}
}

// Internal is the catch-all / panic fallback. Details are always empty to
// avoid leaking internal state.
func Internal(cause error) *AppError {
	return &AppError{
		Code:      CodeInternal,
		Title:     "Something went wrong",
		Message:   "An unexpected error occurred. Please try again.",
		Retryable: true,
		cause:     cause,
	}
}
