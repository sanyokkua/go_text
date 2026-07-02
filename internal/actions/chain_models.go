package actions

import "go_text/internal/apperr"

// ChainPlan is the output of the Planner: an ordered slice of merge groups.
type ChainPlan struct {
	Groups     []Group
	Inferences int
}

// Group is one inference group: same family, all steps are mergeable (or a single
// non-mergeable action). Groups execute sequentially; each produces one LLM call.
type Group struct {
	Family string
	Steps  []apperr.ChainStep // in canonical sub-order
}

// ChatStepRequest is the input to runStep: the fully built prompts plus
// the metadata needed for the tasklog entry.
type ChatStepRequest struct {
	System      string
	User        string
	GroupFamily string
	ActionIDs   []string // ordered IDs of actions in this group
	InputText   string   // text entering this step (for logging)
	InputLang   string
	OutputLang  string
	RunID       string // chain-run correlation id; empty for single-step runs outside a chain
}
