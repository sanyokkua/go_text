package settings_test

import (
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"go_text/internal/apperr"
	"go_text/internal/logging"
	"go_text/internal/settings"

	"github.com/stretchr/testify/require"
)

// newTestLogger builds a real *logging.Logger for service construction in
// tests. Level is set to error to minimize noise; it writes to io.Discard
// (dev=false, no file sink configured) so it has no side effects.
func newTestLogger(t *testing.T) *logging.Logger {
	t.Helper()
	cfg := logging.DefaultConfig()
	cfg.Level = "error"
	l, err := logging.New(cfg, false)
	require.NoError(t, err)
	return l
}

// stubFileUtils satisfies file.FileUtilsServiceAPI; the model-sync path never
// calls it, so every method returns zero values.
type stubFileUtils struct{}

func (stubFileUtils) GetAppSettingsFolderPath() (string, error)        { return "", nil }
func (stubFileUtils) GetAppDatabaseFilePath() (string, error)          { return "", nil }
func (stubFileUtils) ResolveAppLogsFolderPath(string) (string, error)  { return "", nil }
func (stubFileUtils) EnsureAppLogsFolderExists(string) (string, error) { return "", nil }

// Regression: switching the current provider must sync the active model to the
// newly-current provider's selected model, so a chain run never inherits a
// stale model from the previous provider (caught by live run against Ollama).
func TestSettingsService_SetAsCurrentProviderConfig_SyncsModel(t *testing.T) {
	repo := newRepo(t)
	svc := settings.NewSettingsService(newTestLogger(t), repo, stubFileUtils{})

	target, err := repo.CreateProvider(&settings.ProviderConfig{
		Name:          "Ollama Local",
		Kind:          "ollama",
		BaseURL:       "http://127.0.0.1:11434/",
		AuthScheme:    "none",
		SelectedModel: "qwen3:0.6b",
		CustomModels:  []string{},
	})
	if err != nil {
		t.Fatalf("CreateProvider: %v", err)
	}

	// Seed a stale active model from a different provider.
	if err := repo.UpdateModelConfig(&settings.ModelConfig{Name: "stale-old-model", Temperature: 0.5}); err != nil {
		t.Fatalf("UpdateModelConfig: %v", err)
	}

	if _, err := svc.SetAsCurrentProviderConfig(target.ID); err != nil {
		t.Fatalf("SetAsCurrentProviderConfig: %v", err)
	}

	got, err := repo.GetModelConfig()
	if err != nil {
		t.Fatalf("GetModelConfig: %v", err)
	}
	if got.Name != "qwen3:0.6b" {
		t.Errorf("expected active model synced to provider's selectedModel %q, got %q", "qwen3:0.6b", got.Name)
	}
}

// Regression: an out-of-range contextWindow must surface as a classified
// apperr.CodeValidation error, not a plain fmt.Errorf that apperr.ToWire would
// log as "unclassified error" and mask behind a generic message at the handler
// boundary (T61).
func TestSettingsService_UpdateModelConfig_ContextWindowBoundaries(t *testing.T) {
	tests := []struct {
		name          string
		contextWindow int
		wantErr       bool
	}{
		{name: "just below min is rejected", contextWindow: 1023, wantErr: true},
		{name: "exact min is accepted", contextWindow: 1024, wantErr: false},
		{name: "exact max is accepted", contextWindow: 200000, wantErr: false},
		{name: "just above max is rejected", contextWindow: 200001, wantErr: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := newRepo(t)
			svc := settings.NewSettingsService(newTestLogger(t), repo, stubFileUtils{})

			_, err := svc.UpdateModelConfig(&settings.ModelConfig{
				Name:             "gpt-4o",
				UseContextWindow: true,
				ContextWindow:    tt.contextWindow,
			})

			if (err != nil) != tt.wantErr {
				t.Fatalf("UpdateModelConfig() error = %v, wantErr %v", err, tt.wantErr)
			}
			if !tt.wantErr {
				return
			}
			var ae *apperr.AppError
			if !errors.As(err, &ae) {
				t.Fatalf("want *apperr.AppError, got %T: %v", err, err)
			}
			if ae.Code != apperr.CodeValidation {
				t.Errorf("expected CodeValidation, got %q", ae.Code)
			}
		})
	}
}

// T62 regression: MaxOutputTokens must validate independently of ContextWindow —
// it is a separate field with its own 1-32000 range, never derived from it.
func TestSettingsService_UpdateModelConfig_MaxOutputTokensBoundaries(t *testing.T) {
	tests := []struct {
		name            string
		maxOutputTokens int
		wantErr         bool
	}{
		{name: "just below min is rejected", maxOutputTokens: 0, wantErr: true},
		{name: "exact min is accepted", maxOutputTokens: 1, wantErr: false},
		{name: "exact max is accepted", maxOutputTokens: 32000, wantErr: false},
		{name: "just above max is rejected", maxOutputTokens: 32001, wantErr: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := newRepo(t)
			svc := settings.NewSettingsService(newTestLogger(t), repo, stubFileUtils{})

			_, err := svc.UpdateModelConfig(&settings.ModelConfig{
				Name:               "gpt-4o",
				UseMaxOutputTokens: true,
				MaxOutputTokens:    tt.maxOutputTokens,
			})

			if (err != nil) != tt.wantErr {
				t.Fatalf("UpdateModelConfig() error = %v, wantErr %v", err, tt.wantErr)
			}
			if !tt.wantErr {
				return
			}
			var ae *apperr.AppError
			if !errors.As(err, &ae) {
				t.Fatalf("want *apperr.AppError, got %T: %v", err, err)
			}
			if ae.Code != apperr.CodeValidation {
				t.Errorf("expected CodeValidation, got %q", ae.Code)
			}
		})
	}
}

// Regression: when both UseContextWindow and UseMaxOutputTokens are enabled,
// MaxOutputTokens must be strictly less than ContextWindow — a chain prompt
// budget cannot allow the max-output reservation to consume (or exceed) the
// entire context window.
func TestSettingsService_UpdateModelConfig_MaxOutputTokensVsContextWindow(t *testing.T) {
	tests := []struct {
		name               string
		useContextWindow   bool
		contextWindow      int
		useMaxOutputTokens bool
		maxOutputTokens    int
		wantErr            bool
	}{
		{
			name:               "both enabled, maxOutputTokens greater than contextWindow is rejected",
			useContextWindow:   true,
			contextWindow:      4096,
			useMaxOutputTokens: true,
			maxOutputTokens:    8192,
			wantErr:            true,
		},
		{
			name:               "both enabled, equal values is rejected",
			useContextWindow:   true,
			contextWindow:      4096,
			useMaxOutputTokens: true,
			maxOutputTokens:    4096,
			wantErr:            true,
		},
		{
			name:               "both enabled, one less than contextWindow is accepted",
			useContextWindow:   true,
			contextWindow:      4096,
			useMaxOutputTokens: true,
			maxOutputTokens:    4095,
			wantErr:            false,
		},
		{
			name:               "only maxOutputTokens enabled, cross-check does not apply",
			useContextWindow:   false,
			contextWindow:      0,
			useMaxOutputTokens: true,
			maxOutputTokens:    32000,
			wantErr:            false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := newRepo(t)
			svc := settings.NewSettingsService(newTestLogger(t), repo, stubFileUtils{})

			_, err := svc.UpdateModelConfig(&settings.ModelConfig{
				Name:               "gpt-4o",
				UseContextWindow:   tt.useContextWindow,
				ContextWindow:      tt.contextWindow,
				UseMaxOutputTokens: tt.useMaxOutputTokens,
				MaxOutputTokens:    tt.maxOutputTokens,
			})

			if (err != nil) != tt.wantErr {
				t.Fatalf("UpdateModelConfig() error = %v, wantErr %v", err, tt.wantErr)
			}
			if !tt.wantErr {
				return
			}
			var ae *apperr.AppError
			if !errors.As(err, &ae) {
				t.Fatalf("want *apperr.AppError, got %T: %v", err, err)
			}
			if ae.Code != apperr.CodeValidation {
				t.Errorf("expected CodeValidation, got %q", ae.Code)
			}
		})
	}
}

// ensuringFileUtils returns an existing temp dir from EnsureAppLogsFolderExists
// and a deliberately non-existent path from ResolveAppLogsFolderPath, so a test
// can verify which one GetAppSettingsMetadata uses for the logs folder.
type ensuringFileUtils struct {
	ensuredDir     string
	nonExistentDir string
}

func (ensuringFileUtils) GetAppSettingsFolderPath() (string, error) { return "/cfg", nil }
func (ensuringFileUtils) GetAppDatabaseFilePath() (string, error)   { return "/cfg/gotext.db", nil }
func (f ensuringFileUtils) ResolveAppLogsFolderPath(string) (string, error) {
	return f.nonExistentDir, nil
}
func (f ensuringFileUtils) EnsureAppLogsFolderExists(string) (string, error) {
	return f.ensuredDir, nil
}

// Regression: GetAppSettingsMetadata must return a logs folder that exists on
// disk. Previously it called ResolveAppLogsFolderPath (which never creates the
// directory), so the "Open logs folder" action failed OpenPath's os.Stat check
// with an "Invalid path" validation error when file logging was disabled.
func TestSettingsService_GetAppSettingsMetadata_LogsFolderExists(t *testing.T) {
	// Arrange
	ensured := filepath.Join(t.TempDir(), "logs")
	if err := os.MkdirAll(ensured, 0o700); err != nil {
		t.Fatalf("setup logs dir: %v", err)
	}
	fileUtils := ensuringFileUtils{
		ensuredDir:     ensured,
		nonExistentDir: filepath.Join(t.TempDir(), "does-not-exist"),
	}
	svc := settings.NewSettingsService(newTestLogger(t), newRepo(t), fileUtils)

	// Act
	meta, err := svc.GetAppSettingsMetadata()

	// Assert
	if err != nil {
		t.Fatalf("GetAppSettingsMetadata: %v", err)
	}
	if meta.LogsFolder != ensured {
		t.Errorf("expected logs folder from EnsureAppLogsFolderExists %q, got %q", ensured, meta.LogsFolder)
	}
	if _, statErr := os.Stat(meta.LogsFolder); statErr != nil {
		t.Errorf("logs folder must exist on disk, os.Stat failed: %v", statErr)
	}
}

// SaveWindowSize must reject any dimension below the app's minimum native
// window size (830x550, kept in sync with MinimalWidth/MinimalHeight in
// main.go) with a classified apperr.CodeValidation error.
func TestSettingsService_SaveWindowSize_RejectsBelowMinimum(t *testing.T) {
	tests := []struct {
		name   string
		width  int
		height int
	}{
		{name: "zero width and height", width: 0, height: 0},
		{name: "width one below minimum", width: 829, height: 550},
		{name: "height one below minimum", width: 830, height: 549},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := newRepo(t)
			svc := settings.NewSettingsService(newTestLogger(t), repo, stubFileUtils{})

			err := svc.SaveWindowSize(tt.width, tt.height)

			if err == nil {
				t.Fatalf("SaveWindowSize(%d, %d) = nil, want validation error", tt.width, tt.height)
			}
			var ae *apperr.AppError
			if !errors.As(err, &ae) {
				t.Fatalf("want *apperr.AppError, got %T: %v", err, err)
			}
			if ae.Code != apperr.CodeValidation {
				t.Errorf("expected CodeValidation, got %q", ae.Code)
			}
		})
	}
}

// SaveWindowSize must accept any dimension at or above the minimum and
// persist it through to the repository.
func TestSettingsService_SaveWindowSize_AcceptsValidSize(t *testing.T) {
	tests := []struct {
		name   string
		width  int
		height int
	}{
		{name: "exact minimum", width: 830, height: 550},
		{name: "well above minimum", width: 1600, height: 900},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := newRepo(t)
			svc := settings.NewSettingsService(newTestLogger(t), repo, stubFileUtils{})

			if err := svc.SaveWindowSize(tt.width, tt.height); err != nil {
				t.Fatalf("SaveWindowSize(%d, %d): %v", tt.width, tt.height, err)
			}

			got, err := svc.GetWindowSizeConfig()
			if err != nil {
				t.Fatalf("GetWindowSizeConfig: %v", err)
			}
			if got.Width != tt.width {
				t.Errorf("persisted Width: want %d, got %d", tt.width, got.Width)
			}
			if got.Height != tt.height {
				t.Errorf("persisted Height: want %d, got %d", tt.height, got.Height)
			}
		})
	}
}

// T84 regression: an empty providerId must surface as apperr.CodeValidation,
// not a raw fmt.Errorf that apperr.ToWire logs as unclassified.
func TestSettingsService_GetProviderConfig_RejectsEmptyProviderId(t *testing.T) {
	repo := newRepo(t)
	svc := settings.NewSettingsService(newTestLogger(t), repo, stubFileUtils{})

	_, err := svc.GetProviderConfig("")

	if err == nil {
		t.Fatal("GetProviderConfig(\"\") = nil, want validation error")
	}
	var ae *apperr.AppError
	if !errors.As(err, &ae) {
		t.Fatalf("want *apperr.AppError, got %T: %v", err, err)
	}
	if ae.Code != apperr.CodeValidation {
		t.Errorf("expected CodeValidation, got %q", ae.Code)
	}
}

// T84 regression: an empty providerId must surface as apperr.CodeValidation.
func TestSettingsService_DeleteProviderConfig_RejectsEmptyProviderId(t *testing.T) {
	repo := newRepo(t)
	svc := settings.NewSettingsService(newTestLogger(t), repo, stubFileUtils{})

	err := svc.DeleteProviderConfig("")

	if err == nil {
		t.Fatal("DeleteProviderConfig(\"\") = nil, want validation error")
	}
	var ae *apperr.AppError
	if !errors.As(err, &ae) {
		t.Fatalf("want *apperr.AppError, got %T: %v", err, err)
	}
	if ae.Code != apperr.CodeValidation {
		t.Errorf("expected CodeValidation, got %q", ae.Code)
	}
}

// T84 regression: an empty providerId must surface as apperr.CodeValidation.
func TestSettingsService_SetAsCurrentProviderConfig_RejectsEmptyProviderId(t *testing.T) {
	repo := newRepo(t)
	svc := settings.NewSettingsService(newTestLogger(t), repo, stubFileUtils{})

	_, err := svc.SetAsCurrentProviderConfig("")

	if err == nil {
		t.Fatal("SetAsCurrentProviderConfig(\"\") = nil, want validation error")
	}
	var ae *apperr.AppError
	if !errors.As(err, &ae) {
		t.Fatalf("want *apperr.AppError, got %T: %v", err, err)
	}
	if ae.Code != apperr.CodeValidation {
		t.Errorf("expected CodeValidation, got %q", ae.Code)
	}
}

// T84 regression: an out-of-range Timeout must surface as apperr.CodeValidation.
func TestSettingsService_UpdateInferenceBaseConfig_TimeoutBoundaries(t *testing.T) {
	tests := []struct {
		name    string
		timeout int
		wantErr bool
	}{
		{name: "negative is rejected", timeout: -5, wantErr: true},
		{name: "zero is rejected", timeout: 0, wantErr: true},
		{name: "exact min is accepted", timeout: 1, wantErr: false},
		{name: "exact max is accepted", timeout: 600, wantErr: false},
		{name: "just above max is rejected", timeout: 601, wantErr: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := newRepo(t)
			svc := settings.NewSettingsService(newTestLogger(t), repo, stubFileUtils{})

			_, err := svc.UpdateInferenceBaseConfig(&settings.InferenceBaseConfig{
				Timeout:    tt.timeout,
				MaxRetries: 0,
			})

			if (err != nil) != tt.wantErr {
				t.Fatalf("UpdateInferenceBaseConfig() error = %v, wantErr %v", err, tt.wantErr)
			}
			if !tt.wantErr {
				return
			}
			var ae *apperr.AppError
			if !errors.As(err, &ae) {
				t.Fatalf("want *apperr.AppError, got %T: %v", err, err)
			}
			if ae.Code != apperr.CodeValidation {
				t.Errorf("expected CodeValidation, got %q", ae.Code)
			}
		})
	}
}

// T84 regression: an out-of-range MaxRetries must surface as
// apperr.CodeValidation (live repro used maxRetries: 15).
func TestSettingsService_UpdateInferenceBaseConfig_MaxRetriesBoundaries(t *testing.T) {
	tests := []struct {
		name       string
		maxRetries int
		wantErr    bool
	}{
		{name: "negative is rejected", maxRetries: -1, wantErr: true},
		{name: "exact min is accepted", maxRetries: 0, wantErr: false},
		{name: "exact max is accepted", maxRetries: 10, wantErr: false},
		{name: "just above max is rejected", maxRetries: 11, wantErr: true},
		{name: "live bug repro value is rejected", maxRetries: 15, wantErr: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := newRepo(t)
			svc := settings.NewSettingsService(newTestLogger(t), repo, stubFileUtils{})

			_, err := svc.UpdateInferenceBaseConfig(&settings.InferenceBaseConfig{
				Timeout:    60,
				MaxRetries: tt.maxRetries,
			})

			if (err != nil) != tt.wantErr {
				t.Fatalf("UpdateInferenceBaseConfig() error = %v, wantErr %v", err, tt.wantErr)
			}
			if !tt.wantErr {
				return
			}
			var ae *apperr.AppError
			if !errors.As(err, &ae) {
				t.Fatalf("want *apperr.AppError, got %T: %v", err, err)
			}
			if ae.Code != apperr.CodeValidation {
				t.Errorf("expected CodeValidation, got %q", ae.Code)
			}
		})
	}
}

// T91 regression: an out-of-range HistoryMaxEntries must be rejected with
// apperr.CodeValidation instead of being silently clamped into range.
func TestSettingsService_UpdateAppBehaviorConfig_HistoryMaxEntriesBoundaries(t *testing.T) {
	tests := []struct {
		name              string
		historyMaxEntries int
		wantErr           bool
	}{
		{name: "just below min is rejected", historyMaxEntries: 9, wantErr: true},
		{name: "exact min is accepted", historyMaxEntries: 10, wantErr: false},
		{name: "exact max is accepted", historyMaxEntries: 1000, wantErr: false},
		{name: "just above max is rejected", historyMaxEntries: 1001, wantErr: true},
		{name: "zero is rejected", historyMaxEntries: 0, wantErr: true},
		{name: "negative is rejected", historyMaxEntries: -5, wantErr: true},
		{name: "typical mid-range value is accepted", historyMaxEntries: 100, wantErr: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := newRepo(t)
			svc := settings.NewSettingsService(newTestLogger(t), repo, stubFileUtils{})

			got, err := svc.UpdateAppBehaviorConfig(&settings.AppBehaviorConfig{
				EnableTaskLogging: false,
				HistoryEnabled:    true,
				HistoryMaxEntries: tt.historyMaxEntries,
			})

			if (err != nil) != tt.wantErr {
				t.Fatalf("UpdateAppBehaviorConfig() error = %v, wantErr %v", err, tt.wantErr)
			}
			if !tt.wantErr {
				if got.HistoryMaxEntries != tt.historyMaxEntries {
					t.Errorf("HistoryMaxEntries = %d, want %d (must not be silently substituted)", got.HistoryMaxEntries, tt.historyMaxEntries)
				}
				return
			}
			var ae *apperr.AppError
			if !errors.As(err, &ae) {
				t.Fatalf("want *apperr.AppError, got %T: %v", err, err)
			}
			if ae.Code != apperr.CodeValidation {
				t.Errorf("expected CodeValidation, got %q", ae.Code)
			}
		})
	}
}

// T84 regression: an empty (or whitespace-only, after TrimSpace) language must
// surface as apperr.CodeValidation.
func TestSettingsService_SetDefaultInputLanguage_RejectsEmptyLanguage(t *testing.T) {
	tests := []struct {
		name     string
		language string
	}{
		{name: "empty string", language: ""},
		{name: "whitespace only", language: "   "},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := newRepo(t)
			svc := settings.NewSettingsService(newTestLogger(t), repo, stubFileUtils{})

			err := svc.SetDefaultInputLanguage(tt.language)

			if err == nil {
				t.Fatalf("SetDefaultInputLanguage(%q) = nil, want validation error", tt.language)
			}
			var ae *apperr.AppError
			if !errors.As(err, &ae) {
				t.Fatalf("want *apperr.AppError, got %T: %v", err, err)
			}
			if ae.Code != apperr.CodeValidation {
				t.Errorf("expected CodeValidation, got %q", ae.Code)
			}
		})
	}
}

// T84 regression: a language absent from the configured supported list must
// surface as apperr.CodeValidation; a seeded default language must succeed.
func TestSettingsService_SetDefaultInputLanguage_RejectsUnsupportedLanguage(t *testing.T) {
	tests := []struct {
		name     string
		language string
		wantErr  bool
	}{
		{name: "unsupported language is rejected", language: "Klingon", wantErr: true},
		{name: "seeded default language is accepted", language: "English", wantErr: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := newRepo(t)
			svc := settings.NewSettingsService(newTestLogger(t), repo, stubFileUtils{})

			err := svc.SetDefaultInputLanguage(tt.language)

			if (err != nil) != tt.wantErr {
				t.Fatalf("SetDefaultInputLanguage(%q) error = %v, wantErr %v", tt.language, err, tt.wantErr)
			}
			if !tt.wantErr {
				return
			}
			var ae *apperr.AppError
			if !errors.As(err, &ae) {
				t.Fatalf("want *apperr.AppError, got %T: %v", err, err)
			}
			if ae.Code != apperr.CodeValidation {
				t.Errorf("expected CodeValidation, got %q", ae.Code)
			}
		})
	}
}

// T84 regression: an empty (or whitespace-only) language must surface as
// apperr.CodeValidation.
func TestSettingsService_SetDefaultOutputLanguage_RejectsEmptyLanguage(t *testing.T) {
	tests := []struct {
		name     string
		language string
	}{
		{name: "empty string", language: ""},
		{name: "whitespace only", language: "   "},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := newRepo(t)
			svc := settings.NewSettingsService(newTestLogger(t), repo, stubFileUtils{})

			err := svc.SetDefaultOutputLanguage(tt.language)

			if err == nil {
				t.Fatalf("SetDefaultOutputLanguage(%q) = nil, want validation error", tt.language)
			}
			var ae *apperr.AppError
			if !errors.As(err, &ae) {
				t.Fatalf("want *apperr.AppError, got %T: %v", err, err)
			}
			if ae.Code != apperr.CodeValidation {
				t.Errorf("expected CodeValidation, got %q", ae.Code)
			}
		})
	}
}

// T84 regression: a language absent from the configured supported list must
// surface as apperr.CodeValidation; a seeded default language must succeed.
func TestSettingsService_SetDefaultOutputLanguage_RejectsUnsupportedLanguage(t *testing.T) {
	tests := []struct {
		name     string
		language string
		wantErr  bool
	}{
		{name: "unsupported language is rejected", language: "Klingon", wantErr: true},
		{name: "seeded default language is accepted", language: "Ukrainian", wantErr: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := newRepo(t)
			svc := settings.NewSettingsService(newTestLogger(t), repo, stubFileUtils{})

			err := svc.SetDefaultOutputLanguage(tt.language)

			if (err != nil) != tt.wantErr {
				t.Fatalf("SetDefaultOutputLanguage(%q) error = %v, wantErr %v", tt.language, err, tt.wantErr)
			}
			if !tt.wantErr {
				return
			}
			var ae *apperr.AppError
			if !errors.As(err, &ae) {
				t.Fatalf("want *apperr.AppError, got %T: %v", err, err)
			}
			if ae.Code != apperr.CodeValidation {
				t.Errorf("expected CodeValidation, got %q", ae.Code)
			}
		})
	}
}

// T84 regression: an empty language must surface as apperr.CodeValidation.
func TestSettingsService_AddLanguage_RejectsEmptyLanguage(t *testing.T) {
	repo := newRepo(t)
	svc := settings.NewSettingsService(newTestLogger(t), repo, stubFileUtils{})

	_, err := svc.AddLanguage("")

	if err == nil {
		t.Fatal("AddLanguage(\"\") = nil, want validation error")
	}
	var ae *apperr.AppError
	if !errors.As(err, &ae) {
		t.Fatalf("want *apperr.AppError, got %T: %v", err, err)
	}
	if ae.Code != apperr.CodeValidation {
		t.Errorf("expected CodeValidation, got %q", ae.Code)
	}
}

// T84 regression: an empty language must surface as apperr.CodeValidation.
func TestSettingsService_RemoveLanguage_RejectsEmptyLanguage(t *testing.T) {
	repo := newRepo(t)
	svc := settings.NewSettingsService(newTestLogger(t), repo, stubFileUtils{})

	_, err := svc.RemoveLanguage("")

	if err == nil {
		t.Fatal("RemoveLanguage(\"\") = nil, want validation error")
	}
	var ae *apperr.AppError
	if !errors.As(err, &ae) {
		t.Fatalf("want *apperr.AppError, got %T: %v", err, err)
	}
	if ae.Code != apperr.CodeValidation {
		t.Errorf("expected CodeValidation, got %q", ae.Code)
	}
}

// T84 regression: removing the current default input language must surface as
// apperr.CodeValidation, read live from the repo so the test tracks the seed.
func TestSettingsService_RemoveLanguage_RejectsRemovingDefaultInputLanguage(t *testing.T) {
	repo := newRepo(t)
	svc := settings.NewSettingsService(newTestLogger(t), repo, stubFileUtils{})

	langCfg, err := repo.GetLanguageConfig()
	if err != nil {
		t.Fatalf("GetLanguageConfig: %v", err)
	}

	_, err = svc.RemoveLanguage(langCfg.DefaultInputLanguage)

	if err == nil {
		t.Fatalf("RemoveLanguage(%q) = nil, want validation error", langCfg.DefaultInputLanguage)
	}
	var ae *apperr.AppError
	if !errors.As(err, &ae) {
		t.Fatalf("want *apperr.AppError, got %T: %v", err, err)
	}
	if ae.Code != apperr.CodeValidation {
		t.Errorf("expected CodeValidation, got %q", ae.Code)
	}
	// Finding #5 (2026-07-05 live testing report): the message must read forward
	// ("is the default and cannot be removed"), not backward ("not the default").
	if !strings.Contains(ae.Message, "cannot be removed") {
		t.Errorf("expected message to explain the language cannot be removed, got %q", ae.Message)
	}
	if strings.HasPrefix(ae.Message, "language not") {
		t.Errorf("message reads backwards (implies rejection because it is NOT the default): %q", ae.Message)
	}
}

// T84 regression (P4-T3 live repro): removing the current default output
// language must surface as apperr.CodeValidation. A genuinely non-default
// language must still be addable and removable without error.
func TestSettingsService_RemoveLanguage_RejectsRemovingDefaultOutputLanguage(t *testing.T) {
	repo := newRepo(t)
	svc := settings.NewSettingsService(newTestLogger(t), repo, stubFileUtils{})

	langCfg, err := repo.GetLanguageConfig()
	if err != nil {
		t.Fatalf("GetLanguageConfig: %v", err)
	}

	_, err = svc.RemoveLanguage(langCfg.DefaultOutputLanguage)

	if err == nil {
		t.Fatalf("RemoveLanguage(%q) = nil, want validation error", langCfg.DefaultOutputLanguage)
	}
	var ae *apperr.AppError
	if !errors.As(err, &ae) {
		t.Fatalf("want *apperr.AppError, got %T: %v", err, err)
	}
	if ae.Code != apperr.CodeValidation {
		t.Errorf("expected CodeValidation, got %q", ae.Code)
	}
	// Finding #5 (2026-07-05 live testing report): same forward-reading wording check as the
	// default-input-language case above.
	if !strings.Contains(ae.Message, "cannot be removed") {
		t.Errorf("expected message to explain the language cannot be removed, got %q", ae.Message)
	}
	if strings.HasPrefix(ae.Message, "language not") {
		t.Errorf("message reads backwards (implies rejection because it is NOT the default): %q", ae.Message)
	}

	if _, err := svc.AddLanguage("Klingon"); err != nil {
		t.Fatalf("AddLanguage(\"Klingon\"): %v", err)
	}
	if _, err := svc.RemoveLanguage("Klingon"); err != nil {
		t.Fatalf("RemoveLanguage(\"Klingon\"): %v", err)
	}
}

// deleteAllProviders removes every provider currently in the repo, so tests
// that need deterministic provider-reassignment behavior are not affected by
// the two seeded default providers ("Ollama" and "LM Studio").
func deleteAllProviders(t *testing.T, repo *settings.SqliteSettingsRepository) {
	t.Helper()
	providers, err := repo.ListProviders()
	if err != nil {
		t.Fatalf("ListProviders: %v", err)
	}
	for _, p := range providers {
		if err := repo.DeleteProvider(p.ID); err != nil {
			t.Fatalf("DeleteProvider(%q): %v", p.ID, err)
		}
	}
}

// Finding #1 regression: a live model pick made via UpdateModelConfig while a
// provider is current must survive a round trip through switching to another
// provider and back. Before the fix, UpdateModelConfig never persists the
// pick onto the current provider's SelectedModel column, so switching away
// and back re-syncs the active model from the provider's stale
// (pre-live-pick) SelectedModel value, silently discarding the user's choice.
func TestSettingsService_ProviderSwitchRoundTrip_PreservesLiveSelectedModel(t *testing.T) {
	repo := newRepo(t)
	deleteAllProviders(t, repo)
	svc := settings.NewSettingsService(newTestLogger(t), repo, stubFileUtils{})

	providerA, err := repo.CreateProvider(&settings.ProviderConfig{
		Name:          "Provider A",
		Kind:          "ollama",
		BaseURL:       "http://127.0.0.1:11434/",
		AuthScheme:    "none",
		SelectedModel: "",
		CustomModels:  []string{},
	})
	if err != nil {
		t.Fatalf("CreateProvider(A): %v", err)
	}
	providerB, err := repo.CreateProvider(&settings.ProviderConfig{
		Name:          "Provider B",
		Kind:          "lmstudio",
		BaseURL:       "http://127.0.0.1:1234/",
		AuthScheme:    "none",
		SelectedModel: "model-b",
		CustomModels:  []string{},
	})
	if err != nil {
		t.Fatalf("CreateProvider(B): %v", err)
	}

	if _, err := svc.SetAsCurrentProviderConfig(providerA.ID); err != nil {
		t.Fatalf("SetAsCurrentProviderConfig(A): %v", err)
	}

	// Simulate a live AppBar model pick for provider A.
	if _, err := svc.UpdateModelConfig(&settings.ModelConfig{Name: "model-a-live"}); err != nil {
		t.Fatalf("UpdateModelConfig(model-a-live): %v", err)
	}

	// Switch away to B and back to A.
	if _, err := svc.SetAsCurrentProviderConfig(providerB.ID); err != nil {
		t.Fatalf("SetAsCurrentProviderConfig(B): %v", err)
	}
	if _, err := svc.SetAsCurrentProviderConfig(providerA.ID); err != nil {
		t.Fatalf("SetAsCurrentProviderConfig(A) again: %v", err)
	}

	got, err := repo.GetModelConfig()
	if err != nil {
		t.Fatalf("GetModelConfig: %v", err)
	}
	if got.Name != "model-a-live" {
		t.Errorf("expected live model pick to survive provider switch round trip, want %q, got %q", "model-a-live", got.Name)
	}
}

// Finding #1 regression (narrow unit check): UpdateModelConfig must persist
// the picked model onto the current provider's SelectedModel column, not just
// the global model.name KV setting. Before the fix, UpdateModelConfig never
// touches providers.selected_model at all.
func TestSettingsService_UpdateModelConfig_SyncsSelectedModelToCurrentProvider(t *testing.T) {
	repo := newRepo(t)
	deleteAllProviders(t, repo)
	svc := settings.NewSettingsService(newTestLogger(t), repo, stubFileUtils{})

	providerA, err := repo.CreateProvider(&settings.ProviderConfig{
		Name:          "Provider A",
		Kind:          "ollama",
		BaseURL:       "http://127.0.0.1:11434/",
		AuthScheme:    "none",
		SelectedModel: "",
		CustomModels:  []string{},
	})
	if err != nil {
		t.Fatalf("CreateProvider(A): %v", err)
	}
	if _, err := svc.SetAsCurrentProviderConfig(providerA.ID); err != nil {
		t.Fatalf("SetAsCurrentProviderConfig(A): %v", err)
	}

	if _, err := svc.UpdateModelConfig(&settings.ModelConfig{Name: "picked-model"}); err != nil {
		t.Fatalf("UpdateModelConfig(picked-model): %v", err)
	}

	got, err := repo.GetProvider(providerA.ID)
	if err != nil {
		t.Fatalf("GetProvider(A): %v", err)
	}
	if got.SelectedModel != "picked-model" {
		t.Errorf("expected current provider's SelectedModel synced to %q, got %q", "picked-model", got.SelectedModel)
	}
}

// Finding #2 regression: deleting the current provider must reassign both
// app_state.current_provider_id AND the global active model to the newly
// current provider's SelectedModel. Before the fix, DeleteProviderConfig only
// calls repository.DeleteProvider (which repoints current_provider_id) and
// never resyncs model.name, leaving a stale model name that does not exist on
// the new current provider — the exact model_not_found failure mode from the
// live testing report.
func TestSettingsService_DeleteProviderConfig_ReassignsAndSyncsModel(t *testing.T) {
	repo := newRepo(t)
	deleteAllProviders(t, repo)
	svc := settings.NewSettingsService(newTestLogger(t), repo, stubFileUtils{})

	providerA, err := repo.CreateProvider(&settings.ProviderConfig{
		Name:          "Provider A",
		Kind:          "ollama",
		BaseURL:       "http://127.0.0.1:11434/",
		AuthScheme:    "none",
		SelectedModel: "model-a",
		CustomModels:  []string{},
	})
	if err != nil {
		t.Fatalf("CreateProvider(A): %v", err)
	}
	providerB, err := repo.CreateProvider(&settings.ProviderConfig{
		Name:          "Provider B",
		Kind:          "lmstudio",
		BaseURL:       "http://127.0.0.1:1234/",
		AuthScheme:    "none",
		SelectedModel: "model-b",
		CustomModels:  []string{},
	})
	if err != nil {
		t.Fatalf("CreateProvider(B): %v", err)
	}

	// Make B current; this also syncs the active model to "model-b".
	if _, err := svc.SetAsCurrentProviderConfig(providerB.ID); err != nil {
		t.Fatalf("SetAsCurrentProviderConfig(B): %v", err)
	}

	if err := svc.DeleteProviderConfig(providerB.ID); err != nil {
		t.Fatalf("DeleteProviderConfig(B): %v", err)
	}

	current, err := repo.GetCurrentProvider()
	if err != nil {
		t.Fatalf("GetCurrentProvider: %v", err)
	}
	if current == nil || current.ID != providerA.ID {
		t.Fatalf("expected current provider to be reassigned to A (%q), got %+v", providerA.ID, current)
	}

	got, err := repo.GetModelConfig()
	if err != nil {
		t.Fatalf("GetModelConfig: %v", err)
	}
	if got.Name != "model-a" {
		t.Errorf("expected active model resynced to new current provider's SelectedModel %q, got %q", "model-a", got.Name)
	}
}

// Edge case: deleting every provider (including the current one) must leave
// the active model cleared, not stuck on a name from a provider that no
// longer exists.
func TestSettingsService_DeleteProviderConfig_LastProvider_ClearsModel(t *testing.T) {
	repo := newRepo(t)
	deleteAllProviders(t, repo)
	svc := settings.NewSettingsService(newTestLogger(t), repo, stubFileUtils{})

	providerA, err := repo.CreateProvider(&settings.ProviderConfig{
		Name:          "Provider A",
		Kind:          "ollama",
		BaseURL:       "http://127.0.0.1:11434/",
		AuthScheme:    "none",
		SelectedModel: "model-a",
		CustomModels:  []string{},
	})
	if err != nil {
		t.Fatalf("CreateProvider(A): %v", err)
	}

	if _, err := svc.SetAsCurrentProviderConfig(providerA.ID); err != nil {
		t.Fatalf("SetAsCurrentProviderConfig(A): %v", err)
	}

	if err := svc.DeleteProviderConfig(providerA.ID); err != nil {
		t.Fatalf("DeleteProviderConfig(A): %v", err)
	}

	got, err := repo.GetModelConfig()
	if err != nil {
		t.Fatalf("GetModelConfig: %v", err)
	}
	if got.Name != "" {
		t.Errorf("expected active model cleared after deleting last provider, got %q", got.Name)
	}
}

// ── AppBarVisibilityConfig passthrough ──────────────────────────────────────

// Regression: GetAppBarVisibilityConfig/UpdateAppBarVisibilityConfig must be
// plain passthroughs to the repository (no service-level validation), and a
// round trip through the real SQLite repo must preserve every field.
func TestSettingsService_AppBarVisibilityConfig_PassthroughRoundTrip(t *testing.T) {
	t.Parallel()
	repo := newRepo(t)
	svc := settings.NewSettingsService(newTestLogger(t), repo, stubFileUtils{})

	cfg := &settings.AppBarVisibilityConfig{
		ProviderModelSelectors: false,
		LanguagePicker:         true,
		OutputFormatToggle:     false,
		OutputModeToggle:       true,
		LayoutToggle:           false,
		CommandPaletteButton:   true,
		HistoryButton:          false,
		InfoButton:             true,
	}

	updated, err := svc.UpdateAppBarVisibilityConfig(cfg)
	if err != nil {
		t.Fatalf("UpdateAppBarVisibilityConfig: %v", err)
	}
	if *updated != *cfg {
		t.Errorf("UpdateAppBarVisibilityConfig return: want %+v, got %+v", cfg, updated)
	}

	got, err := svc.GetAppBarVisibilityConfig()
	if err != nil {
		t.Fatalf("GetAppBarVisibilityConfig: %v", err)
	}
	if *got != *cfg {
		t.Errorf("GetAppBarVisibilityConfig after update: want %+v, got %+v", cfg, got)
	}
}

// ── LastSelectionConfig passthrough + validation ────────────────────────────

// Regression: GetLastSelectionConfig/UpdateLastSelectionConfig must round trip
// through the real SQLite repo for every valid Kind value.
func TestSettingsService_LastSelectionConfig_PassthroughRoundTrip(t *testing.T) {
	tests := []struct {
		name string
		cfg  *settings.LastSelectionConfig
	}{
		{name: "stack", cfg: &settings.LastSelectionConfig{Kind: "stack", StackID: "stack-1"}},
		{name: "action", cfg: &settings.LastSelectionConfig{Kind: "action", ActionID: "action-1"}},
		{name: "none", cfg: &settings.LastSelectionConfig{Kind: "none"}},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			repo := newRepo(t)
			svc := settings.NewSettingsService(newTestLogger(t), repo, stubFileUtils{})

			updated, err := svc.UpdateLastSelectionConfig(tt.cfg)
			if err != nil {
				t.Fatalf("UpdateLastSelectionConfig: %v", err)
			}
			if *updated != *tt.cfg {
				t.Errorf("UpdateLastSelectionConfig return: want %+v, got %+v", tt.cfg, updated)
			}

			got, err := svc.GetLastSelectionConfig()
			if err != nil {
				t.Fatalf("GetLastSelectionConfig: %v", err)
			}
			if *got != *tt.cfg {
				t.Errorf("GetLastSelectionConfig after update: want %+v, got %+v", tt.cfg, got)
			}
		})
	}
}

// Regression: UpdateLastSelectionConfig must reject any Kind outside
// action|stack|none with apperr.CodeValidation, mirroring the enum validation
// style used by UpdateUIPreferencesConfig's theme/layout/viewMode checks.
func TestSettingsService_UpdateLastSelectionConfig_ValidatesKind(t *testing.T) {
	tests := []struct {
		name    string
		kind    string
		wantErr bool
	}{
		{name: "valid_action", kind: "action", wantErr: false},
		{name: "valid_stack", kind: "stack", wantErr: false},
		{name: "valid_none", kind: "none", wantErr: false},
		{name: "invalid_empty", kind: "", wantErr: true},
		{name: "invalid_unknown", kind: "bogus", wantErr: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			repo := newRepo(t)
			svc := settings.NewSettingsService(newTestLogger(t), repo, stubFileUtils{})

			_, err := svc.UpdateLastSelectionConfig(&settings.LastSelectionConfig{Kind: tt.kind})

			if (err != nil) != tt.wantErr {
				t.Fatalf("UpdateLastSelectionConfig(kind=%q) error = %v, wantErr %v", tt.kind, err, tt.wantErr)
			}
			if !tt.wantErr {
				return
			}
			var ae *apperr.AppError
			if !errors.As(err, &ae) {
				t.Fatalf("want *apperr.AppError, got %T: %v", err, err)
			}
			if ae.Code != apperr.CodeValidation {
				t.Errorf("expected CodeValidation, got %q", ae.Code)
			}
		})
	}
}

// ── ClearLastSelectionIfStack ────────────────────────────────────────────────

// Regression: deleting the stack currently referenced by the last-selection
// pointer must reset it to {Kind: "none"}.
func TestSettingsService_ClearLastSelectionIfStack_ClearsMatchingStack(t *testing.T) {
	t.Parallel()
	repo := newRepo(t)
	svc := settings.NewSettingsService(newTestLogger(t), repo, stubFileUtils{})

	if err := repo.UpdateLastSelectionConfig(&settings.LastSelectionConfig{Kind: "stack", StackID: "stack-1"}); err != nil {
		t.Fatalf("seed UpdateLastSelectionConfig: %v", err)
	}

	if err := svc.ClearLastSelectionIfStack("stack-1"); err != nil {
		t.Fatalf("ClearLastSelectionIfStack: %v", err)
	}

	got, err := repo.GetLastSelectionConfig()
	if err != nil {
		t.Fatalf("GetLastSelectionConfig: %v", err)
	}
	want := &settings.LastSelectionConfig{Kind: "none"}
	if *got != *want {
		t.Errorf("expected last selection cleared to %+v, got %+v", want, got)
	}
}

// Regression: a last selection pointing at a different stack must be left
// untouched (no-op, no error).
func TestSettingsService_ClearLastSelectionIfStack_LeavesDifferentStackUntouched(t *testing.T) {
	t.Parallel()
	repo := newRepo(t)
	svc := settings.NewSettingsService(newTestLogger(t), repo, stubFileUtils{})

	seeded := &settings.LastSelectionConfig{Kind: "stack", StackID: "stack-1"}
	if err := repo.UpdateLastSelectionConfig(seeded); err != nil {
		t.Fatalf("seed UpdateLastSelectionConfig: %v", err)
	}

	if err := svc.ClearLastSelectionIfStack("stack-2"); err != nil {
		t.Fatalf("ClearLastSelectionIfStack: %v", err)
	}

	got, err := repo.GetLastSelectionConfig()
	if err != nil {
		t.Fatalf("GetLastSelectionConfig: %v", err)
	}
	if *got != *seeded {
		t.Errorf("expected last selection untouched at %+v, got %+v", seeded, got)
	}
}

// Regression: a last selection of Kind "action" must be left untouched
// regardless of the stackID argument passed in.
func TestSettingsService_ClearLastSelectionIfStack_LeavesActionSelectionUntouched(t *testing.T) {
	t.Parallel()
	repo := newRepo(t)
	svc := settings.NewSettingsService(newTestLogger(t), repo, stubFileUtils{})

	seeded := &settings.LastSelectionConfig{Kind: "action", ActionID: "action-1"}
	if err := repo.UpdateLastSelectionConfig(seeded); err != nil {
		t.Fatalf("seed UpdateLastSelectionConfig: %v", err)
	}

	// Passing the action's ActionID as the stackID argument must not match
	// (Kind must be "stack" for a clear to happen).
	if err := svc.ClearLastSelectionIfStack("action-1"); err != nil {
		t.Fatalf("ClearLastSelectionIfStack: %v", err)
	}

	got, err := repo.GetLastSelectionConfig()
	if err != nil {
		t.Fatalf("GetLastSelectionConfig: %v", err)
	}
	if *got != *seeded {
		t.Errorf("expected action selection untouched at %+v, got %+v", seeded, got)
	}
}

// errLastSelectionRepo is a minimal settings.SettingsRepositoryAPI fake used
// only to inject a repository-level failure into ClearLastSelectionIfStack.
// Every method other than the two exercised by the test panics, following
// this file's convention for narrowly-scoped fakes.
type errLastSelectionRepo struct {
	getErr    error
	updateErr error
}

func (r *errLastSelectionRepo) ListProviders() ([]settings.ProviderConfig, error) {
	panic("not implemented in test")
}
func (r *errLastSelectionRepo) GetProvider(_ string) (*settings.ProviderConfig, error) {
	panic("not implemented in test")
}
func (r *errLastSelectionRepo) GetCurrentProvider() (*settings.ProviderConfig, error) {
	panic("not implemented in test")
}
func (r *errLastSelectionRepo) CreateProvider(_ *settings.ProviderConfig) (*settings.ProviderConfig, error) {
	panic("not implemented in test")
}
func (r *errLastSelectionRepo) UpdateProvider(_ *settings.ProviderConfig) (*settings.ProviderConfig, error) {
	panic("not implemented in test")
}
func (r *errLastSelectionRepo) DeleteProvider(_ string) error { panic("not implemented in test") }
func (r *errLastSelectionRepo) SetCurrentProvider(_ string) error {
	panic("not implemented in test")
}
func (r *errLastSelectionRepo) GetInferenceConfig() (*settings.InferenceBaseConfig, error) {
	panic("not implemented in test")
}
func (r *errLastSelectionRepo) UpdateInferenceConfig(_ *settings.InferenceBaseConfig) error {
	panic("not implemented in test")
}
func (r *errLastSelectionRepo) GetModelConfig() (*settings.ModelConfig, error) {
	panic("not implemented in test")
}
func (r *errLastSelectionRepo) UpdateModelConfig(_ *settings.ModelConfig) error {
	panic("not implemented in test")
}
func (r *errLastSelectionRepo) GetAppBehaviorConfig() (*settings.AppBehaviorConfig, error) {
	panic("not implemented in test")
}
func (r *errLastSelectionRepo) UpdateAppBehaviorConfig(_ *settings.AppBehaviorConfig) error {
	panic("not implemented in test")
}
func (r *errLastSelectionRepo) GetUIPreferencesConfig() (*settings.UIPreferencesConfig, error) {
	panic("not implemented in test")
}
func (r *errLastSelectionRepo) UpdateUIPreferencesConfig(_ *settings.UIPreferencesConfig) error {
	panic("not implemented in test")
}
func (r *errLastSelectionRepo) GetAppBarVisibilityConfig() (*settings.AppBarVisibilityConfig, error) {
	panic("not implemented in test")
}
func (r *errLastSelectionRepo) UpdateAppBarVisibilityConfig(_ *settings.AppBarVisibilityConfig) error {
	panic("not implemented in test")
}
func (r *errLastSelectionRepo) GetLastSelectionConfig() (*settings.LastSelectionConfig, error) {
	if r.getErr != nil {
		return nil, r.getErr
	}
	return &settings.LastSelectionConfig{Kind: "stack", StackID: "stack-1"}, nil
}
func (r *errLastSelectionRepo) UpdateLastSelectionConfig(_ *settings.LastSelectionConfig) error {
	return r.updateErr
}
func (r *errLastSelectionRepo) GetLoggingConfig() (*settings.LoggingConfig, error) {
	panic("not implemented in test")
}
func (r *errLastSelectionRepo) UpdateLoggingConfig(_ *settings.LoggingConfig) error {
	panic("not implemented in test")
}
func (r *errLastSelectionRepo) GetWindowSizeConfig() (*settings.WindowSizeConfig, error) {
	panic("not implemented in test")
}
func (r *errLastSelectionRepo) UpdateWindowSizeConfig(_ *settings.WindowSizeConfig) error {
	panic("not implemented in test")
}
func (r *errLastSelectionRepo) GetLanguageConfig() (*settings.LanguageConfig, error) {
	panic("not implemented in test")
}
func (r *errLastSelectionRepo) AddLanguage(_ string) error    { panic("not implemented in test") }
func (r *errLastSelectionRepo) RemoveLanguage(_ string) error { panic("not implemented in test") }
func (r *errLastSelectionRepo) SetDefaultInputLanguage(_ string) error {
	panic("not implemented in test")
}
func (r *errLastSelectionRepo) SetDefaultOutputLanguage(_ string) error {
	panic("not implemented in test")
}
func (r *errLastSelectionRepo) ResetToDefaults() error { panic("not implemented in test") }

// Regression: a repository read failure inside ClearLastSelectionIfStack must
// be propagated to the caller, not swallowed.
func TestSettingsService_ClearLastSelectionIfStack_PropagatesReadError(t *testing.T) {
	t.Parallel()
	wantErr := errors.New("boom: read failure")
	repo := &errLastSelectionRepo{getErr: wantErr}
	svc := settings.NewSettingsService(newTestLogger(t), repo, stubFileUtils{})

	err := svc.ClearLastSelectionIfStack("stack-1")

	if err == nil {
		t.Fatal("ClearLastSelectionIfStack() = nil, want propagated error")
	}
	if !errors.Is(err, wantErr) {
		t.Errorf("expected wrapped %v, got %v", wantErr, err)
	}
}

// Regression: a repository write failure inside ClearLastSelectionIfStack
// must be propagated to the caller, not swallowed.
func TestSettingsService_ClearLastSelectionIfStack_PropagatesWriteError(t *testing.T) {
	t.Parallel()
	wantErr := errors.New("boom: write failure")
	// getErr is nil so GetLastSelectionConfig returns the fake's stack-1
	// default, matching the stackID argument below so the update path runs.
	repo := &errLastSelectionRepo{updateErr: wantErr}
	svc := settings.NewSettingsService(newTestLogger(t), repo, stubFileUtils{})

	err := svc.ClearLastSelectionIfStack("stack-1")

	if err == nil {
		t.Fatal("ClearLastSelectionIfStack() = nil, want propagated error")
	}
	if !errors.Is(err, wantErr) {
		t.Errorf("expected wrapped %v, got %v", wantErr, err)
	}
}
