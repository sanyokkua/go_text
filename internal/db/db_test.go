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

	// Providers: 5 defaults seeded
	count, err := database.Queries.CountProviders(ctx)
	require.NoError(t, err)
	assert.Equal(t, int64(5), count)

	// Languages: 15 defaults seeded
	langs, err := database.Queries.ListLanguages(ctx)
	require.NoError(t, err)
	assert.Len(t, langs, 15)
	assert.Contains(t, langs, "English")
	assert.Contains(t, langs, "Ukrainian")

	// Settings: 24 defaults seeded
	settings, err := database.Queries.ListSettings(ctx)
	require.NoError(t, err)
	assert.Len(t, settings, 24)

	// app_state: current provider is set (Ollama)
	provID, err := database.Queries.GetCurrentProviderID(ctx)
	require.NoError(t, err)
	assert.True(t, provID.Valid)
	assert.NotEmpty(t, provID.String)

	// Stacks: 17 starter stacks seeded
	stacks, err := database.Queries.ListStacks(ctx)
	require.NoError(t, err)
	assert.Len(t, stacks, 17)
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
	assert.Equal(t, int64(5), count, "second open must not reseed")
}

func TestMigrationRoundTrip(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "roundtrip.db")

	database, err := Open(dbPath)
	require.NoError(t, err)
	defer database.Close()

	ctx := context.Background()

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
	assert.Equal(t, int64(5), count)

	stacks, err := database.Queries.ListStacks(ctx)
	require.NoError(t, err)
	assert.Len(t, stacks, 17)

	settings, err := database.Queries.ListSettings(ctx)
	require.NoError(t, err)
	assert.Len(t, settings, 24)

	langs, err := database.Queries.ListLanguages(ctx)
	require.NoError(t, err)
	assert.Len(t, langs, 15)

	provID, err := database.Queries.GetCurrentProviderID(ctx)
	require.NoError(t, err)
	assert.True(t, provID.Valid)
	assert.NotEmpty(t, provID.String)
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
	assert.Equal(t, int64(5), count, "Seed idempotency: still 5 providers after second Seed")
}
