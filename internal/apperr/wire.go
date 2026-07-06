package apperr

import (
	"errors"

	"github.com/rs/zerolog"
)

// WireError is the serialized error shape that crosses the Wails bridge.
// cause is stripped — ToWire logs the full chain before returning.
type WireError struct {
	Code      ErrorCode         `json:"code"`
	Title     string            `json:"title"`
	Message   string            `json:"message"`
	Details   map[string]string `json:"details,omitempty"`
	Retryable bool              `json:"retryable"`
}

// ToWire logs the full error chain then returns the sanitized WireError for
// the Wails bridge. If err (or any in its chain) wraps an *AppError, its
// classified fields are used. Any nil or unclassified error maps to CodeInternal.
//
// Typed-nil guard: errors.As can match a (*AppError)(nil) interface value
// and set ae to nil; the ae != nil check prevents a nil-pointer panic.
func ToWire(log zerolog.Logger, err error) WireError {
	if err == nil {
		return internalWire()
	}
	var ae *AppError
	if errors.As(err, &ae) && ae != nil {
		event := log.Error().
			Str("code", string(ae.Code)).
			Bool("retryable", ae.Retryable).
			Err(err)
		if ae.cause != nil {
			event = event.AnErr("cause", ae.cause)
		}
		event.Msg(ae.Title)
		return WireError{
			Code:      ae.Code,
			Title:     ae.Title,
			Message:   ae.Message,
			Details:   ae.Details,
			Retryable: ae.Retryable,
		}
	}
	log.Error().Err(err).Msg("unclassified error")
	return internalWire()
}

func internalWire() WireError {
	return WireError{
		Code:      CodeInternal,
		Title:     "Something went wrong",
		Message:   "An unexpected error occurred. Please try again.",
		Retryable: true,
	}
}
