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
// It opens its own transaction and calls seedDefaults only — it never wipes.
func (d *Database) seedIfEmpty() error {
	ctx := context.Background()
	count, err := d.Queries.CountProviders(ctx)
	if err != nil {
		return fmt.Errorf("db.seedIfEmpty: count providers: %w", err)
	}
	if count > 0 {
		return nil
	}

	tx, err := d.DB.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("db.seedIfEmpty: begin tx: %w", err)
	}
	defer func() { _ = tx.Rollback() }()

	if err := seedDefaults(ctx, d.Queries.WithTx(tx)); err != nil {
		return fmt.Errorf("db.seedIfEmpty: %w", err)
	}

	return tx.Commit()
}

// Seed wipes all entity and settings tables, then reseeds defaults in a
// single transaction. This is the factory-reset operation.
// It calls wipeAllTables followed by seedDefaults.
func (d *Database) Seed(ctx context.Context) error {
	tx, err := d.DB.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("db.Seed: begin tx: %w", err)
	}
	defer func() { _ = tx.Rollback() }()

	if err := wipeAllTables(ctx, tx); err != nil {
		return fmt.Errorf("db.Seed: wipe: %w", err)
	}

	if err := seedDefaults(ctx, d.Queries.WithTx(tx)); err != nil {
		return fmt.Errorf("db.Seed: %w", err)
	}

	return tx.Commit()
}

// seedDefaults inserts all defaults into an already-open transaction via q.
// Called by seedIfEmpty (fresh DB, no wipe) and Seed (after wipeAllTables).
func seedDefaults(ctx context.Context, q *store.Queries) error {
	ollamaID, err := seedProviders(ctx, q)
	if err != nil {
		return fmt.Errorf("providers: %w", err)
	}
	if err := seedLanguages(ctx, q); err != nil {
		return fmt.Errorf("languages: %w", err)
	}
	if err := seedSettings(ctx, q); err != nil {
		return fmt.Errorf("settings: %w", err)
	}
	if err := q.SetCurrentProviderID(ctx, sql.NullString{String: ollamaID, Valid: true}); err != nil {
		return fmt.Errorf("app_state: %w", err)
	}
	// Starter stacks are no longer seeded into the DB; they are exposed as
	// suggestions (StarterStackRecipes) for the Info/About guide instead.
	return nil
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

// ProviderPreset is one entry in the canonical provider-preset catalog.
// It is the single source of truth shared by the seeder (which inserts only
// the SeedDefault entries) and the New-Provider form's one-click presets
// (which exposes all entries via the settings handler). It carries no apperr
// dependency so the db package stays free of apperr imports.
type ProviderPreset struct {
	Name           string
	Kind           string
	BaseURL        string
	AuthScheme     string
	APIKeyEnvVar   string
	CompletionPath string
	ModelsPath     string
	Headers        string

	// SeedDefault marks the presets inserted on a fresh database.
	// Only Ollama (current) and LM Studio are seeded; the rest are
	// available solely as one-click presets in the New-Provider form.
	SeedDefault bool
}

// providerPresets is the canonical list of provider presets. Ollama and
// LM Studio are seeded on a fresh DB; all five are exposed as form presets.
var providerPresets = []ProviderPreset{
	{
		Name: "Ollama", Kind: "ollama",
		BaseURL: "http://127.0.0.1:11434/", AuthScheme: "none",
		CompletionPath: defaultCompletionPath, ModelsPath: defaultModelsPath,
		Headers: "{}", SeedDefault: true,
	},
	{
		Name: "LM Studio", Kind: "lmstudio",
		BaseURL: "http://127.0.0.1:1234/", AuthScheme: "none",
		CompletionPath: defaultCompletionPath, ModelsPath: defaultModelsPath,
		Headers: "{}", SeedDefault: true,
	},
	{
		Name: "Llama.cpp", Kind: "llamacpp",
		BaseURL: "http://127.0.0.1:8080/", AuthScheme: "none",
		CompletionPath: defaultCompletionPath, ModelsPath: defaultModelsPath,
		Headers: "{}",
	},
	{
		Name: "OpenAI", Kind: "openai",
		BaseURL: "https://api.openai.com/", AuthScheme: "bearer",
		APIKeyEnvVar:   "OPENAI_API_KEY",
		CompletionPath: defaultCompletionPath, ModelsPath: defaultModelsPath,
		Headers: `{"OpenAI-Organization":"","OpenAI-Project":""}`,
	},
	{
		Name: "OpenRouter.ai", Kind: "openai",
		BaseURL: "https://openrouter.ai/api/", AuthScheme: "bearer",
		APIKeyEnvVar:   "OPENROUTER_API_KEY",
		CompletionPath: defaultCompletionPath, ModelsPath: defaultModelsPath,
		Headers: "{}",
	},
}

// ProviderPresets returns a defensive copy of the canonical provider presets.
// The settings handler exposes these to the New-Provider form.
func ProviderPresets() []ProviderPreset {
	out := make([]ProviderPreset, len(providerPresets))
	copy(out, providerPresets)
	return out
}

// seedProviders inserts the default-seeded LLM providers (Ollama + LM Studio)
// and returns the Ollama provider ID (used as the initial current_provider_id).
func seedProviders(ctx context.Context, q *store.Queries) (string, error) {
	now := time.Now().Unix()

	var ollamaID string
	for _, p := range providerPresets {
		if !p.SeedDefault {
			continue
		}
		id := uuid.NewString()
		if p.Kind == "ollama" {
			ollamaID = id
		}
		err := q.CreateProvider(ctx, store.CreateProviderParams{
			ID:              id,
			Name:            p.Name,
			Kind:            p.Kind,
			BaseUrl:         p.BaseURL,
			AuthScheme:      p.AuthScheme,
			ApiKeyEnvVar:    p.APIKeyEnvVar,
			ApiVersion:      "",
			SelectedModel:   "",
			CompletionPath:  p.CompletionPath,
			ModelsPath:      p.ModelsPath,
			UseCustomModels: 0,
			Headers:         p.Headers,
			CustomModels:    "[]",
			CreatedAt:       now,
			UpdatedAt:       now,
		})
		if err != nil {
			return "", fmt.Errorf("create provider %q: %w", p.Name, err)
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

// seedSettings inserts all 28 default KV rows from the §A.6 catalog.
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
		{Key: "model.useMaxOutputTokens", Value: "false", Type: "bool"},
		{Key: "model.maxOutputTokens", Value: "2048", Type: "int"},
		{Key: "app.enableTaskLogging", Value: "false", Type: "bool"},
		{Key: "lang.defaultInput", Value: "English", Type: "string"},
		{Key: "lang.defaultOutput", Value: "Ukrainian", Type: "string"},
		{Key: "ui.theme", Value: "", Type: "string"},
		{Key: "ui.layout", Value: "", Type: "string"},
		{Key: "ui.sidebarCollapsed", Value: "false", Type: "bool"},
		{Key: "ui.historyOpen", Value: "false", Type: "bool"},
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

// v3 dotted action IDs used by the starter stacks. Centralized so the seed table
// and tests share a single source of truth (and to avoid duplicated literals).
const (
	actProofreadBasic    = "rewrite.proofread.basic"
	actProofreadEnhanced = "rewrite.proofread.enhanced"
	actClarification     = "rewrite.proofread.clarification"
	actConcise           = "rewrite.intent.concise"
	actSimplify          = "rewrite.intent.simplify"
	actProfessionalize   = "rewrite.intent.professionalize"
	actToneProfessional  = "rewrite.tone.professional"
	actToneFriendly      = "rewrite.tone.friendly"
	actToneDirect        = "rewrite.tone.direct"
	actToneNeutral       = "rewrite.tone.neutral"
	actToneRespectful    = "rewrite.tone.respectful"
	actToneDiplomatic    = "rewrite.tone.diplomatic"
	actToneEmpathetic    = "rewrite.tone.empathetic"
	actStyleRiskReduce   = "rewrite.style.risk-reduce"
	actStyleTechnical    = "rewrite.style.technical"
	actStyleSupport      = "rewrite.style.support"
	actFormatHeadings    = "structure.format.headings"
	actFormatNumbered    = "structure.format.numbered"
	actFormatBullets     = "structure.format.bullets"
	actSummarizeExec     = "summarize.executive"
	actKeyPoints         = "summarize.keypoints"
	actDocEmail          = "structure.doc.email"
	actDocTechSpec       = "structure.doc.techspec"
	actDocChangelog      = "structure.doc.changelog"
	actDocUserStory      = "structure.doc.userstory"
)

// starterStackDef describes one seeded starter stack: its display name, icon,
// and the ordered v3 action IDs that make up its recipe.
type starterStackDef struct {
	name    string
	icon    string
	actions []string
}

// starterStacks is the canonical list of the 17 starter stacks from 09-prompts.md §4.
// Every action ID is a valid v3 dotted catalog ID, and every stack is a valid plan
// (≤5 steps, ≤3 inference groups, one action per exclusivity group). These invariants
// are enforced by TestStarterStacks_AllValidPlans, which validates each stack against
// the live v3 catalog and the actions.Planner.
var starterStacks = []starterStackDef{
	{name: "Message to manager", icon: "briefcase",
		actions: []string{actProofreadEnhanced, actConcise, actToneProfessional}},
	{name: "Message to coworker", icon: "users",
		actions: []string{actProofreadBasic, actConcise, actToneFriendly}},
	{name: "Task/problem explanation", icon: "help-circle",
		actions: []string{actClarification, actSimplify, actFormatHeadings}},
	{name: "Apology", icon: "heart",
		actions: []string{actProfessionalize, actToneEmpathetic, actStyleRiskReduce}},
	{name: "Polite request", icon: "hand",
		actions: []string{actConcise, actToneRespectful}},
	{name: "Clarification request", icon: "search",
		actions: []string{actClarification, actToneDiplomatic}},
	{name: "Conflict-safe message", icon: "shield",
		actions: []string{actProofreadEnhanced, actToneNeutral, actStyleRiskReduce}},
	{name: "Escalation / status update", icon: "alert-triangle",
		actions: []string{actConcise, actSummarizeExec, actDocEmail}},
	{name: "Standup update", icon: "clock",
		actions: []string{actConcise, actFormatBullets, actKeyPoints}},
	{name: "Customer reply", icon: "message-circle",
		actions: []string{actProofreadEnhanced, actToneEmpathetic, actStyleSupport}},
	{name: "Ask for help", icon: "life-buoy",
		actions: []string{actClarification, actConcise, actToneRespectful}},
	{name: "Meeting agenda", icon: "calendar",
		actions: []string{actFormatNumbered, actFormatHeadings}},
	{name: "Performance review", icon: "bar-chart",
		actions: []string{actProfessionalize, actToneDiplomatic, actFormatHeadings}},
	{name: "Code review comment", icon: "code",
		actions: []string{actConcise, actToneDirect, actStyleTechnical}},
	{name: "Bug report", icon: "bug",
		actions: []string{actDocTechSpec}},
	{name: "Pull-request description", icon: "git-pull-request",
		actions: []string{actConcise, actToneProfessional, actDocChangelog}},
	{name: "Issue report", icon: "file-text",
		actions: []string{actClarification, actDocUserStory}},
}

// StarterStackActions returns the ordered v3 action IDs for each seeded starter
// stack, keyed by the stack's display name. It exposes the seed recipes to other
// packages (e.g. the stacks package's planner-validation test) without importing
// the actions package here, which would create an import cycle (actions -> history
// -> db). The returned map is a fresh copy; callers may not affect the seed table.
func StarterStackActions() map[string][]string {
	out := make(map[string][]string, len(starterStacks))
	for _, s := range starterStacks {
		actions := make([]string, len(s.actions))
		copy(actions, s.actions)
		out[s.name] = actions
	}
	return out
}

// StarterStackRecipe is one suggested-stack recipe exposed to the Info/About
// guide. It carries the icon (which StarterStackActions does not) so the
// frontend can render the suggestion exactly as a seeded stack would appear.
type StarterStackRecipe struct {
	Name    string
	Icon    string
	Actions []string
}

// StarterStackRecipes returns a defensive copy of the starter-stack recipes,
// preserving canonical order. Unlike StarterStackActions, it includes the icon
// so the suggestions can be rendered in the Info/About guide.
func StarterStackRecipes() []StarterStackRecipe {
	out := make([]StarterStackRecipe, len(starterStacks))
	for i, s := range starterStacks {
		actions := make([]string, len(s.actions))
		copy(actions, s.actions)
		out[i] = StarterStackRecipe{Name: s.name, Icon: s.icon, Actions: actions}
	}
	return out
}
