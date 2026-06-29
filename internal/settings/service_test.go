package settings_test

import (
	"os"
	"path/filepath"
	"testing"

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
