package settings_test

import (
	"testing"

	"github.com/rs/zerolog"

	"go_text/internal/apperr"
	"go_text/internal/settings"
)

// newUIPreferencesHandler wires a real SettingsService over a freshly-seeded
// temp DB, so the handler exercises the genuine validation + persistence path.
func newUIPreferencesHandler(t *testing.T) *settings.SettingsHandler {
	t.Helper()
	repo := newRepo(t)
	svc := settings.NewSettingsService(noopLogger{}, repo, stubFileUtils{})
	return settings.NewSettingsHandler(noopLogger{}, zerolog.Nop(), svc)
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
