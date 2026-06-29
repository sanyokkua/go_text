package application

import (
	"errors"
	"path/filepath"
	stdruntime "runtime"
	"testing"

	"go_text/internal/apperr"
)

// TestOpenPathArgs covers the pure GOOS→argv mapping, including the unsupported
// platform branch which must yield a validation error.
func TestOpenPathArgs(t *testing.T) {
	t.Parallel()

	const path = "/some/dir"
	tests := []struct {
		name     string
		goos     string
		wantName string
		wantArgs []string
		wantErr  bool
	}{
		{name: "darwin", goos: "darwin", wantName: "open", wantArgs: []string{path}},
		{name: "windows", goos: "windows", wantName: "explorer", wantArgs: []string{path}},
		{name: "linux", goos: "linux", wantName: "xdg-open", wantArgs: []string{path}},
		{name: "unsupported", goos: "plan9", wantErr: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			name, args, err := openPathArgs(tt.goos, path)

			if (err != nil) != tt.wantErr {
				t.Fatalf("openPathArgs(%q) error = %v, wantErr %v", tt.goos, err, tt.wantErr)
			}
			if tt.wantErr {
				var ae *apperr.AppError
				if !errors.As(err, &ae) {
					t.Fatalf("expected *apperr.AppError, got %T", err)
				}
				if ae.Code != apperr.CodeValidation {
					t.Errorf("expected validation code, got %q", ae.Code)
				}
				return
			}
			if name != tt.wantName {
				t.Errorf("name: want %q, got %q", tt.wantName, name)
			}
			if len(args) != len(tt.wantArgs) || (len(args) > 0 && args[0] != tt.wantArgs[0]) {
				t.Errorf("args: want %v, got %v", tt.wantArgs, args)
			}
		})
	}
}

// swapRunOpenCommand replaces the package-level execution seam for the duration
// of the test and restores it via t.Cleanup. Subtests using it must NOT run in
// parallel — the seam is process-global shared state.
func swapRunOpenCommand(t *testing.T, fn func(name string, args ...string) error) {
	t.Helper()
	orig := runOpenCommand
	runOpenCommand = fn
	t.Cleanup(func() { runOpenCommand = orig })
}

func TestApplicationContextHolder_OpenPath_Success(t *testing.T) {
	dir := t.TempDir()

	var gotName string
	var gotArgs []string
	swapRunOpenCommand(t, func(name string, args ...string) error {
		gotName = name
		gotArgs = args
		return nil
	})

	a := &ApplicationContextHolder{}
	res := a.OpenPath(dir)

	if res.Error != nil {
		t.Fatalf("unexpected error envelope: %+v", res.Error)
	}

	wantName, wantArgs, err := openPathArgs(stdruntime.GOOS, dir)
	if err != nil {
		t.Fatalf("openPathArgs for current GOOS failed: %v", err)
	}
	if gotName != wantName {
		t.Errorf("runOpenCommand name: want %q, got %q", wantName, gotName)
	}
	if len(gotArgs) != len(wantArgs) || gotArgs[0] != wantArgs[0] {
		t.Errorf("runOpenCommand args: want %v, got %v", wantArgs, gotArgs)
	}
}

func TestApplicationContextHolder_OpenPath_LaunchError(t *testing.T) {
	// On Windows the launch error is swallowed by design, so this branch only
	// applies to non-Windows platforms.
	if stdruntime.GOOS == "windows" {
		t.Skip("explorer launch errors are intentionally ignored on Windows")
	}

	swapRunOpenCommand(t, func(_ string, _ ...string) error {
		return errors.New("boom")
	})

	a := &ApplicationContextHolder{}
	res := a.OpenPath(t.TempDir())

	if res.Error == nil {
		t.Fatal("expected an internal error envelope when the launch command fails")
	}
	if res.Error.Code != apperr.CodeInternal {
		t.Errorf("expected internal code, got %q", res.Error.Code)
	}
}

func TestApplicationContextHolder_OpenPath_EmptyPath(t *testing.T) {
	called := false
	swapRunOpenCommand(t, func(_ string, _ ...string) error {
		called = true
		return nil
	})

	a := &ApplicationContextHolder{}
	res := a.OpenPath("   ")

	if res.Error == nil {
		t.Fatal("expected a validation error envelope for empty path")
	}
	if res.Error.Code != apperr.CodeValidation {
		t.Errorf("expected validation code, got %q", res.Error.Code)
	}
	if called {
		t.Error("runOpenCommand must not be invoked for an empty path")
	}
}

func TestApplicationContextHolder_OpenPath_NonExistentPath(t *testing.T) {
	missing := filepath.Join(t.TempDir(), "does-not-exist")

	called := false
	swapRunOpenCommand(t, func(_ string, _ ...string) error {
		called = true
		return nil
	})

	a := &ApplicationContextHolder{}
	res := a.OpenPath(missing)

	if res.Error == nil {
		t.Fatal("expected a validation error envelope for a non-existent path")
	}
	if res.Error.Code != apperr.CodeValidation {
		t.Errorf("expected validation code, got %q", res.Error.Code)
	}
	if called {
		t.Error("runOpenCommand must not be invoked for a non-existent path")
	}
}
