package settings

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"go_text/internal/apperr"
	"go_text/internal/db"
	"go_text/internal/db/store"

	"github.com/google/uuid"
)

// SqliteSettingsRepository implements SettingsRepositoryAPI using the SQLite
// database opened by internal/db. It uses context.Background() for all DB calls
// because Wails bound callers supply no context.
type SqliteSettingsRepository struct {
	database *db.Database
}

// NewSqliteSettingsRepository constructs a SqliteSettingsRepository.
// database must not be nil.
func NewSqliteSettingsRepository(database *db.Database) *SqliteSettingsRepository {
	if database == nil {
		panic("SqliteSettingsRepository: database cannot be nil")
	}
	return &SqliteSettingsRepository{database: database}
}

// ── helpers ────────────────────────────────────────────────────────────────

func bg() context.Context { return context.Background() }

func isUniqueViolation(err error) bool {
	return err != nil && strings.Contains(err.Error(), "UNIQUE constraint failed")
}

func providerNotFound(id string) *apperr.AppError {
	return apperr.Validation("providerId", "existing provider ID", id)
}

// rowToProvider converts a store.Provider row to the domain ProviderConfig.
// Headers and CustomModels are stored as JSON strings in the DB.
func rowToProvider(row store.Provider) (ProviderConfig, error) {
	var headers map[string]string
	if err := json.Unmarshal([]byte(row.Headers), &headers); err != nil {
		headers = map[string]string{}
	}
	var customModels []string
	if err := json.Unmarshal([]byte(row.CustomModels), &customModels); err != nil {
		customModels = []string{}
	}
	return ProviderConfig{
		ID:              row.ID,
		Name:            row.Name,
		Kind:            row.Kind,
		BaseURL:         row.BaseUrl,
		AuthScheme:      row.AuthScheme,
		APIKeyEnvVar:    row.ApiKeyEnvVar,
		APIVersion:      row.ApiVersion,
		SelectedModel:   row.SelectedModel,
		CompletionPath:  row.CompletionPath,
		ModelsPath:      row.ModelsPath,
		UseCustomModels: row.UseCustomModels != 0,
		Headers:         headers,
		CustomModels:    customModels,
		CreatedAt:       row.CreatedAt,
		UpdatedAt:       row.UpdatedAt,
	}, nil
}

func marshalHeaders(h map[string]string) string {
	if h == nil {
		return "{}"
	}
	b, err := json.Marshal(h)
	if err != nil {
		return "{}"
	}
	return string(b)
}

func marshalCustomModels(m []string) string {
	if m == nil {
		return "[]"
	}
	b, err := json.Marshal(m)
	if err != nil {
		return "[]"
	}
	return string(b)
}

// getSetting reads a single KV row; returns a zero GetSettingRow on any error.
func (r *SqliteSettingsRepository) getSetting(key string) store.GetSettingRow {
	row, err := r.database.Queries.GetSetting(bg(), key)
	if err != nil {
		return store.GetSettingRow{}
	}
	return row
}

func (r *SqliteSettingsRepository) getBool(key string, def bool) bool {
	v, err := strconv.ParseBool(r.getSetting(key).Value)
	if err != nil {
		return def
	}
	return v
}

func (r *SqliteSettingsRepository) getInt(key string, def int) int {
	v, err := strconv.Atoi(r.getSetting(key).Value)
	if err != nil {
		return def
	}
	return v
}

func (r *SqliteSettingsRepository) getFloat(key string, def float64) float64 {
	v, err := strconv.ParseFloat(r.getSetting(key).Value, 64)
	if err != nil {
		return def
	}
	return v
}

func (r *SqliteSettingsRepository) getString(key string, def string) string {
	v := r.getSetting(key).Value
	if v == "" {
		return def
	}
	return v
}

func (r *SqliteSettingsRepository) upsert(key, value, typ string) error {
	return r.database.Queries.UpsertSetting(bg(), store.UpsertSettingParams{
		Key:   key,
		Value: value,
		Type:  typ,
	})
}

func boolToInt(b bool) int64 {
	if b {
		return 1
	}
	return 0
}

// ── Provider CRUD ──────────────────────────────────────────────────────────

func (r *SqliteSettingsRepository) ListProviders() ([]ProviderConfig, error) {
	rows, err := r.database.Queries.ListProviders(bg())
	if err != nil {
		return nil, apperr.Internal(fmt.Errorf("ListProviders: %w", err))
	}
	out := make([]ProviderConfig, 0, len(rows))
	for _, row := range rows {
		p, err := rowToProvider(row)
		if err != nil {
			return nil, apperr.Internal(fmt.Errorf("rowToProvider: %w", err))
		}
		out = append(out, p)
	}
	return out, nil
}

func (r *SqliteSettingsRepository) GetProvider(id string) (*ProviderConfig, error) {
	row, err := r.database.Queries.GetProvider(bg(), id)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, providerNotFound(id)
	}
	if err != nil {
		return nil, apperr.Internal(fmt.Errorf("GetProvider: %w", err))
	}
	p, err := rowToProvider(row)
	if err != nil {
		return nil, apperr.Internal(err)
	}
	return &p, nil
}

func (r *SqliteSettingsRepository) GetCurrentProvider() (*ProviderConfig, error) {
	nullID, err := r.database.Queries.GetCurrentProviderID(bg())
	if errors.Is(err, sql.ErrNoRows) || !nullID.Valid || nullID.String == "" {
		return nil, nil
	}
	if err != nil {
		return nil, apperr.Internal(fmt.Errorf("GetCurrentProviderID: %w", err))
	}
	return r.GetProvider(nullID.String)
}

func (r *SqliteSettingsRepository) CreateProvider(cfg *ProviderConfig) (*ProviderConfig, error) {
	now := time.Now().Unix()
	cfg.ID = uuid.NewString()
	cfg.CreatedAt = now
	cfg.UpdatedAt = now

	err := r.database.Queries.CreateProvider(bg(), store.CreateProviderParams{
		ID:              cfg.ID,
		Name:            cfg.Name,
		Kind:            cfg.Kind,
		BaseUrl:         cfg.BaseURL,
		AuthScheme:      cfg.AuthScheme,
		ApiKeyEnvVar:    cfg.APIKeyEnvVar,
		ApiVersion:      cfg.APIVersion,
		SelectedModel:   cfg.SelectedModel,
		CompletionPath:  cfg.CompletionPath,
		ModelsPath:      cfg.ModelsPath,
		UseCustomModels: boolToInt(cfg.UseCustomModels),
		Headers:         marshalHeaders(cfg.Headers),
		CustomModels:    marshalCustomModels(cfg.CustomModels),
		CreatedAt:       cfg.CreatedAt,
		UpdatedAt:       cfg.UpdatedAt,
	})
	if isUniqueViolation(err) {
		return nil, apperr.Validation("name", "unique provider name", cfg.Name+" (already exists)")
	}
	if err != nil {
		return nil, apperr.Internal(fmt.Errorf("CreateProvider: %w", err))
	}
	return cfg, nil
}

func (r *SqliteSettingsRepository) UpdateProvider(cfg *ProviderConfig) (*ProviderConfig, error) {
	cfg.UpdatedAt = time.Now().Unix()
	err := r.database.Queries.UpdateProvider(bg(), store.UpdateProviderParams{
		Name:            cfg.Name,
		Kind:            cfg.Kind,
		BaseUrl:         cfg.BaseURL,
		AuthScheme:      cfg.AuthScheme,
		ApiKeyEnvVar:    cfg.APIKeyEnvVar,
		ApiVersion:      cfg.APIVersion,
		SelectedModel:   cfg.SelectedModel,
		CompletionPath:  cfg.CompletionPath,
		ModelsPath:      cfg.ModelsPath,
		UseCustomModels: boolToInt(cfg.UseCustomModels),
		Headers:         marshalHeaders(cfg.Headers),
		CustomModels:    marshalCustomModels(cfg.CustomModels),
		UpdatedAt:       cfg.UpdatedAt,
		ID:              cfg.ID,
	})
	if isUniqueViolation(err) {
		return nil, apperr.Validation("name", "unique provider name", cfg.Name+" (already exists)")
	}
	if err != nil {
		return nil, apperr.Internal(fmt.Errorf("UpdateProvider: %w", err))
	}
	return r.GetProvider(cfg.ID)
}

// DeleteProvider deletes the provider and, if it was the current provider,
// repoints app_state to the first remaining provider (or NULL).
// Runs in a transaction.
func (r *SqliteSettingsRepository) DeleteProvider(id string) error {
	ctx := bg()
	tx, err := r.database.DB.BeginTx(ctx, nil)
	if err != nil {
		return apperr.Internal(fmt.Errorf("DeleteProvider begin tx: %w", err))
	}
	defer func() { _ = tx.Rollback() }()

	q := r.database.Queries.WithTx(tx)

	currentID, err := q.GetCurrentProviderID(ctx)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return apperr.Internal(fmt.Errorf("DeleteProvider: get current: %w", err))
	}
	if currentID.Valid && currentID.String == id {
		allProviders, err := q.ListProviders(ctx)
		if err != nil {
			return apperr.Internal(fmt.Errorf("DeleteProvider: list providers: %w", err))
		}
		var newCurrent sql.NullString
		for _, p := range allProviders {
			if p.ID != id {
				newCurrent = sql.NullString{String: p.ID, Valid: true}
				break
			}
		}
		if err := q.SetCurrentProviderID(ctx, newCurrent); err != nil {
			return apperr.Internal(fmt.Errorf("DeleteProvider: repoint current: %w", err))
		}
	}

	if err := q.DeleteProvider(ctx, id); err != nil {
		return apperr.Internal(fmt.Errorf("DeleteProvider: delete: %w", err))
	}
	return tx.Commit()
}

func (r *SqliteSettingsRepository) SetCurrentProvider(id string) error {
	err := r.database.Queries.SetCurrentProviderID(bg(), sql.NullString{String: id, Valid: true})
	if err != nil {
		return apperr.Internal(fmt.Errorf("SetCurrentProvider: %w", err))
	}
	return nil
}

// ── KV configuration groups ────────────────────────────────────────────────

func (r *SqliteSettingsRepository) GetInferenceConfig() (*InferenceBaseConfig, error) {
	return &InferenceBaseConfig{
		Timeout:              r.getInt("inference.timeout", 60),
		MaxRetries:           r.getInt("inference.maxRetries", 3),
		UseMarkdownForOutput: r.getBool("inference.useMarkdownForOutput", false),
	}, nil
}

func (r *SqliteSettingsRepository) UpdateInferenceConfig(cfg *InferenceBaseConfig) error {
	rows := []store.UpsertSettingParams{
		{Key: "inference.timeout", Value: strconv.Itoa(cfg.Timeout), Type: "int"},
		{Key: "inference.maxRetries", Value: strconv.Itoa(cfg.MaxRetries), Type: "int"},
		{Key: "inference.useMarkdownForOutput", Value: strconv.FormatBool(cfg.UseMarkdownForOutput), Type: "bool"},
	}
	for _, row := range rows {
		if err := r.database.Queries.UpsertSetting(bg(), row); err != nil {
			return apperr.Internal(fmt.Errorf("UpdateInferenceConfig %q: %w", row.Key, err))
		}
	}
	return nil
}

func (r *SqliteSettingsRepository) GetModelConfig() (*ModelConfig, error) {
	return &ModelConfig{
		Name:               r.getString("model.name", ""),
		UseTemperature:     r.getBool("model.useTemperature", true),
		Temperature:        r.getFloat("model.temperature", 0.5),
		UseContextWindow:   r.getBool("model.useContextWindow", false),
		ContextWindow:      r.getInt("model.contextWindow", 4096),
		UseLegacyMaxTokens: r.getBool("model.useLegacyMaxTokens", false),
		UseMaxOutputTokens: r.getBool("model.useMaxOutputTokens", false),
		MaxOutputTokens:    r.getInt("model.maxOutputTokens", 2048),
	}, nil
}

func (r *SqliteSettingsRepository) UpdateModelConfig(cfg *ModelConfig) error {
	rows := []store.UpsertSettingParams{
		{Key: "model.name", Value: cfg.Name, Type: "string"},
		{Key: "model.useTemperature", Value: strconv.FormatBool(cfg.UseTemperature), Type: "bool"},
		{Key: "model.temperature", Value: strconv.FormatFloat(cfg.Temperature, 'f', -1, 64), Type: "float"},
		{Key: "model.useContextWindow", Value: strconv.FormatBool(cfg.UseContextWindow), Type: "bool"},
		{Key: "model.contextWindow", Value: strconv.Itoa(cfg.ContextWindow), Type: "int"},
		{Key: "model.useLegacyMaxTokens", Value: strconv.FormatBool(cfg.UseLegacyMaxTokens), Type: "bool"},
		{Key: "model.useMaxOutputTokens", Value: strconv.FormatBool(cfg.UseMaxOutputTokens), Type: "bool"},
		{Key: "model.maxOutputTokens", Value: strconv.Itoa(cfg.MaxOutputTokens), Type: "int"},
	}
	for _, row := range rows {
		if err := r.database.Queries.UpsertSetting(bg(), row); err != nil {
			return apperr.Internal(fmt.Errorf("UpdateModelConfig %q: %w", row.Key, err))
		}
	}
	return nil
}

func (r *SqliteSettingsRepository) GetAppBehaviorConfig() (*AppBehaviorConfig, error) {
	return &AppBehaviorConfig{
		EnableTaskLogging: r.getBool("app.enableTaskLogging", false),
		HistoryEnabled:    r.getBool("history.enabled", true),
		HistoryMaxEntries: r.getInt("history.maxEntries", 100),
	}, nil
}

func (r *SqliteSettingsRepository) UpdateAppBehaviorConfig(cfg *AppBehaviorConfig) error {
	rows := []store.UpsertSettingParams{
		{Key: "app.enableTaskLogging", Value: strconv.FormatBool(cfg.EnableTaskLogging), Type: "bool"},
		{Key: "history.enabled", Value: strconv.FormatBool(cfg.HistoryEnabled), Type: "bool"},
		{Key: "history.maxEntries", Value: strconv.Itoa(cfg.HistoryMaxEntries), Type: "int"},
	}
	for _, row := range rows {
		if err := r.database.Queries.UpsertSetting(bg(), row); err != nil {
			return apperr.Internal(fmt.Errorf("UpdateAppBehaviorConfig %q: %w", row.Key, err))
		}
	}
	return nil
}

func (r *SqliteSettingsRepository) GetUIPreferencesConfig() (*UIPreferencesConfig, error) {
	return &UIPreferencesConfig{
		Theme:            r.getString("ui.theme", "auto"),
		Layout:           r.getString("ui.layout", "side"),
		SidebarCollapsed: r.getBool("ui.sidebarCollapsed", false),
		HistoryOpen:      r.getBool("ui.historyOpen", false),
		ViewMode:         r.getString("ui.viewMode", "preview"),
	}, nil
}

func (r *SqliteSettingsRepository) UpdateUIPreferencesConfig(cfg *UIPreferencesConfig) error {
	rows := []store.UpsertSettingParams{
		{Key: "ui.theme", Value: cfg.Theme, Type: "string"},
		{Key: "ui.layout", Value: cfg.Layout, Type: "string"},
		{Key: "ui.sidebarCollapsed", Value: strconv.FormatBool(cfg.SidebarCollapsed), Type: "bool"},
		{Key: "ui.historyOpen", Value: strconv.FormatBool(cfg.HistoryOpen), Type: "bool"},
		{Key: "ui.viewMode", Value: cfg.ViewMode, Type: "string"},
	}
	for _, row := range rows {
		if err := r.database.Queries.UpsertSetting(bg(), row); err != nil {
			return apperr.Internal(fmt.Errorf("UpdateUIPreferencesConfig %q: %w", row.Key, err))
		}
	}
	return nil
}

func (r *SqliteSettingsRepository) GetAppBarVisibilityConfig() (*AppBarVisibilityConfig, error) {
	return &AppBarVisibilityConfig{
		ProviderModelSelectors: r.getBool("ui.appbar.providerModelSelectors", true),
		LanguagePicker:         r.getBool("ui.appbar.languagePicker", true),
		OutputFormatToggle:     r.getBool("ui.appbar.outputFormatToggle", true),
		OutputModeToggle:       r.getBool("ui.appbar.outputModeToggle", true),
		LayoutToggle:           r.getBool("ui.appbar.layoutToggle", true),
		CommandPaletteButton:   r.getBool("ui.appbar.commandPaletteButton", true),
		HistoryButton:          r.getBool("ui.appbar.historyButton", true),
		InfoButton:             r.getBool("ui.appbar.infoButton", true),
	}, nil
}

func (r *SqliteSettingsRepository) UpdateAppBarVisibilityConfig(cfg *AppBarVisibilityConfig) error {
	rows := []store.UpsertSettingParams{
		{Key: "ui.appbar.providerModelSelectors", Value: strconv.FormatBool(cfg.ProviderModelSelectors), Type: "bool"},
		{Key: "ui.appbar.languagePicker", Value: strconv.FormatBool(cfg.LanguagePicker), Type: "bool"},
		{Key: "ui.appbar.outputFormatToggle", Value: strconv.FormatBool(cfg.OutputFormatToggle), Type: "bool"},
		{Key: "ui.appbar.outputModeToggle", Value: strconv.FormatBool(cfg.OutputModeToggle), Type: "bool"},
		{Key: "ui.appbar.layoutToggle", Value: strconv.FormatBool(cfg.LayoutToggle), Type: "bool"},
		{Key: "ui.appbar.commandPaletteButton", Value: strconv.FormatBool(cfg.CommandPaletteButton), Type: "bool"},
		{Key: "ui.appbar.historyButton", Value: strconv.FormatBool(cfg.HistoryButton), Type: "bool"},
		{Key: "ui.appbar.infoButton", Value: strconv.FormatBool(cfg.InfoButton), Type: "bool"},
	}
	for _, row := range rows {
		if err := r.database.Queries.UpsertSetting(bg(), row); err != nil {
			return apperr.Internal(fmt.Errorf("UpdateAppBarVisibilityConfig %q: %w", row.Key, err))
		}
	}
	return nil
}

func (r *SqliteSettingsRepository) GetLastSelectionConfig() (*LastSelectionConfig, error) {
	return &LastSelectionConfig{
		Kind:     r.getString("ui.lastSelection.kind", "none"),
		ActionID: r.getString("ui.lastSelection.actionId", ""),
		StackID:  r.getString("ui.lastSelection.stackId", ""),
	}, nil
}

func (r *SqliteSettingsRepository) UpdateLastSelectionConfig(cfg *LastSelectionConfig) error {
	rows := []store.UpsertSettingParams{
		{Key: "ui.lastSelection.kind", Value: cfg.Kind, Type: "string"},
		{Key: "ui.lastSelection.actionId", Value: cfg.ActionID, Type: "string"},
		{Key: "ui.lastSelection.stackId", Value: cfg.StackID, Type: "string"},
	}
	for _, row := range rows {
		if err := r.database.Queries.UpsertSetting(bg(), row); err != nil {
			return apperr.Internal(fmt.Errorf("UpdateLastSelectionConfig %q: %w", row.Key, err))
		}
	}
	return nil
}

func (r *SqliteSettingsRepository) GetWindowSizeConfig() (*WindowSizeConfig, error) {
	return &WindowSizeConfig{
		Width:  r.getInt("window.width", 830),  // must match main.go MinimalWidth
		Height: r.getInt("window.height", 550), // must match main.go MinimalHeight
	}, nil
}

func (r *SqliteSettingsRepository) UpdateWindowSizeConfig(cfg *WindowSizeConfig) error {
	rows := []store.UpsertSettingParams{
		{Key: "window.width", Value: strconv.Itoa(cfg.Width), Type: "int"},
		{Key: "window.height", Value: strconv.Itoa(cfg.Height), Type: "int"},
	}
	for _, row := range rows {
		if err := r.database.Queries.UpsertSetting(bg(), row); err != nil {
			return apperr.Internal(fmt.Errorf("UpdateWindowSizeConfig %q: %w", row.Key, err))
		}
	}
	return nil
}

func (r *SqliteSettingsRepository) GetLoggingConfig() (*LoggingConfig, error) {
	return &LoggingConfig{
		LogFileEnabled: r.getBool("log.fileEnabled", false),
		LogLevel:       r.getString("log.level", ""),
		LogDirectory:   r.getString("log.directory", ""),
		LogMaxSizeMB:   r.getInt("log.maxSizeMB", 10),
		LogMaxBackups:  r.getInt("log.maxBackups", 5),
		LogMaxAgeDays:  r.getInt("log.maxAgeDays", 30),
		LogCompress:    r.getBool("log.compress", false),
	}, nil
}

func (r *SqliteSettingsRepository) UpdateLoggingConfig(cfg *LoggingConfig) error {
	rows := []store.UpsertSettingParams{
		{Key: "log.fileEnabled", Value: strconv.FormatBool(cfg.LogFileEnabled), Type: "bool"},
		{Key: "log.level", Value: cfg.LogLevel, Type: "string"},
		{Key: "log.directory", Value: cfg.LogDirectory, Type: "string"},
		{Key: "log.maxSizeMB", Value: strconv.Itoa(cfg.LogMaxSizeMB), Type: "int"},
		{Key: "log.maxBackups", Value: strconv.Itoa(cfg.LogMaxBackups), Type: "int"},
		{Key: "log.maxAgeDays", Value: strconv.Itoa(cfg.LogMaxAgeDays), Type: "int"},
		{Key: "log.compress", Value: strconv.FormatBool(cfg.LogCompress), Type: "bool"},
	}
	for _, row := range rows {
		if err := r.database.Queries.UpsertSetting(bg(), row); err != nil {
			return apperr.Internal(fmt.Errorf("UpdateLoggingConfig %q: %w", row.Key, err))
		}
	}
	return nil
}

// ── Languages ──────────────────────────────────────────────────────────────

func (r *SqliteSettingsRepository) GetLanguageConfig() (*LanguageConfig, error) {
	// ListLanguages returns []string directly.
	names, err := r.database.Queries.ListLanguages(bg())
	if err != nil {
		return nil, apperr.Internal(fmt.Errorf("ListLanguages: %w", err))
	}
	if names == nil {
		names = []string{}
	}
	return &LanguageConfig{
		Languages:             names,
		DefaultInputLanguage:  r.getString("lang.defaultInput", "English"),
		DefaultOutputLanguage: r.getString("lang.defaultOutput", "Ukrainian"),
	}, nil
}

func (r *SqliteSettingsRepository) AddLanguage(name string) error {
	err := r.database.Queries.AddLanguage(bg(), store.AddLanguageParams{Name: name, SortOrder: 0})
	if err != nil {
		return apperr.Internal(fmt.Errorf("AddLanguage: %w", err))
	}
	return nil
}

func (r *SqliteSettingsRepository) RemoveLanguage(name string) error {
	err := r.database.Queries.RemoveLanguage(bg(), name)
	if err != nil {
		return apperr.Internal(fmt.Errorf("RemoveLanguage: %w", err))
	}
	return nil
}

func (r *SqliteSettingsRepository) SetDefaultInputLanguage(name string) error {
	return r.upsert("lang.defaultInput", name, "string")
}

func (r *SqliteSettingsRepository) SetDefaultOutputLanguage(name string) error {
	return r.upsert("lang.defaultOutput", name, "string")
}

// ── Factory reset ──────────────────────────────────────────────────────────

// ResetToDefaults wipes all entity and settings tables and reseeds defaults.
func (r *SqliteSettingsRepository) ResetToDefaults() error {
	if err := r.database.Seed(bg()); err != nil {
		return apperr.Internal(fmt.Errorf("ResetToDefaults: %w", err))
	}
	return nil
}
