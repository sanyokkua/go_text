package stacks

import (
	"fmt"
	"strings"

	"github.com/rs/zerolog"

	"go_text/internal/actions"
	"go_text/internal/apperr"
	"go_text/internal/logging"
)

const panicMsgFmt = "panic: %v"

// StackHandler is the Wails-bound handler for saved-stack CRUD.
// All bound methods follow the envelope pattern: return apperr.*Result,
// no error return, and include defer/recover for panic safety.
// SuggestedStackRecipe is the icon-bearing recipe data the handler resolves
// into a SuggestedStack. It mirrors db.StarterStackRecipe without importing db
// (the DI container performs the conversion).
type SuggestedStackRecipe struct {
	Name    string
	Icon    string
	Actions []string
}

type StackHandler struct {
	appLogger    *logging.Logger
	repo         StackRepositoryAPI
	planner      *actions.Planner
	catalogIDs   map[string]bool
	catalogNames map[string]string
	recipes      []SuggestedStackRecipe
}

// NewStackHandler constructs a StackHandler.
// repo may be nil when constructed (DI late-binding); call SetRepository
// before the first Wails invocation (Init does this). recipes are the
// suggested-stack recipes exposed via SuggestedStacks.
func NewStackHandler(
	appLogger *logging.Logger,
	repo StackRepositoryAPI,
	catalog []apperr.ActionMeta,
	recipes []SuggestedStackRecipe,
) *StackHandler {
	ids := make(map[string]bool, len(catalog))
	names := make(map[string]string, len(catalog))
	for _, a := range catalog {
		ids[a.ID] = true
		names[a.ID] = a.Name
	}
	return &StackHandler{
		appLogger:    appLogger,
		repo:         repo,
		planner:      actions.NewPlanner(catalog),
		catalogIDs:   ids,
		catalogNames: names,
		recipes:      recipes,
	}
}

// SetRepository wires the SQLite-backed repository after the DB is open.
// Called from ApplicationContextHolder.Init.
func (h *StackHandler) SetRepository(repo StackRepositoryAPI) {
	h.repo = repo
}

// liveZlog returns a live snapshot of the app logger's current writer, or a
// no-op logger if appLogger has not been wired (e.g. bare struct-literal
// tests exercising panic recovery).
func (h *StackHandler) liveZlog() zerolog.Logger {
	if h.appLogger != nil {
		return h.appLogger.ZeroLogger()
	}
	return zerolog.Nop()
}

// filterUnknownSteps removes action IDs not present in the catalog,
// logging a warning for each removal. Called on every read (List/Get).
func (h *StackHandler) filterUnknownSteps(stack *apperr.SavedStack) {
	out := make([]string, 0, len(stack.Steps))
	for _, id := range stack.Steps {
		if h.catalogIDs[id] {
			out = append(out, id)
		} else {
			zl := h.liveZlog()
			zl.Warn().
				Str("stackId", stack.ID).
				Str("actionId", id).
				Msg("dropping unknown action ID from saved stack")
		}
	}
	stack.Steps = out
}

// validatePlan converts action IDs to a ChainRequest and runs the planner.
// Returns a typed *AppError (validation or invalid_plan) on failure.
func (h *StackHandler) validatePlan(steps []string) error {
	chainSteps := make([]apperr.ChainStep, len(steps))
	for i, id := range steps {
		chainSteps[i] = apperr.ChainStep{ActionID: id}
	}
	_, err := h.planner.Plan(apperr.ChainRequest{Steps: chainSteps})
	return err
}

// mapRepoError converts repository string-based errors to typed AppErrors.
func mapRepoError(err error, name string) *apperr.AppError {
	msg := err.Error()
	if strings.Contains(msg, "already exists") {
		return apperr.Validation("name", "be unique", fmt.Sprintf("%q already exists", name))
	}
	if strings.Contains(msg, "not found") {
		return apperr.Validation("id", "match an existing stack", "not found")
	}
	return apperr.Internal(err)
}

// ListStacks returns all saved stacks. Unknown action IDs within each stack
// are silently dropped (spec §4.2: graceful on load).
func (h *StackHandler) ListStacks() (res apperr.StacksResult) {
	defer func() {
		if r := recover(); r != nil {
			ae := apperr.Internal(fmt.Errorf(panicMsgFmt, r))
			wire := apperr.ToWire(h.liveZlog(), ae)
			res = apperr.StacksResult{Error: &wire}
		}
	}()
	list, err := h.repo.List()
	if err != nil {
		wire := apperr.ToWire(h.liveZlog(), apperr.Internal(err))
		return apperr.StacksResult{Error: &wire}
	}
	for i := range list {
		h.filterUnknownSteps(&list[i])
	}
	if list == nil {
		list = []apperr.SavedStack{}
	}
	return apperr.StacksResult{Data: list}
}

// SuggestedStacks returns the recommended stack recipes for the Info/About
// guide, resolving each action ID to its display name via the catalog.
// Unknown action IDs are dropped from both ActionIDs and ActionNames
// (mirrors ListStacks' graceful handling of stale IDs).
func (h *StackHandler) SuggestedStacks() (res apperr.SuggestedStacksResult) {
	defer func() {
		if r := recover(); r != nil {
			ae := apperr.Internal(fmt.Errorf(panicMsgFmt, r))
			wire := apperr.ToWire(h.liveZlog(), ae)
			res = apperr.SuggestedStacksResult{Error: &wire}
		}
	}()
	out := make([]apperr.SuggestedStack, 0, len(h.recipes))
	for _, recipe := range h.recipes {
		out = append(out, h.resolveSuggestedStack(recipe))
	}
	return apperr.SuggestedStacksResult{Data: out}
}

// resolveSuggestedStack maps a recipe's action IDs to index-aligned ID/name
// pairs, dropping any ID absent from the catalog.
func (h *StackHandler) resolveSuggestedStack(recipe SuggestedStackRecipe) apperr.SuggestedStack {
	ids := make([]string, 0, len(recipe.Actions))
	names := make([]string, 0, len(recipe.Actions))
	for _, id := range recipe.Actions {
		name, ok := h.catalogNames[id]
		if !ok {
			zl := h.liveZlog()
			zl.Warn().
				Str("stackName", recipe.Name).
				Str("actionId", id).
				Msg("dropping unknown action ID from suggested stack")
			continue
		}
		ids = append(ids, id)
		names = append(names, name)
	}
	return apperr.SuggestedStack{
		Name:        recipe.Name,
		Icon:        recipe.Icon,
		ActionIDs:   ids,
		ActionNames: names,
	}
}

// GetStack returns a single stack by ID. Unknown action IDs are dropped.
func (h *StackHandler) GetStack(id string) (res apperr.StackResult) {
	defer func() {
		if r := recover(); r != nil {
			ae := apperr.Internal(fmt.Errorf(panicMsgFmt, r))
			wire := apperr.ToWire(h.liveZlog(), ae)
			res = apperr.StackResult{Error: &wire}
		}
	}()
	stack, err := h.repo.Get(id)
	if err != nil {
		ae := mapRepoError(err, "")
		wire := apperr.ToWire(h.liveZlog(), ae)
		return apperr.StackResult{Error: &wire}
	}
	h.filterUnknownSteps(stack)
	return apperr.StackResult{Data: stack}
}

// CreateStack validates and persists a new stack.
// Name must be non-empty and unique; steps must pass plan validation.
func (h *StackHandler) CreateStack(s apperr.SavedStack) (res apperr.StackResult) {
	defer func() {
		if r := recover(); r != nil {
			ae := apperr.Internal(fmt.Errorf(panicMsgFmt, r))
			wire := apperr.ToWire(h.liveZlog(), ae)
			res = apperr.StackResult{Error: &wire}
		}
	}()
	if strings.TrimSpace(s.Name) == "" {
		ae := apperr.Validation("name", "be non-empty", "empty string")
		wire := apperr.ToWire(h.liveZlog(), ae)
		return apperr.StackResult{Error: &wire}
	}
	if err := h.validatePlan(s.Steps); err != nil {
		wire := apperr.ToWire(h.liveZlog(), err)
		return apperr.StackResult{Error: &wire}
	}
	created, err := h.repo.Create(s)
	if err != nil {
		ae := mapRepoError(err, s.Name)
		wire := apperr.ToWire(h.liveZlog(), ae)
		return apperr.StackResult{Error: &wire}
	}
	return apperr.StackResult{Data: created}
}

// UpdateStack validates and replaces an existing stack's metadata and steps.
// Name must be non-empty and unique; steps must pass plan validation.
func (h *StackHandler) UpdateStack(s apperr.SavedStack) (res apperr.StackResult) {
	defer func() {
		if r := recover(); r != nil {
			ae := apperr.Internal(fmt.Errorf(panicMsgFmt, r))
			wire := apperr.ToWire(h.liveZlog(), ae)
			res = apperr.StackResult{Error: &wire}
		}
	}()
	if strings.TrimSpace(s.Name) == "" {
		ae := apperr.Validation("name", "be non-empty", "empty string")
		wire := apperr.ToWire(h.liveZlog(), ae)
		return apperr.StackResult{Error: &wire}
	}
	if err := h.validatePlan(s.Steps); err != nil {
		wire := apperr.ToWire(h.liveZlog(), err)
		return apperr.StackResult{Error: &wire}
	}
	updated, err := h.repo.Update(s)
	if err != nil {
		ae := mapRepoError(err, s.Name)
		wire := apperr.ToWire(h.liveZlog(), ae)
		return apperr.StackResult{Error: &wire}
	}
	return apperr.StackResult{Data: updated}
}

// DeleteStack removes a stack and its steps (cascade).
func (h *StackHandler) DeleteStack(id string) (res apperr.VoidResult) {
	defer func() {
		if r := recover(); r != nil {
			ae := apperr.Internal(fmt.Errorf(panicMsgFmt, r))
			wire := apperr.ToWire(h.liveZlog(), ae)
			res = apperr.VoidResult{Error: &wire}
		}
	}()
	if err := h.repo.Delete(id); err != nil {
		ae := apperr.Internal(err)
		wire := apperr.ToWire(h.liveZlog(), ae)
		return apperr.VoidResult{Error: &wire}
	}
	return apperr.VoidResult{}
}

// DuplicateStack copies an existing stack under a new name.
// newName must be non-empty and unique. No plan re-validation is needed —
// the original was validated at creation; steps are inherited unchanged.
func (h *StackHandler) DuplicateStack(id string, newName string) (res apperr.StackResult) {
	defer func() {
		if r := recover(); r != nil {
			ae := apperr.Internal(fmt.Errorf(panicMsgFmt, r))
			wire := apperr.ToWire(h.liveZlog(), ae)
			res = apperr.StackResult{Error: &wire}
		}
	}()
	if strings.TrimSpace(newName) == "" {
		ae := apperr.Validation("newName", "be non-empty", "empty string")
		wire := apperr.ToWire(h.liveZlog(), ae)
		return apperr.StackResult{Error: &wire}
	}
	original, err := h.repo.Get(id)
	if err != nil {
		ae := mapRepoError(err, "")
		wire := apperr.ToWire(h.liveZlog(), ae)
		return apperr.StackResult{Error: &wire}
	}
	dupe := apperr.SavedStack{
		Name:           newName,
		Icon:           original.Icon,
		Steps:          original.Steps,
		DefaultFormat:  original.DefaultFormat,
		DefaultInLang:  original.DefaultInLang,
		DefaultOutLang: original.DefaultOutLang,
	}
	created, err := h.repo.Create(dupe)
	if err != nil {
		ae := mapRepoError(err, newName)
		wire := apperr.ToWire(h.liveZlog(), ae)
		return apperr.StackResult{Error: &wire}
	}
	return apperr.StackResult{Data: created}
}
