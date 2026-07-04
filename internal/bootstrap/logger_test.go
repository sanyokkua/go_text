package bootstrap_test

import (
	"io"
	"os"
	"testing"

	"go_text/internal/bootstrap"

	"github.com/stretchr/testify/require"
)

// TestNewLogger_NonDevBuild_NoConsoleOutput verifies that the bootstrap logger
// created by NewLogger does not attach a console writer bound to os.Stdout
// when the build does not carry the "dev" build tag.
//
// zerolog.NewConsoleWriter() captures os.Stdout eagerly at construction time
// (Out: os.Stdout is set directly in the struct literal), not lazily on first
// Write. So swapping os.Stdout to a pipe before calling NewLogger lets us
// observe whether a console writer bound to that pipe was actually created.
//
// Under plain `go test ./...` (no `-tags dev`), the compiled buildtag_release.go
// makes bootstrap.IsDevBuild false, so the meaningful assertion here is the
// "no console output" branch — this directly verifies that the bootstrap
// Config used before Reconfigure does not enable a console writer in a
// non-dev build.
func TestNewLogger_NonDevBuild_NoConsoleOutput(t *testing.T) {
	// Arrange
	originalStdout := os.Stdout
	readEnd, writeEnd, err := os.Pipe()
	require.NoError(t, err)
	t.Cleanup(func() {
		os.Stdout = originalStdout
	})
	os.Stdout = writeEnd

	// Act
	logger, err := bootstrap.NewLogger()
	require.NoError(t, err)
	t.Cleanup(func() {
		_ = logger.Close()
	})

	logger.Info("bootstrap probe message")

	require.NoError(t, writeEnd.Close())
	captured, err := io.ReadAll(readEnd)
	require.NoError(t, err)
	os.Stdout = originalStdout

	// Assert
	if bootstrap.IsDevBuild {
		require.Contains(t, string(captured), "bootstrap probe message")
	} else {
		require.Empty(t, captured, "non-dev build must not write to the console/os.Stdout")
	}
}

// TestNewLogger_ReturnsWorkingLogger confirms NewLogger returns a usable
// Wails logger.Logger implementation that does not panic on common calls.
func TestNewLogger_ReturnsWorkingLogger(t *testing.T) {
	// Arrange & Act
	logger, err := bootstrap.NewLogger()

	// Assert
	require.NoError(t, err)
	require.NotNil(t, logger)
	t.Cleanup(func() {
		_ = logger.Close()
	})

	logger.Info("bootstrap logger info message")
	logger.Warning("bootstrap logger warning message")
}
