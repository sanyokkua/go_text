package db

import (
	"context"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestOpen_FreshDB_MigratesAndSeeds(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "test.db")

	database, err := Open(dbPath)
	require.NoError(t, err)
	defer database.Close()

	ctx := context.Background()

	// Providers: exactly 2 defaults seeded (Ollama + LM Studio).
	count, err := database.Queries.CountProviders(ctx)
	require.NoError(t, err)
	assert.Equal(t, int64(2), count)

	provs, err := database.Queries.ListProviders(ctx)
	require.NoError(t, err)
	require.Len(t, provs, 2)
	kinds := map[string]bool{}
	for _, p := range provs {
		kinds[p.Kind] = true
	}
	assert.True(t, kinds["ollama"], "expected an ollama provider")
	assert.True(t, kinds["lmstudio"], "expected an lmstudio provider")

	// Languages: 15 defaults seeded
	langs, err := database.Queries.ListLanguages(ctx)
	require.NoError(t, err)
	assert.Len(t, langs, 15)
	assert.Contains(t, langs, "English")
	assert.Contains(t, langs, "Ukrainian")

	// Settings: 28 defaults seeded
	settings, err := database.Queries.ListSettings(ctx)
	require.NoError(t, err)
	assert.Len(t, settings, 28)

	// app_state: current provider is set, and it is the Ollama provider.
	provID, err := database.Queries.GetCurrentProviderID(ctx)
	require.NoError(t, err)
	require.True(t, provID.Valid)
	require.NotEmpty(t, provID.String)
	current, err := database.Queries.GetProvider(ctx, provID.String)
	require.NoError(t, err)
	assert.Equal(t, "ollama", current.Kind, "Ollama must be the default current provider")

	// Stacks: a fresh seed creates ZERO stacks (starter stacks are suggestions only).
	stacks, err := database.Queries.ListStacks(ctx)
	require.NoError(t, err)
	assert.Empty(t, stacks)
}

func TestOpen_ExistingDB_DoesNotReseed(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "test.db")

	// First open: seeds
	db1, err := Open(dbPath)
	require.NoError(t, err)
	db1.Close()

	// Second open: must not add more rows
	db2, err := Open(dbPath)
	require.NoError(t, err)
	defer db2.Close()

	count, err := db2.Queries.CountProviders(context.Background())
	require.NoError(t, err)
	assert.Equal(t, int64(2), count, "second open must not reseed")
}

// settingsKeyExists reports whether a KV row with the given key is present.
func settingsKeyExists(t *testing.T, database *Database, ctx context.Context, key string) bool {
	t.Helper()
	var count int
	err := database.DB.QueryRowContext(ctx, "SELECT COUNT(1) FROM settings WHERE key = ?", key).Scan(&count)
	require.NoError(t, err)
	return count > 0
}

func TestMigrationRoundTrip(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "roundtrip.db")

	database, err := Open(dbPath)
	require.NoError(t, err)
	defer database.Close()

	ctx := context.Background()

	// T62: migration 0004 is data-only (EAV rows, not a schema column). Verify its
	// own Up/Down in isolation before the full schema round-trip below.
	assert.True(t, settingsKeyExists(t, database, ctx, "model.useMaxOutputTokens"), "key present after fresh Open (migration 0004 applied)")
	assert.True(t, settingsKeyExists(t, database, ctx, "model.maxOutputTokens"), "key present after fresh Open (migration 0004 applied)")

	downResults, err := database.provider.DownTo(ctx, 3)
	require.NoError(t, err)
	for _, r := range downResults {
		require.NoError(t, r.Error, "down migration %s failed", r.Source.Path)
	}
	assert.False(t, settingsKeyExists(t, database, ctx, "model.useMaxOutputTokens"), "key removed after migration 0004 Down")
	assert.False(t, settingsKeyExists(t, database, ctx, "model.maxOutputTokens"), "key removed after migration 0004 Down")

	reupResults, err := database.provider.Up(ctx)
	require.NoError(t, err)
	for _, r := range reupResults {
		require.NoError(t, r.Error, "up migration %s failed", r.Source.Path)
	}
	assert.True(t, settingsKeyExists(t, database, ctx, "model.useMaxOutputTokens"), "key restored after migration 0004 Up")
	assert.True(t, settingsKeyExists(t, database, ctx, "model.maxOutputTokens"), "key restored after migration 0004 Up")

	// Roll back all migrations (Down to version 0)
	results, err := database.provider.DownTo(ctx, 0)
	require.NoError(t, err)
	for _, r := range results {
		require.NoError(t, r.Error, "down migration %s failed", r.Source.Path)
	}

	// Verify tables are gone
	_, err = database.DB.ExecContext(ctx, "SELECT 1 FROM providers")
	assert.Error(t, err, "providers table should not exist after Down")

	// Re-apply all migrations
	upResults, err := database.provider.Up(ctx)
	require.NoError(t, err)
	for _, r := range upResults {
		require.NoError(t, r.Error, "up migration %s failed", r.Source.Path)
	}

	// Verify schema is restored
	_, err = database.DB.ExecContext(ctx, "SELECT 1 FROM providers")
	assert.NoError(t, err, "providers table should exist after Up")
	_, err = database.DB.ExecContext(ctx, "SELECT 1 FROM history")
	assert.NoError(t, err, "history table should exist after Up")
}

func TestSeed_FactoryReset_RepopulatesDefaults(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "reset.db")

	database, err := Open(dbPath)
	require.NoError(t, err)
	defer database.Close()

	ctx := context.Background()

	// Wipe all tables in FK-safe order to simulate a factory reset scenario.
	_, err = database.DB.ExecContext(ctx, "DELETE FROM stack_steps")
	require.NoError(t, err)
	_, err = database.DB.ExecContext(ctx, "DELETE FROM stacks")
	require.NoError(t, err)
	_, err = database.DB.ExecContext(ctx, "DELETE FROM app_state")
	require.NoError(t, err)
	_, err = database.DB.ExecContext(ctx, "DELETE FROM providers")
	require.NoError(t, err)
	_, err = database.DB.ExecContext(ctx, "DELETE FROM languages")
	require.NoError(t, err)
	_, err = database.DB.ExecContext(ctx, "DELETE FROM settings")
	require.NoError(t, err)

	// Seed (factory reset)
	err = database.Seed(ctx)
	require.NoError(t, err)

	// Verify all defaults restored
	count, err := database.Queries.CountProviders(ctx)
	require.NoError(t, err)
	assert.Equal(t, int64(2), count)

	stacks, err := database.Queries.ListStacks(ctx)
	require.NoError(t, err)
	assert.Empty(t, stacks, "factory reset must not seed any stacks")

	settings, err := database.Queries.ListSettings(ctx)
	require.NoError(t, err)
	assert.Len(t, settings, 28)

	langs, err := database.Queries.ListLanguages(ctx)
	require.NoError(t, err)
	assert.Len(t, langs, 15)

	provID, err := database.Queries.GetCurrentProviderID(ctx)
	require.NoError(t, err)
	require.True(t, provID.Valid)
	require.NotEmpty(t, provID.String)
	current, err := database.Queries.GetProvider(ctx, provID.String)
	require.NoError(t, err)
	assert.Equal(t, "ollama", current.Kind, "Ollama must be the default current provider after reset")
}

func TestSeed_Idempotent_WhenCalledTwice(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "idempotent.db")

	database, err := Open(dbPath)
	require.NoError(t, err)
	defer database.Close()

	ctx := context.Background()

	// Second Seed call (full wipe + reseed)
	err = database.Seed(ctx)
	require.NoError(t, err)

	count, err := database.Queries.CountProviders(ctx)
	require.NoError(t, err)
	assert.Equal(t, int64(2), count, "Seed idempotency: still 2 providers after second Seed")
}
