package settings_test

import (
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
