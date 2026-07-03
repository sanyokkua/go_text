package settings_test

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/rs/zerolog"

	"go_text/internal/apperr"
	"go_text/internal/file"
	"go_text/internal/logging"
	"go_text/internal/settings"
)

// newUIPreferencesHandler wires a real SettingsService over a freshly-seeded
// temp DB, so the handler exercises the genuine validation + persistence path.
func newUIPreferencesHandler(t *testing.T) *settings.SettingsHandler {
	t.Helper()
	repo := newRepo(t)
	svc := settings.NewSettingsService(noopLogger{}, repo, stubFileUtils{})
	return settings.NewSettingsHandler(svc, nil)
}

// newLoggingHandler creates a handler wired with a real *logging.Logger so
// UpdateLoggingConfig can exercise the Reconfigure path.
func newLoggingHandler(t *testing.T) (*settings.SettingsHandler, *logging.Logger) {
	t.Helper()
	repo := newRepo(t)
	svc := settings.NewSettingsService(noopLogger{}, repo, stubFileUtils{})
	h := settings.NewSettingsHandler(svc, nil)
	l, err := logging.New(logging.DefaultConfig(), false)
	if err != nil {
		t.Fatalf("logging.New: %v", err)
	}
	h.SetAppLogger(l, stubFileUtils{}, false)
	return h, l
}

func TestSettingsHandler_GetLoggingConfig_ReturnsDefaults(t *testing.T) {
	// Arrange: freshly-seeded DB, no updates applied.
	repo := newRepo(t)
	svc := settings.NewSettingsService(noopLogger{}, repo, stubFileUtils{})
	handler := settings.NewSettingsHandler(svc, nil)

	// Act
	res := handler.GetLoggingConfig()

	// Assert
	if res.Error != nil {
		t.Fatalf("unexpected error: %+v", res.Error)
	}
	if res.Data == nil {
		t.Fatal("expected Data to be set")
	}
	if res.Data.LogFileEnabled {
		t.Error("default LogFileEnabled: want false")
	}
	if res.Data.LogLevel != "info" {
		t.Errorf("default LogLevel: want %q, got %q", "info", res.Data.LogLevel)
	}
	if res.Data.LogMaxSizeMB != 10 {
		t.Errorf("default LogMaxSizeMB: want 10, got %d", res.Data.LogMaxSizeMB)
	}
}

func TestSettingsHandler_UpdateLoggingConfig_ReconfiguresLogger(t *testing.T) {
	// Arrange: handler wired with a real logger so Reconfigure is exercised.
	handler, l := newLoggingHandler(t)

	cfg := apperr.LoggingConfig{
		LogFileEnabled: false,
		LogLevel:       "debug",
		LogDirectory:   "",
		LogMaxSizeMB:   5,
		LogMaxBackups:  3,
		LogMaxAgeDays:  7,
		LogCompress:    false,
	}

	// Act
	res := handler.UpdateLoggingConfig(cfg)

	// Assert — envelope is clean.
	if res.Error != nil {
		t.Fatalf("unexpected error: %+v", res.Error)
	}
	if res.Data == nil {
		t.Fatal("expected Data to be set")
	}
	if res.Data.LogLevel != "debug" {
		t.Errorf("saved LogLevel: want %q, got %q", "debug", res.Data.LogLevel)
	}
	// Logger must have been reconfigured to debug level.
	if l.ZeroLogger().GetLevel() != zerolog.DebugLevel {
		t.Errorf("zerolog level after reconfigure: want DebugLevel, got %v", l.ZeroLogger().GetLevel())
	}
}

func TestSettingsHandler_UpdateLoggingConfig_DisablesFile(t *testing.T) {
	handler, _ := newLoggingHandler(t)

	// Enable file logging first.
	enable := apperr.LoggingConfig{
		LogFileEnabled: false,
		LogLevel:       "info",
		LogDirectory:   "",
		LogMaxSizeMB:   10,
		LogMaxBackups:  5,
		LogMaxAgeDays:  30,
		LogCompress:    false,
	}
	if res := handler.UpdateLoggingConfig(enable); res.Error != nil {
		t.Fatalf("enable step error: %+v", res.Error)
	}

	// Disable.
	disable := enable
	disable.LogFileEnabled = false
	res := handler.UpdateLoggingConfig(disable)

	if res.Error != nil {
		t.Fatalf("disable step error: %+v", res.Error)
	}
	if res.Data == nil {
		t.Fatal("expected Data on disable")
	}
	if res.Data.LogFileEnabled {
		t.Error("expected LogFileEnabled to be false after disable")
	}
}

// TestSettingsHandler_FileLogging_HandlerVsAppLoggerRouting is the T89
// discriminator (docs/testing/reports/2026-07-03-live-testing-report.md).
// It wires a *real* file.FileUtilsService (not stubFileUtils, which returns
// ("", nil) and never exercises real directory resolution) and separately
// checks two independent write paths after enabling file logging live:
//
//   - the control: a direct write via the live *logging.Logger obtained from
//     SetAppLogger. This must reach app.log both before and after any T89
//     fix — if it doesn't, the bug is in directory attachment itself, a
//     second issue independent of the handler-boundary logger below.
//   - the case under test: a handler-boundary error, which currently routes
//     through h.zlog, a one-time snapshot of the unconfigured zerolog
//     package-level default logger, frozen at construction and never
//     reconfigured. It is expected to be absent from app.log until that
//     handler-boundary logger is replaced with a live-fetched one.
func TestSettingsHandler_FileLogging_HandlerVsAppLoggerRouting(t *testing.T) {
	// Redirect os.UserConfigDir() into a throwaway temp dir.
	t.Setenv("HOME", t.TempDir())

	repo := newRepo(t)
	realFileUtils := file.NewFileUtilsService(noopLogger{})
	svc := settings.NewSettingsService(noopLogger{}, repo, realFileUtils)
	handler := settings.NewSettingsHandler(svc, nil)
	l, err := logging.New(logging.DefaultConfig(), false)
	if err != nil {
		t.Fatalf("logging.New: %v", err)
	}
	handler.SetAppLogger(l, realFileUtils, false)

	if res := handler.UpdateLoggingConfig(apperr.LoggingConfig{
		LogFileEnabled: true,
		LogLevel:       "debug",
		LogDirectory:   "",
		LogMaxSizeMB:   10,
		LogMaxBackups:  5,
		LogMaxAgeDays:  30,
		LogCompress:    false,
	}); res.Error != nil {
		t.Fatalf("enable file logging: %+v", res.Error)
	}

	// Case under test: providerId="" deterministically triggers a Validation
	// error at the handler boundary (apperr.ToWire), independent of seed data.
	if getRes := handler.GetProviderConfig(""); getRes.Error == nil {
		t.Fatal("expected a validation error for empty providerId")
	}

	// Control: a direct write via the live *logging.Logger, bypassing the
	// handler entirely.
	const probeMarker = "appLogger-direct-probe-t89"
	zl := l.ZeroLogger()
	zl.Info().Msg(probeMarker)

	logDir, err := realFileUtils.ResolveAppLogsFolderPath("")
	if err != nil {
		t.Fatalf("ResolveAppLogsFolderPath: %v", err)
	}
	contents, err := os.ReadFile(filepath.Join(logDir, "app.log"))
	if err != nil {
		t.Fatalf("reading app.log: %v", err)
	}
	logText := string(contents)

	if !strings.Contains(logText, probeMarker) {
		t.Fatal("control failed: a direct write via the live *logging.Logger did not " +
			"reach app.log — this points to a second, independent bug in log-directory " +
			"attachment; the handler-boundary fix alone would not fully resolve T89")
	}
	if !strings.Contains(logText, "providerId") {
		t.Error("handler-boundary validation error did not reach app.log — h.zlog is " +
			"routing through the frozen zerolog global instead of the live app logger")
	}
}

func TestSettingsHandler_GetUIPreferencesConfig(t *testing.T) {
	// Arrange: a freshly-seeded DB defaults the theme to "auto".
	handler := newUIPreferencesHandler(t)

	// Act
	res := handler.GetUIPreferencesConfig()

	// Assert
	if res.Error != nil {
		t.Fatalf("unexpected error envelope: %+v", res.Error)
	}
	if res.Data == nil {
		t.Fatal("expected Data to be set on success")
	}
	if res.Data.Theme != "auto" {
		t.Errorf("default theme: want %q, got %q", "auto", res.Data.Theme)
	}
}

func TestSettingsHandler_UpdateUIPreferencesConfig_Layout(t *testing.T) {
	tests := []struct {
		name    string
		layout  string
		wantErr bool
	}{
		{name: "valid_side", layout: "side", wantErr: false},
		{name: "valid_stacked", layout: "stacked", wantErr: false},
		{name: "valid_empty", layout: "", wantErr: false},
		{name: "invalid_column", layout: "column", wantErr: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			handler := newUIPreferencesHandler(t)

			res := handler.UpdateUIPreferencesConfig(apperr.UIPreferencesConfig{
				Theme:  "auto",
				Layout: tt.layout,
			})

			if tt.wantErr {
				if res.Error == nil {
					t.Fatalf("expected error for layout %q, got none", tt.layout)
				}
				if res.Error.Code != apperr.CodeValidation {
					t.Errorf("expected CodeValidation, got %q", res.Error.Code)
				}
				return
			}
			if res.Error != nil {
				t.Fatalf("unexpected error for layout %q: %+v", tt.layout, res.Error)
			}
		})
	}
}

func TestSettingsHandler_UpdateUIPreferencesConfig_ViewMode(t *testing.T) {
	tests := []struct {
		name     string
		viewMode string
		wantErr  bool
	}{
		{name: "valid_preview", viewMode: "preview", wantErr: false},
		{name: "valid_source", viewMode: "source", wantErr: false},
		{name: "valid_diff", viewMode: "diff", wantErr: false},
		{name: "valid_empty", viewMode: "", wantErr: false},
		{name: "invalid_raw", viewMode: "raw", wantErr: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			handler := newUIPreferencesHandler(t)

			res := handler.UpdateUIPreferencesConfig(apperr.UIPreferencesConfig{
				Theme:    "auto",
				ViewMode: tt.viewMode,
			})

			if tt.wantErr {
				if res.Error == nil {
					t.Fatalf("expected error for viewMode %q, got none", tt.viewMode)
				}
				if res.Error.Code != apperr.CodeValidation {
					t.Errorf("expected CodeValidation, got %q", res.Error.Code)
				}
				return
			}
			if res.Error != nil {
				t.Fatalf("unexpected error for viewMode %q: %+v", tt.viewMode, res.Error)
			}
		})
	}
}

func TestSettingsHandler_GetUIPreferencesConfig_ReturnsAllFields(t *testing.T) {
	t.Parallel()
	handler := newUIPreferencesHandler(t)

	// Seed a non-default state
	_ = handler.UpdateUIPreferencesConfig(apperr.UIPreferencesConfig{
		Theme: "dark", Layout: "stacked",
		SidebarCollapsed: true, HistoryOpen: true, ViewMode: "source",
	})

	res := handler.GetUIPreferencesConfig()

	if res.Error != nil {
		t.Fatalf("unexpected error: %+v", res.Error)
	}
	if res.Data == nil {
		t.Fatal("expected non-nil Data")
	}
	if res.Data.Theme != "dark" {
		t.Errorf("Theme: want %q, got %q", "dark", res.Data.Theme)
	}
	if res.Data.Layout != "stacked" {
		t.Errorf("Layout: want %q, got %q", "stacked", res.Data.Layout)
	}
	if !res.Data.SidebarCollapsed {
		t.Errorf("SidebarCollapsed: want true, got false")
	}
	if !res.Data.HistoryOpen {
		t.Errorf("HistoryOpen: want true, got false")
	}
	if res.Data.ViewMode != "source" {
		t.Errorf("ViewMode: want %q, got %q", "source", res.Data.ViewMode)
	}
}

func TestSettingsHandler_UpdateUIPreferencesConfig(t *testing.T) {
	tests := []struct {
		name      string
		theme     string
		wantErr   bool
		wantTheme string
	}{
		{name: "valid_dark", theme: "dark", wantErr: false, wantTheme: "dark"},
		{name: "valid_light", theme: "light", wantErr: false, wantTheme: "light"},
		{name: "valid_auto", theme: "auto", wantErr: false, wantTheme: "auto"},
		{name: "invalid_purple", theme: "purple", wantErr: true},
		{name: "invalid_empty", theme: "", wantErr: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			// Arrange
			handler := newUIPreferencesHandler(t)

			// Act
			res := handler.UpdateUIPreferencesConfig(apperr.UIPreferencesConfig{Theme: tt.theme})

			// Assert
			if tt.wantErr {
				if res.Error == nil {
					t.Fatalf("expected non-nil error envelope for theme %q", tt.theme)
				}
				if res.Error.Code != apperr.CodeValidation {
					t.Errorf("expected validation error code, got %q", res.Error.Code)
				}
				if res.Data != nil {
					t.Errorf("expected nil Data on validation failure, got %+v", res.Data)
				}
				return
			}
			if res.Error != nil {
				t.Fatalf("unexpected error envelope: %+v", res.Error)
			}
			if res.Data == nil {
				t.Fatal("expected Data to be set on success")
			}
			if res.Data.Theme != tt.wantTheme {
				t.Errorf("updated theme: want %q, got %q", tt.wantTheme, res.Data.Theme)
			}
		})
	}
}
