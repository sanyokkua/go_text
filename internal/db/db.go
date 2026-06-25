package db

import (
	"context"
	"database/sql"
	"embed"
	"fmt"
	"io/fs"
	"time"

	"github.com/google/uuid"
	"github.com/pressly/goose/v3"
	_ "modernc.org/sqlite"

	"go_text/internal/db/store"
)

//go:embed migrations/*.sql
var migrationsFS embed.FS

const (
	defaultCompletionPath = "v1/chat/completions"
	defaultModelsPath     = "v1/models"
)

// Database holds the open connection and the sqlc query interface.
// Both fields are exported so repositories can begin transactions
// (DB.BeginTx) and use the generated query layer (Queries.WithTx).
type Database struct {
	DB       *sql.DB
	Queries  *store.Queries
	provider *goose.Provider
}

// Open opens gotext.db at dbPath, applies all pending migrations, and
// seeds default data when the database is new (providers table empty).
// Returns an error if open, migrate, or seed fails — the caller should
// treat any error as fatal (never run half-initialized).
func Open(dbPath string) (*Database, error) {
	const op = "db.Open"

	sqlDB, err := openWithPragmas(dbPath)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", op, err)
	}

	d := &Database{
		DB:      sqlDB,
		Queries: store.New(sqlDB),
	}

	if err := d.migrate(); err != nil {
		_ = sqlDB.Close()
		return nil, fmt.Errorf("%s: migrate: %w", op, err)
	}

	if err := d.seedIfEmpty(); err != nil {
		_ = sqlDB.Close()
		return nil, fmt.Errorf("%s: seed: %w", op, err)
	}

	return d, nil
}

// Close releases the underlying database connection.
func (d *Database) Close() error {
	return d.DB.Close()
}

// openWithPragmas opens the SQLite file at path with the required WAL
// pragmas and restricts the connection pool to a single writer.
func openWithPragmas(path string) (*sql.DB, error) {
	dsn := fmt.Sprintf(
		"file:%s?_pragma=busy_timeout(5000)&_pragma=journal_mode(WAL)&_pragma=foreign_keys(ON)&_pragma=synchronous(NORMAL)",
		path,
	)

	db, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, fmt.Errorf("open sqlite: %w", err)
	}

	// Single writer: avoids "database is locked" for single-user desktop use.
	db.SetMaxOpenConns(1)
	db.SetConnMaxIdleTime(5 * time.Minute)

	if err := db.Ping(); err != nil {
		_ = db.Close()
		return nil, fmt.Errorf("ping sqlite: %w", err)
	}

	return db, nil
}

// migrate applies all pending goose Up migrations from the embedded FS.
func (d *Database) migrate() error {
	fsys, err := fs.Sub(migrationsFS, "migrations")
	if err != nil {
		return fmt.Errorf("sub migrations fs: %w", err)
	}

	provider, err := goose.NewProvider(goose.DialectSQLite3, d.DB, fsys)
	if err != nil {
		return fmt.Errorf("create goose provider: %w", err)
	}
	d.provider = provider

	results, err := provider.Up(context.Background())
	if err != nil {
		return fmt.Errorf("apply migrations: %w", err)
	}

	for _, r := range results {
		if r.Error != nil {
			return fmt.Errorf("migration %s: %w", r.Source.Path, r.Error)
		}
	}

	return nil
}

// seedIfEmpty is called from Open; inserts all defaults when the DB is new.
// "New" is detected by providers count = 0.
func (d *Database) seedIfEmpty() error {
	count, err := d.Queries.CountProviders(context.Background())
	if err != nil {
		return fmt.Errorf("db.seedIfEmpty: count providers: %w", err)
	}
	if count > 0 {
		return nil
	}
	return d.Seed(context.Background())
}

// Seed wipes all entity and settings tables, then reseeds defaults in a
// single transaction. This is the factory-reset operation.
func (d *Database) Seed(ctx context.Context) error {
	tx, err := d.DB.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("db.Seed: begin tx: %w", err)
	}
	defer func() { _ = tx.Rollback() }()

	if err := wipeAllTables(ctx, tx); err != nil {
		return fmt.Errorf("db.Seed: wipe: %w", err)
	}

	q := d.Queries.WithTx(tx)

	ollamaID, err := seedProviders(ctx, q)
	if err != nil {
		return fmt.Errorf("db.Seed: providers: %w", err)
	}
	if err := seedLanguages(ctx, q); err != nil {
		return fmt.Errorf("db.Seed: languages: %w", err)
	}
	if err := seedSettings(ctx, q); err != nil {
		return fmt.Errorf("db.Seed: settings: %w", err)
	}
	if err := q.SetCurrentProviderID(ctx, sql.NullString{String: ollamaID, Valid: true}); err != nil {
		return fmt.Errorf("db.Seed: app_state: %w", err)
	}
	if err := seedStarterStacks(ctx, q); err != nil {
		return fmt.Errorf("db.Seed: stacks: %w", err)
	}

	return tx.Commit()
}

// wipeAllTables deletes all rows from entity and settings tables.
// Table names are hardcoded (not user-supplied) so no injection risk.
func wipeAllTables(ctx context.Context, tx *sql.Tx) error {
	tables := []string{
		"history", "stack_steps", "stacks",
		"app_state", "providers", "languages", "settings",
	}
	for _, t := range tables {
		if _, err := tx.ExecContext(ctx, "DELETE FROM "+t); err != nil {
			return fmt.Errorf("wipe %s: %w", t, err)
		}
	}
	return nil
}

// seedProviders inserts the five default LLM providers and returns the
// Ollama provider ID (used as the initial current_provider_id).
func seedProviders(ctx context.Context, q *store.Queries) (string, error) {
	now := time.Now().Unix()

	type providerRow struct {
		name           string
		kind           string
		baseURL        string
		authScheme     string
		apiKeyEnvVar   string
		completionPath string
		modelsPath     string
		headers        string
	}

	providers := []providerRow{
		{
			name: "Ollama", kind: "ollama",
			baseURL: "http://127.0.0.1:11434/", authScheme: "none",
			completionPath: defaultCompletionPath, modelsPath: defaultModelsPath,
			headers: "{}",
		},
		{
			name: "LM Studio", kind: "lmstudio",
			baseURL: "http://127.0.0.1:1234/", authScheme: "none",
			completionPath: defaultCompletionPath, modelsPath: defaultModelsPath,
			headers: "{}",
		},
		{
			name: "Llama.cpp", kind: "llamacpp",
			baseURL: "http://127.0.0.1:8080/", authScheme: "none",
			completionPath: defaultCompletionPath, modelsPath: defaultModelsPath,
			headers: "{}",
		},
		{
			name: "OpenRouter.ai", kind: "openai",
			baseURL: "https://openrouter.ai/api/", authScheme: "bearer",
			apiKeyEnvVar:   "OPENROUTER_API_KEY",
			completionPath: defaultCompletionPath, modelsPath: defaultModelsPath,
			headers: "{}",
		},
		{
			name: "OpenAI", kind: "openai",
			baseURL: "https://api.openai.com/", authScheme: "bearer",
			apiKeyEnvVar:   "OPENAI_API_KEY",
			completionPath: defaultCompletionPath, modelsPath: defaultModelsPath,
			headers: `{"OpenAI-Organization":"","OpenAI-Project":""}`,
		},
	}

	var ollamaID string
	for i, p := range providers {
		id := uuid.NewString()
		if i == 0 {
			ollamaID = id
		}
		err := q.CreateProvider(ctx, store.CreateProviderParams{
			ID:              id,
			Name:            p.name,
			Kind:            p.kind,
			BaseUrl:         p.baseURL,
			AuthScheme:      p.authScheme,
			ApiKeyEnvVar:    p.apiKeyEnvVar,
			ApiVersion:      "",
			SelectedModel:   "",
			CompletionPath:  p.completionPath,
			ModelsPath:      p.modelsPath,
			UseCustomModels: 0,
			Headers:         p.headers,
			CustomModels:    "[]",
			CreatedAt:       now,
			UpdatedAt:       now,
		})
		if err != nil {
			return "", fmt.Errorf("create provider %q: %w", p.name, err)
		}
	}
	return ollamaID, nil
}

// seedLanguages inserts the 15 default display languages.
func seedLanguages(ctx context.Context, q *store.Queries) error {
	languages := []string{
		"Chinese", "Croatian", "Czech", "English", "French",
		"German", "Hindi", "Italian", "Korean", "Polish",
		"Portuguese", "Russian", "Serbian", "Spanish", "Ukrainian",
	}
	for i, lang := range languages {
		if err := q.AddLanguage(ctx, store.AddLanguageParams{
			Name:      lang,
			SortOrder: int64(i),
		}); err != nil {
			return fmt.Errorf("add language %q: %w", lang, err)
		}
	}
	return nil
}

// seedSettings inserts all 24 default KV rows from the §A.6 catalog.
func seedSettings(ctx context.Context, q *store.Queries) error {
	rows := []store.UpsertSettingParams{
		{Key: "inference.timeout", Value: "60", Type: "int"},
		{Key: "inference.maxRetries", Value: "3", Type: "int"},
		{Key: "inference.useMarkdownForOutput", Value: "false", Type: "bool"},
		{Key: "model.name", Value: "", Type: "string"},
		{Key: "model.useTemperature", Value: "true", Type: "bool"},
		{Key: "model.temperature", Value: "0.5", Type: "float"},
		{Key: "model.useContextWindow", Value: "false", Type: "bool"},
		{Key: "model.contextWindow", Value: "4096", Type: "int"},
		{Key: "model.useLegacyMaxTokens", Value: "false", Type: "bool"},
		{Key: "app.enableTaskLogging", Value: "false", Type: "bool"},
		{Key: "lang.defaultInput", Value: "English", Type: "string"},
		{Key: "lang.defaultOutput", Value: "Ukrainian", Type: "string"},
		{Key: "ui.theme", Value: "", Type: "string"},
		{Key: "ui.layout", Value: "", Type: "string"},
		{Key: "ui.viewMode", Value: "", Type: "string"},
		{Key: "log.fileEnabled", Value: "false", Type: "bool"},
		{Key: "log.level", Value: "info", Type: "string"},
		{Key: "log.directory", Value: "", Type: "string"},
		{Key: "log.maxSizeMB", Value: "10", Type: "int"},
		{Key: "log.maxBackups", Value: "5", Type: "int"},
		{Key: "log.maxAgeDays", Value: "30", Type: "int"},
		{Key: "log.compress", Value: "false", Type: "bool"},
		{Key: "history.enabled", Value: "true", Type: "bool"},
		{Key: "history.maxEntries", Value: "100", Type: "int"},
	}
	for _, r := range rows {
		if err := q.UpsertSetting(ctx, r); err != nil {
			return fmt.Errorf("upsert setting %q: %w", r.Key, err)
		}
	}
	return nil
}

// seedStarterStacks inserts the 17 starter stacks from 09-prompts.md §4.
// Unknown action IDs are dropped with a warning at load time (per spec),
// so V3-only IDs are safe to seed now and will activate when T05 adds them.
func seedStarterStacks(ctx context.Context, q *store.Queries) error {
	now := time.Now().Unix()

	type stackDef struct {
		name    string
		icon    string
		actions []string
	}

	stacks := []stackDef{
		{name: "Message to manager", icon: "briefcase",
			actions: []string{"enhancedProofreading", "conciseRewrite", "professional"}},
		{name: "Message to coworker", icon: "users",
			actions: []string{"basicProofreading", "conciseRewrite", "friendly"}},
		{name: "Task/problem explanation", icon: "help-circle",
			actions: []string{"clarify", "simplify", "documentStructuring"}},
		{name: "Apology", icon: "heart",
			actions: []string{"formal", "empathetic", "riskFreeRewrite"}},
		{name: "Polite request", icon: "hand",
			actions: []string{"conciseRewrite", "respectful"}},
		{name: "Clarification request", icon: "search",
			actions: []string{"clarify", "diplomatic"}},
		{name: "Conflict-safe message", icon: "shield",
			actions: []string{"enhancedProofreading", "neutral", "riskFreeRewrite"}},
		{name: "Escalation / status update", icon: "alert-triangle",
			actions: []string{"conciseRewrite", "executiveBLUF", "emailTemplate"}},
		{name: "Standup update", icon: "clock",
			actions: []string{"conciseRewrite", "bulletConversion", "keyPoints"}},
		{name: "Customer reply", icon: "message-circle",
			actions: []string{"enhancedProofreading", "empathetic", "customerFacing"}},
		{name: "Ask for help", icon: "life-buoy",
			actions: []string{"clarify", "conciseRewrite", "respectful"}},
		{name: "Meeting agenda", icon: "calendar",
			actions: []string{"listConversion", "documentStructuring"}},
		{name: "Performance review", icon: "bar-chart",
			actions: []string{"formal", "diplomatic", "documentStructuring"}},
		{name: "Code review comment", icon: "code",
			actions: []string{"conciseRewrite", "direct", "technical"}},
		{name: "Bug report", icon: "bug",
			actions: []string{"specificationDocumentGenerator"}},
		{name: "Pull-request description", icon: "git-pull-request",
			actions: []string{"conciseRewrite", "professional", "changelog"}},
		{name: "Issue report", icon: "file-text",
			actions: []string{"clarify", "userStoryGeneration"}},
	}

	for _, s := range stacks {
		id := uuid.NewString()
		if err := q.InsertStack(ctx, store.InsertStackParams{
			ID:        id,
			Name:      s.name,
			Icon:      s.icon,
			CreatedAt: now,
			UpdatedAt: now,
		}); err != nil {
			return fmt.Errorf("insert stack %q: %w", s.name, err)
		}
		for pos, actionID := range s.actions {
			if err := q.InsertStackStep(ctx, store.InsertStackStepParams{
				StackID:  id,
				Position: int64(pos),
				ActionID: actionID,
			}); err != nil {
				return fmt.Errorf("insert stack step %q[%d]: %w", s.name, pos, err)
			}
		}
	}
	return nil
}
