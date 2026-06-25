package settings_test

import (
	"path/filepath"
	"testing"

	"go_text/internal/db"
	"go_text/internal/settings"
)

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

func newRepo(t *testing.T) *settings.SqliteSettingsRepository {
	t.Helper()
	return settings.NewSqliteSettingsRepository(openTestDB(t))
}

// ── Provider CRUD ──────────────────────────────────────────────────────────

func TestSqliteSettingsRepository_Provider_CRUD(t *testing.T) {
	repo := newRepo(t)

	providers, err := repo.ListProviders()
	if err != nil {
		t.Fatalf("ListProviders: %v", err)
	}
	if len(providers) == 0 {
		t.Fatal("expected seeded providers, got none")
	}

	cfg := &settings.ProviderConfig{
		Name:           "TestProvider",
		Kind:           "openai",
		BaseURL:        "https://example.com/",
		AuthScheme:     "bearer",
		APIKeyEnvVar:   "TEST_KEY",
		CompletionPath: "v1/chat/completions",
		ModelsPath:     "v1/models",
		Headers:        map[string]string{"X-Test": "1"},
		CustomModels:   []string{},
	}
	created, err := repo.CreateProvider(cfg)
	if err != nil {
		t.Fatalf("CreateProvider: %v", err)
	}
	if created.ID == "" {
		t.Error("expected created provider to have an ID")
	}

	got, err := repo.GetProvider(created.ID)
	if err != nil {
		t.Fatalf("GetProvider: %v", err)
	}
	if got.Name != "TestProvider" {
		t.Errorf("Name: want TestProvider, got %s", got.Name)
	}
	if got.Headers["X-Test"] != "1" {
		t.Errorf("Headers: want X-Test=1, got %v", got.Headers)
	}

	got.Name = "UpdatedProvider"
	updated, err := repo.UpdateProvider(got)
	if err != nil {
		t.Fatalf("UpdateProvider: %v", err)
	}
	if updated.Name != "UpdatedProvider" {
		t.Errorf("after update: want UpdatedProvider, got %s", updated.Name)
	}

	if err := repo.DeleteProvider(created.ID); err != nil {
		t.Fatalf("DeleteProvider: %v", err)
	}
	if _, err := repo.GetProvider(created.ID); err == nil {
		t.Error("expected not-found error after delete, got nil")
	}
}

func TestSqliteSettingsRepository_UniqueNameConflict(t *testing.T) {
	repo := newRepo(t)

	// "Ollama" is seeded — try to create a duplicate.
	cfg := &settings.ProviderConfig{
		Name:           "Ollama",
		Kind:           "ollama",
		BaseURL:        "http://127.0.0.1:11434/",
		AuthScheme:     "none",
		CompletionPath: "v1/chat/completions",
		ModelsPath:     "v1/models",
	}
	_, err := repo.CreateProvider(cfg)
	if err == nil {
		t.Fatal("expected unique name conflict error, got nil")
	}
}

// ── Current-provider repoint ───────────────────────────────────────────────

func TestSqliteSettingsRepository_DeleteCurrentProvider_Repoints(t *testing.T) {
	repo := newRepo(t)

	current, err := repo.GetCurrentProvider()
	if err != nil || current == nil {
		t.Fatalf("GetCurrentProvider: err=%v, current=%v", err, current)
	}
	currentID := current.ID

	if err := repo.DeleteProvider(currentID); err != nil {
		t.Fatalf("DeleteProvider: %v", err)
	}

	newCurrent, err := repo.GetCurrentProvider()
	if err != nil {
		t.Fatalf("GetCurrentProvider after delete: %v", err)
	}
	if newCurrent != nil && newCurrent.ID == currentID {
		t.Error("current provider should have been repointed away from the deleted one")
	}
}

func TestSqliteSettingsRepository_DeleteLastProvider_SetsNullCurrent(t *testing.T) {
	repo := newRepo(t)

	providers, err := repo.ListProviders()
	if err != nil {
		t.Fatalf("ListProviders: %v", err)
	}

	// Delete all providers except the last.
	for i, p := range providers {
		if i < len(providers)-1 {
			if err := repo.DeleteProvider(p.ID); err != nil {
				t.Fatalf("DeleteProvider[%d]: %v", i, err)
			}
		}
	}
	last := providers[len(providers)-1]
	if err := repo.SetCurrentProvider(last.ID); err != nil {
		t.Fatalf("SetCurrentProvider: %v", err)
	}
	if err := repo.DeleteProvider(last.ID); err != nil {
		t.Fatalf("DeleteProvider last: %v", err)
	}

	newCurrent, err := repo.GetCurrentProvider()
	if err != nil {
		t.Fatalf("GetCurrentProvider after all deleted: %v", err)
	}
	if newCurrent != nil {
		t.Errorf("expected nil current after last provider deleted, got %+v", newCurrent)
	}
}

// ── KV config round-trips ──────────────────────────────────────────────────

func TestSqliteSettingsRepository_InferenceConfig_RoundTrip(t *testing.T) {
	repo := newRepo(t)

	want := &settings.InferenceBaseConfig{Timeout: 120, MaxRetries: 5, UseMarkdownForOutput: true}
	if err := repo.UpdateInferenceConfig(want); err != nil {
		t.Fatalf("UpdateInferenceConfig: %v", err)
	}
	got, err := repo.GetInferenceConfig()
	if err != nil {
		t.Fatalf("GetInferenceConfig: %v", err)
	}
	if got.Timeout != 120 || got.MaxRetries != 5 || !got.UseMarkdownForOutput {
		t.Errorf("round-trip mismatch: want %+v, got %+v", want, got)
	}
}

func TestSqliteSettingsRepository_ModelConfig_RoundTrip(t *testing.T) {
	repo := newRepo(t)

	want := &settings.ModelConfig{
		Name:               "llama3",
		UseTemperature:     true,
		Temperature:        0.7,
		UseContextWindow:   true,
		ContextWindow:      8192,
		UseLegacyMaxTokens: false,
	}
	if err := repo.UpdateModelConfig(want); err != nil {
		t.Fatalf("UpdateModelConfig: %v", err)
	}
	got, err := repo.GetModelConfig()
	if err != nil {
		t.Fatalf("GetModelConfig: %v", err)
	}
	if got.Name != want.Name || got.Temperature != want.Temperature || got.ContextWindow != want.ContextWindow {
		t.Errorf("ModelConfig round-trip mismatch: want %+v, got %+v", want, got)
	}
}

func TestSqliteSettingsRepository_LoggingConfig_RoundTrip(t *testing.T) {
	repo := newRepo(t)

	want := &settings.LoggingConfig{
		LogFileEnabled: true,
		LogLevel:       "debug",
		LogDirectory:   "/tmp/testlogs",
		LogMaxSizeMB:   20,
		LogMaxBackups:  3,
		LogMaxAgeDays:  14,
		LogCompress:    true,
	}
	if err := repo.UpdateLoggingConfig(want); err != nil {
		t.Fatalf("UpdateLoggingConfig: %v", err)
	}
	got, err := repo.GetLoggingConfig()
	if err != nil {
		t.Fatalf("GetLoggingConfig: %v", err)
	}
	if *got != *want {
		t.Errorf("LoggingConfig round-trip mismatch:\nwant %+v\n got %+v", want, got)
	}
}

func TestSqliteSettingsRepository_AppBehaviorConfig_RoundTrip(t *testing.T) {
	repo := newRepo(t)

	want := &settings.AppBehaviorConfig{EnableTaskLogging: true, HistoryEnabled: false, HistoryMaxEntries: 50}
	if err := repo.UpdateAppBehaviorConfig(want); err != nil {
		t.Fatalf("UpdateAppBehaviorConfig: %v", err)
	}
	got, err := repo.GetAppBehaviorConfig()
	if err != nil {
		t.Fatalf("GetAppBehaviorConfig: %v", err)
	}
	if *got != *want {
		t.Errorf("AppBehaviorConfig round-trip mismatch: want %+v, got %+v", want, got)
	}
}

// ── Languages ──────────────────────────────────────────────────────────────

func TestSqliteSettingsRepository_Languages(t *testing.T) {
	repo := newRepo(t)

	langCfg, err := repo.GetLanguageConfig()
	if err != nil {
		t.Fatalf("GetLanguageConfig: %v", err)
	}
	if len(langCfg.Languages) == 0 {
		t.Fatal("expected seeded languages, got none")
	}

	// AddLanguage — idempotent (ON CONFLICT DO NOTHING).
	if err := repo.AddLanguage("Klingon"); err != nil {
		t.Fatalf("AddLanguage: %v", err)
	}
	if err := repo.AddLanguage("Klingon"); err != nil {
		t.Fatalf("AddLanguage idempotent: %v", err)
	}
	cfg2, err := repo.GetLanguageConfig()
	if err != nil {
		t.Fatalf("GetLanguageConfig after add: %v", err)
	}
	count := 0
	for _, l := range cfg2.Languages {
		if l == "Klingon" {
			count++
		}
	}
	if count != 1 {
		t.Errorf("expected Klingon to appear exactly once, got %d", count)
	}

	if err := repo.RemoveLanguage("Klingon"); err != nil {
		t.Fatalf("RemoveLanguage: %v", err)
	}

	// SetDefaultInputLanguage to a seeded language.
	if err := repo.SetDefaultInputLanguage(langCfg.Languages[0]); err != nil {
		t.Fatalf("SetDefaultInputLanguage: %v", err)
	}
	cfg3, err := repo.GetLanguageConfig()
	if err != nil {
		t.Fatalf("GetLanguageConfig after set default: %v", err)
	}
	if cfg3.DefaultInputLanguage != langCfg.Languages[0] {
		t.Errorf("want DefaultInputLanguage=%s, got %s", langCfg.Languages[0], cfg3.DefaultInputLanguage)
	}
}

// ── Factory reset ──────────────────────────────────────────────────────────

func TestSqliteSettingsRepository_ResetToDefaults(t *testing.T) {
	repo := newRepo(t)

	// Mutate inference config.
	if err := repo.UpdateInferenceConfig(&settings.InferenceBaseConfig{Timeout: 999}); err != nil {
		t.Fatalf("UpdateInferenceConfig: %v", err)
	}

	// Reset.
	if err := repo.ResetToDefaults(); err != nil {
		t.Fatalf("ResetToDefaults: %v", err)
	}

	// Inference config returns to seed default.
	got, err := repo.GetInferenceConfig()
	if err != nil {
		t.Fatalf("GetInferenceConfig after reset: %v", err)
	}
	if got.Timeout == 999 {
		t.Error("after reset, Timeout should not still be 999")
	}

	// Providers are reseeded.
	providers, err := repo.ListProviders()
	if err != nil {
		t.Fatalf("ListProviders after reset: %v", err)
	}
	if len(providers) == 0 {
		t.Error("expected providers after reset, got none")
	}
}
