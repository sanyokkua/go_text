package apperr_test

import (
	"encoding/json"
	"testing"

	"go_text/internal/apperr"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestStepProgress_JSONKeys(t *testing.T) {
	t.Parallel()
	p := apperr.StepProgress{
		RunID:       "run-abc",
		GroupIndex:  1,
		TotalGroups: 3,
		Family:      "rewrite",
		Status:      "running",
	}
	b, err := json.Marshal(p)
	require.NoError(t, err)
	got := string(b)
	assert.Contains(t, got, `"runId":"run-abc"`)
	assert.Contains(t, got, `"groupIndex":1`)
	assert.Contains(t, got, `"totalGroups":3`)
	assert.Contains(t, got, `"family":"rewrite"`)
	assert.Contains(t, got, `"status":"running"`)
}
