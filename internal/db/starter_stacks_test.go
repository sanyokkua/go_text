package db

import (
	"context"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	v3 "go_text/internal/prompts/v3"
)

// catalogIDSet returns the set of valid v3 action IDs for membership checks.
func catalogIDSet() map[string]bool {
	cat := v3.Catalog()
	ids := make(map[string]bool, len(cat))
	for _, a := range cat {
		ids[a.ID] = true
	}
	return ids
}

// TestStarterStacks_AllStepsInCatalog asserts every seeded starter stack has
// non-empty steps and every step ID exists in the live v3 catalog, so the steps
// survive StackHandler.filterUnknownSteps on read. Plan validity (planner caps)
// is covered separately in the stacks package, which can import actions without
// the actions -> history -> db import cycle that this package would hit.
func TestStarterStacks_AllStepsInCatalog(t *testing.T) {
	t.Parallel()

	require.Len(t, starterStacks, 17, "expected 17 starter stacks")

	ids := catalogIDSet()
	for _, s := range starterStacks {
		t.Run(s.name, func(t *testing.T) {
			require.NotEmpty(t, s.actions, "stack %q has no steps", s.name)
			for _, id := range s.actions {
				assert.Truef(t, ids[id], "stack %q step %q is not in the v3 catalog", s.name, id)
			}
		})
	}
}

// TestMigration_RemapsStaleCamelCaseActionID proves migration 0003 heals an
// already-seeded database: a stale camelCase action_id is rewritten to its
// valid v3 dotted ID when migrations are applied.
func TestMigration_RemapsStaleCamelCaseActionID(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "remap.db")

	database, err := Open(dbPath)
	require.NoError(t, err)
	defer database.Close()

	ctx := context.Background()

	// Roll back to before the remap migration (0003) so we can simulate a
	// pre-remap DB. DownTo(2), not Down() — Down() only undoes the single most
	// recent migration, which is 0004 (T62) now that 0003 is no longer latest.
	_, err = database.provider.DownTo(ctx, 2)
	require.NoError(t, err)

	// Insert a stack with a stale camelCase action_id (as the old seeder wrote).
	const staleID = "conciseRewrite"
	const stackID = "stale-stack-1"
	_, err = database.DB.ExecContext(ctx,
		"INSERT INTO stacks (id, name, icon, created_at, updated_at) VALUES (?, ?, ?, 0, 0)",
		stackID, "Stale Stack", "briefcase")
	require.NoError(t, err)
	_, err = database.DB.ExecContext(ctx,
		"INSERT INTO stack_steps (stack_id, position, action_id) VALUES (?, 0, ?)",
		stackID, staleID)
	require.NoError(t, err)

	// Re-apply the remap migration.
	_, err = database.provider.Up(ctx)
	require.NoError(t, err)

	// The stale ID must now be its dotted equivalent.
	var got string
	row := database.DB.QueryRowContext(ctx,
		"SELECT action_id FROM stack_steps WHERE stack_id = ? AND position = 0", stackID)
	require.NoError(t, row.Scan(&got))
	assert.Equal(t, "rewrite.intent.concise", got)

	// And it must be a real catalog ID.
	assert.True(t, catalogIDSet()[got], "remapped ID must exist in the v3 catalog")
}

// legacyToDotted is the complete old (camelCase) -> new (v3 dotted) mapping that
// migration 0003 applies. Kept in the test so the regression below locks every
// one of the 25 UPDATEs in the single goose statement block, not just one.
var legacyToDotted = map[string]string{
	"basicProofreading":              "rewrite.proofread.basic",
	"enhancedProofreading":           "rewrite.proofread.enhanced",
	"clarify":                        "rewrite.proofread.clarification",
	"conciseRewrite":                 "rewrite.intent.concise",
	"simplify":                       "rewrite.intent.simplify",
	"formal":                         "rewrite.intent.professionalize",
	"professional":                   "rewrite.tone.professional",
	"friendly":                       "rewrite.tone.friendly",
	"direct":                         "rewrite.tone.direct",
	"neutral":                        "rewrite.tone.neutral",
	"respectful":                     "rewrite.tone.respectful",
	"diplomatic":                     "rewrite.tone.diplomatic",
	"empathetic":                     "rewrite.tone.empathetic",
	"riskFreeRewrite":                "rewrite.style.risk-reduce",
	"technical":                      "rewrite.style.technical",
	"customerFacing":                 "rewrite.style.support",
	"documentStructuring":            "structure.format.headings",
	"listConversion":                 "structure.format.numbered",
	"bulletConversion":               "structure.format.bullets",
	"executiveBLUF":                  "summarize.executive",
	"keyPoints":                      "summarize.keypoints",
	"emailTemplate":                  "structure.doc.email",
	"specificationDocumentGenerator": "structure.doc.techspec",
	"changelog":                      "structure.doc.changelog",
	"userStoryGeneration":            "structure.doc.userstory",
}

// TestMigration_RemapsEveryStaleActionID locks all 25 mappings: it seeds one stale
// camelCase row per mapping, applies the remap migration, and asserts each healed to
// its dotted catalog ID. This proves every statement in the single goose statement
// block executes (not just the first) and that fresh seeds and healed DBs agree.
func TestMigration_RemapsEveryStaleActionID(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "remap_all.db")

	database, err := Open(dbPath)
	require.NoError(t, err)
	defer database.Close()

	ctx := context.Background()
	ids := catalogIDSet()

	// Roll back to before the remap migration to simulate a pre-remap DB.
	// DownTo(2), not Down() — Down() only undoes the single most recent
	// migration, which is 0004 (T62) now that 0003 is no longer latest.
	_, err = database.provider.DownTo(ctx, 2)
	require.NoError(t, err)

	const stackID = "all-stale-stack"
	_, err = database.DB.ExecContext(ctx,
		"INSERT INTO stacks (id, name, icon, created_at, updated_at) VALUES (?, ?, ?, 0, 0)",
		stackID, "All Stale", "briefcase")
	require.NoError(t, err)

	stale := make([]string, 0, len(legacyToDotted))
	for old := range legacyToDotted {
		stale = append(stale, old)
	}
	for pos, old := range stale {
		_, err = database.DB.ExecContext(ctx,
			"INSERT INTO stack_steps (stack_id, position, action_id) VALUES (?, ?, ?)",
			stackID, pos, old)
		require.NoError(t, err)
	}

	// Re-apply the remap migration.
	_, err = database.provider.Up(ctx)
	require.NoError(t, err)

	for pos, old := range stale {
		var got string
		row := database.DB.QueryRowContext(ctx,
			"SELECT action_id FROM stack_steps WHERE stack_id = ? AND position = ?", stackID, pos)
		require.NoError(t, row.Scan(&got))
		assert.Equalf(t, legacyToDotted[old], got, "stale ID %q remapped incorrectly", old)
		assert.Truef(t, ids[got], "remapped ID %q must be a valid catalog ID", got)
	}
}

// TestMigration_RemapDownReversesMapping verifies the Down section restores the
// original camelCase ID, keeping the migration cleanly reversible.
func TestMigration_RemapDownReversesMapping(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "remap_down.db")

	database, err := Open(dbPath)
	require.NoError(t, err)
	defer database.Close()

	ctx := context.Background()

	const stackID = "dotted-stack-1"
	_, err = database.DB.ExecContext(ctx,
		"INSERT INTO stacks (id, name, icon, created_at, updated_at) VALUES (?, ?, ?, 0, 0)",
		stackID, "Dotted Stack", "briefcase")
	require.NoError(t, err)
	_, err = database.DB.ExecContext(ctx,
		"INSERT INTO stack_steps (stack_id, position, action_id) VALUES (?, 0, ?)",
		stackID, "rewrite.intent.concise")
	require.NoError(t, err)

	// Roll back to before the remap migration: dotted -> camelCase.
	// DownTo(2), not Down() — Down() only undoes the single most recent
	// migration, which is 0004 (T62) now that 0003 is no longer latest.
	_, err = database.provider.DownTo(ctx, 2)
	require.NoError(t, err)

	var got string
	row := database.DB.QueryRowContext(ctx,
		"SELECT action_id FROM stack_steps WHERE stack_id = ? AND position = 0", stackID)
	require.NoError(t, row.Scan(&got))
	assert.Equal(t, "conciseRewrite", got)
}
