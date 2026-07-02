package settings_test

import (
	"errors"
	"os"
	"path/filepath"
	"testing"

	"go_text/internal/apperr"
	"go_text/internal/settings"
)

// noopLogger satisfies logger.Logger for service construction.
type noopLogger struct{}

func (noopLogger) Print(string)   {}
func (noopLogger) Trace(string)   {}
func (noopLogger) Debug(string)   {}
func (noopLogger) Info(string)    {}
func (noopLogger) Warning(string) {}
func (noopLogger) Error(string)   {}
func (noopLogger) Fatal(string)   {}

// stubFileUtils satisfies file.FileUtilsServiceAPI; the model-sync path never
// calls it, so every method returns zero values.
type stubFileUtils struct{}

func (stubFileUtils) GetAppSettingsFolderPath() (string, error)        { return "", nil }
func (stubFileUtils) GetAppSettingsFilePath() (string, error)          { return "", nil }
func (stubFileUtils) GetAppDatabaseFilePath() (string, error)          { return "", nil }
func (stubFileUtils) ResolveAppLogsFolderPath(string) (string, error)  { return "", nil }
func (stubFileUtils) EnsureAppLogsFolderExists(string) (string, error) { return "", nil }

// Regression: switching the current provider must sync the active model to the
// newly-current provider's selected model, so a chain run never inherits a
// stale model from the previous provider (caught by live run against Ollama).
func TestSettingsService_SetAsCurrentProviderConfig_SyncsModel(t *testing.T) {
	repo := newRepo(t)
	svc := settings.NewSettingsService(noopLogger{}, repo, stubFileUtils{})

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
			svc := settings.NewSettingsService(noopLogger{}, repo, stubFileUtils{})

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
			svc := settings.NewSettingsService(noopLogger{}, repo, stubFileUtils{})

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
			svc := settings.NewSettingsService(noopLogger{}, repo, stubFileUtils{})

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
func (ensuringFileUtils) GetAppSettingsFilePath() (string, error)   { return "/cfg/SettingsV2.json", nil }
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
	svc := settings.NewSettingsService(noopLogger{}, newRepo(t), fileUtils)

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
			svc := settings.NewSettingsService(noopLogger{}, repo, stubFileUtils{})

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
			svc := settings.NewSettingsService(noopLogger{}, repo, stubFileUtils{})

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
