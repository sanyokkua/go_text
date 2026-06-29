package stacks

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"go_text/internal/actions"
	"go_text/internal/apperr"
	"go_text/internal/db"
	v3 "go_text/internal/prompts/v3"
)

// TestStarterStacks_AllValidPlans is the self-checking acceptance criterion for B0:
// every seeded starter stack must validate as a plan via actions.Planner.Plan with
// at least one inference group, exercising the family / exclusivity / step / inference
// caps against the live v3 catalog. It lives in the stacks package because db cannot
// import actions without an import cycle (actions -> history -> db).
func TestStarterStacks_AllValidPlans(t *testing.T) {
	t.Parallel()

	starters := db.StarterStackActions()
	require.Len(t, starters, 17, "expected 17 starter stacks")

	planner := actions.NewPlanner(v3.Catalog())

	for name, ids := range starters {
		t.Run(name, func(t *testing.T) {
			require.NotEmptyf(t, ids, "stack %q has no steps", name)

			steps := make([]apperr.ChainStep, len(ids))
			for i, id := range ids {
				steps[i] = apperr.ChainStep{ActionID: id}
			}

			plan, err := planner.Plan(apperr.ChainRequest{Steps: steps})
			require.NoErrorf(t, err, "stack %q must produce a valid plan", name)
			assert.GreaterOrEqualf(t, plan.Inferences, 1,
				"stack %q must have >=1 inference group", name)
		})
	}
}

// TestStarterStacks_EscalationAtInferenceCap pins the Escalation stack at exactly the
// 3-inference-group cap (rewrite + structure + summarize), guarding against a future
// tweak silently pushing it over maxInferences.
func TestStarterStacks_EscalationAtInferenceCap(t *testing.T) {
	t.Parallel()

	ids := db.StarterStackActions()["Escalation / status update"]
	require.NotEmpty(t, ids, "Escalation stack not found")

	steps := make([]apperr.ChainStep, len(ids))
	for i, id := range ids {
		steps[i] = apperr.ChainStep{ActionID: id}
	}

	planner := actions.NewPlanner(v3.Catalog())
	plan, err := planner.Plan(apperr.ChainRequest{Steps: steps})
	require.NoError(t, err)
	assert.Equal(t, 3, plan.Inferences, "Escalation must use exactly 3 inference groups")
}
