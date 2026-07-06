package application

import (
	"context"
	"errors"
	"path/filepath"
	"testing"

	"go_text/internal/apperr"
	"go_text/internal/db"
	"go_text/internal/logging"
	"go_text/internal/settings"

	"resty.dev/v3"
)

// ── Test helpers ─────────────────────────────────────────────────────────

// newDiscardLogger builds a console-only, file-disabled logger so tests never
// touch disk for log output.
func newDiscardLogger(t *testing.T) *logging.Logger {
	t.Helper()
	l, err := logging.New(logging.DefaultConfig(), false)
	if err != nil {
		t.Fatalf("logging.New: %v", err)
	}
	t.Cleanup(func() { _ = l.Close() })
	return l
}

// newTestHolder wires a full ApplicationContextHolder the same way main.go
// does, but with no DB (Init is not called) and a discard logger.
func newTestHolder(t *testing.T) *ApplicationContextHolder {
	t.Helper()
	return NewApplicationContextHolder(newDiscardLogger(t), resty.New())
}

// openTestDB opens a real sqlite database over a temp file, matching the
// pattern in internal/settings/repository_sqlite_test.go and internal/db/db_test.go.
func openTestDB(t *testing.T) *db.Database {
	t.Helper()
	dbPath := filepath.Join(t.TempDir(), "test.db")
	database, err := db.Open(dbPath)
	if err != nil {
		t.Fatalf("openTestDB: %v", err)
	}
	t.Cleanup(func() { _ = database.Close() })
	return database
}

// fakeFileUtils satisfies file.FileUtilsServiceAPI with configurable return
// values for the two methods Init actually calls.
type fakeFileUtils struct {
	dbPath     string
	dbPathErr  error
	logsDir    string
	logsDirErr error
}

func (fakeFileUtils) GetAppSettingsFolderPath() (string, error) { return "", nil }
func (f fakeFileUtils) GetAppDatabaseFilePath() (string, error) { return f.dbPath, f.dbPathErr }
func (fakeFileUtils) ResolveAppLogsFolderPath(string) (string, error) {
	return "", nil
}
func (f fakeFileUtils) EnsureAppLogsFolderExists(string) (string, error) {
	return f.logsDir, f.logsDirErr
}

// The following swap* helpers replace the wails-runtime execution seams for
// the duration of a test and restore them via t.Cleanup. Like
// swapRunOpenCommand in openpath_test.go, the seams are process-global
// mutable state — subtests using them must NOT run in parallel.

func swapClipboardGetText(t *testing.T, fn func(ctx context.Context) (string, error)) {
	t.Helper()
	orig := clipboardGetText
	clipboardGetText = fn
	t.Cleanup(func() { clipboardGetText = orig })
}

func swapClipboardSetText(t *testing.T, fn func(ctx context.Context, text string) error) {
	t.Helper()
	orig := clipboardSetText
	clipboardSetText = fn
	t.Cleanup(func() { clipboardSetText = orig })
}

func swapBrowserOpenURL(t *testing.T, fn func(ctx context.Context, url string)) {
	t.Helper()
	orig := browserOpenURL
	browserOpenURL = fn
	t.Cleanup(func() { browserOpenURL = orig })
}

func swapWindowSetSize(t *testing.T, fn func(ctx context.Context, width, height int)) {
	t.Helper()
	orig := windowSetSize
	windowSetSize = fn
	t.Cleanup(func() { windowSetSize = orig })
}

// ── SetContext ───────────────────────────────────────────────────────────

func TestApplicationContextHolder_SetContext_StoresContext(t *testing.T) {
	holder := newTestHolder(t)
	ctx := context.Background()

	holder.SetContext(ctx)

	if holder.ctx != ctx {
		t.Errorf("ctx not stored: want %v, got %v", ctx, holder.ctx)
	}
}

// ── Init ─────────────────────────────────────────────────────────────────

func TestApplicationContextHolder_Init_Success(t *testing.T) {
	holder := newTestHolder(t)
	holder.fileService = fakeFileUtils{
		dbPath:  filepath.Join(t.TempDir(), "test.db"),
		logsDir: t.TempDir(),
	}
	swapWindowSetSize(t, func(context.Context, int, int) {})

	ctx := context.WithValue(context.Background(), "buildtype", "dev") //nolint:staticcheck // matches wails' own ctx key

	if err := holder.Init(ctx); err != nil {
		t.Fatalf("Init: %v", err)
	}
	if holder.DB == nil {
		t.Fatal("expected DB to be wired after Init")
	}
	t.Cleanup(func() { _ = holder.DB.Close() })

	// The settings service's repository was swapped from nil to a real
	// SQLite-backed one; a call that would otherwise nil-pointer-panic must
	// now succeed cleanly.
	if _, err := holder.SettingsService.GetWindowSizeConfig(); err != nil {
		t.Errorf("GetWindowSizeConfig after Init: %v", err)
	}
}

func TestApplicationContextHolder_Init_ResolveDBPathError(t *testing.T) {
	holder := newTestHolder(t)
	holder.fileService = fakeFileUtils{dbPathErr: errors.New("boom")}

	err := holder.Init(context.Background())

	if err == nil {
		t.Fatal("expected an error when the db path cannot be resolved")
	}
	if holder.DB != nil {
		t.Error("DB must remain nil when path resolution fails")
	}
}

func TestApplicationContextHolder_Init_OpenDatabaseError(t *testing.T) {
	holder := newTestHolder(t)
	// A directory (not a file) is not a valid sqlite database file: db.Open's
	// Ping() fails deterministically, returning a clean wrapped error.
	holder.fileService = fakeFileUtils{dbPath: t.TempDir()}

	err := holder.Init(context.Background())

	if err == nil {
		t.Fatal("expected an error when db.Open fails")
	}
	if holder.DB != nil {
		t.Error("DB must remain nil when db.Open fails")
	}
}

// ── CancelAllRuns ────────────────────────────────────────────────────────

func TestApplicationContextHolder_CancelAllRuns_DelegatesWithoutPanicking(t *testing.T) {
	holder := newTestHolder(t)

	holder.CancelAllRuns()
}

// ── EnableLoggingForDev ──────────────────────────────────────────────────

func TestApplicationContextHolder_EnableLoggingForDev(t *testing.T) {
	tests := []struct {
		name      string
		buildType any
		wantDebug bool
	}{
		{name: "dev build enables debug", buildType: "dev", wantDebug: true},
		{name: "production build leaves debug disabled", buildType: "production", wantDebug: false},
		{name: "missing buildtype leaves debug disabled", buildType: nil, wantDebug: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			holder := newTestHolder(t)

			ctx := context.Background()
			if tt.buildType != nil {
				ctx = context.WithValue(ctx, "buildtype", tt.buildType) //nolint:staticcheck // matches wails' own ctx key
			}

			holder.EnableLoggingForDev(ctx)

			if got := holder.RestyClient.IsDebug(); got != tt.wantDebug {
				t.Errorf("IsDebug() = %v, want %v", got, tt.wantDebug)
			}
		})
	}
}

// ── LogError ─────────────────────────────────────────────────────────────

func TestApplicationContextHolder_LogError_Success(t *testing.T) {
	holder := newTestHolder(t)

	res := holder.LogError("something happened")

	if res.Error != nil {
		t.Fatalf("unexpected error envelope: %+v", res.Error)
	}
}

func TestApplicationContextHolder_LogError_PanicRecovery(t *testing.T) {
	holder := &ApplicationContextHolder{} // appLogger is nil

	res := holder.LogError("boom")

	if res.Error == nil {
		t.Fatal("expected an internal error envelope when appLogger is nil")
	}
	if res.Error.Code != apperr.CodeInternal {
		t.Errorf("expected internal code, got %q", res.Error.Code)
	}
}

// ── ClipboardGetText ─────────────────────────────────────────────────────

func TestApplicationContextHolder_ClipboardGetText_Success(t *testing.T) {
	swapClipboardGetText(t, func(context.Context) (string, error) {
		return "hello", nil
	})
	holder := &ApplicationContextHolder{}

	res := holder.ClipboardGetText()

	if res.Error != nil {
		t.Fatalf("unexpected error envelope: %+v", res.Error)
	}
	if res.Data != "hello" {
		t.Errorf("Data: want %q, got %q", "hello", res.Data)
	}
}

func TestApplicationContextHolder_ClipboardGetText_Error(t *testing.T) {
	swapClipboardGetText(t, func(context.Context) (string, error) {
		return "", errors.New("boom")
	})
	holder := &ApplicationContextHolder{}

	res := holder.ClipboardGetText()

	if res.Error == nil {
		t.Fatal("expected an internal error envelope")
	}
	if res.Error.Code != apperr.CodeInternal {
		t.Errorf("expected internal code, got %q", res.Error.Code)
	}
}

func TestApplicationContextHolder_ClipboardGetText_PanicRecovery(t *testing.T) {
	swapClipboardGetText(t, func(context.Context) (string, error) {
		panic("boom")
	})
	holder := &ApplicationContextHolder{}

	res := holder.ClipboardGetText()

	if res.Error == nil {
		t.Fatal("expected an internal error envelope when the seam panics")
	}
	if res.Error.Code != apperr.CodeInternal {
		t.Errorf("expected internal code, got %q", res.Error.Code)
	}
}

// ── ClipboardSetText ─────────────────────────────────────────────────────

func TestApplicationContextHolder_ClipboardSetText_Success(t *testing.T) {
	var gotText string
	swapClipboardSetText(t, func(_ context.Context, text string) error {
		gotText = text
		return nil
	})
	holder := &ApplicationContextHolder{}

	res := holder.ClipboardSetText("copy me")

	if res.Error != nil {
		t.Fatalf("unexpected error envelope: %+v", res.Error)
	}
	if gotText != "copy me" {
		t.Errorf("seam invoked with %q, want %q", gotText, "copy me")
	}
}

func TestApplicationContextHolder_ClipboardSetText_Error(t *testing.T) {
	swapClipboardSetText(t, func(context.Context, string) error {
		return errors.New("boom")
	})
	holder := &ApplicationContextHolder{}

	res := holder.ClipboardSetText("copy me")

	if res.Error == nil {
		t.Fatal("expected an internal error envelope")
	}
	if res.Error.Code != apperr.CodeInternal {
		t.Errorf("expected internal code, got %q", res.Error.Code)
	}
}

// ── BrowserOpenURL ───────────────────────────────────────────────────────

func TestApplicationContextHolder_BrowserOpenURL_Success(t *testing.T) {
	var gotURL string
	swapBrowserOpenURL(t, func(_ context.Context, url string) {
		gotURL = url
	})
	holder := &ApplicationContextHolder{}

	res := holder.BrowserOpenURL("https://example.com")

	if res.Error != nil {
		t.Fatalf("unexpected error envelope: %+v", res.Error)
	}
	if gotURL != "https://example.com" {
		t.Errorf("seam invoked with %q, want %q", gotURL, "https://example.com")
	}
}

func TestApplicationContextHolder_BrowserOpenURL_InvalidScheme(t *testing.T) {
	called := false
	swapBrowserOpenURL(t, func(context.Context, string) {
		called = true
	})
	holder := &ApplicationContextHolder{}

	res := holder.BrowserOpenURL("javascript:alert(1)")

	if res.Error == nil {
		t.Fatal("expected a validation error envelope for a non-http(s) scheme")
	}
	if res.Error.Code != apperr.CodeValidation {
		t.Errorf("expected validation code, got %q", res.Error.Code)
	}
	if called {
		t.Error("seam must not be invoked for an invalid scheme")
	}
}

// ── SaveWindowSize ───────────────────────────────────────────────────────

func TestApplicationContextHolder_SaveWindowSize_PersistsToRealDB(t *testing.T) {
	holder := newTestHolder(t)
	database := openTestDB(t)
	holder.SettingsService.SetRepository(settings.NewSqliteSettingsRepository(database))

	res := holder.SaveWindowSize(1024, 768)

	if res.Error != nil {
		t.Fatalf("unexpected error envelope: %+v", res.Error)
	}

	cfg, err := holder.SettingsService.GetWindowSizeConfig()
	if err != nil {
		t.Fatalf("GetWindowSizeConfig: %v", err)
	}
	if cfg.Width != 1024 || cfg.Height != 768 {
		t.Errorf("round-trip mismatch: want 1024x768, got %dx%d", cfg.Width, cfg.Height)
	}
}

func TestApplicationContextHolder_SaveWindowSize_ValidationError(t *testing.T) {
	holder := newTestHolder(t) // SettingsService repository intentionally left nil

	res := holder.SaveWindowSize(1, 1)

	if res.Error == nil {
		t.Fatal("expected a validation error envelope for a too-small size")
	}
	if res.Error.Code != apperr.CodeValidation {
		t.Errorf("expected validation code, got %q", res.Error.Code)
	}
}

func TestApplicationContextHolder_SaveWindowSize_PanicRecovery(t *testing.T) {
	holder := newTestHolder(t) // SettingsService repository left nil

	res := holder.SaveWindowSize(1024, 768)

	if res.Error == nil {
		t.Fatal("expected an internal error envelope when the repository is nil")
	}
	if res.Error.Code != apperr.CodeInternal {
		t.Errorf("expected internal code, got %q", res.Error.Code)
	}
}
