package stacks

import (
	"fmt"
	"strings"

	"github.com/rs/zerolog"
	"github.com/wailsapp/wails/v2/pkg/logger"

	"go_text/internal/actions"
	"go_text/internal/apperr"
)

const panicMsgFmt = "panic: %v"

// StackHandler is the Wails-bound handler for saved-stack CRUD.
// All bound methods follow the envelope pattern: return apperr.*Result,
// no error return, and include defer/recover for panic safety.
type StackHandler struct {
	logger     logger.Logger
	zlog       zerolog.Logger
	repo       StackRepositoryAPI
	planner    *actions.Planner
	catalogIDs map[string]bool
}

// NewStackHandler constructs a StackHandler.
// repo may be nil when constructed (DI late-binding); call SetRepository
// before the first Wails invocation (Init does this).
func NewStackHandler(
	wailsLogger logger.Logger,
	zlog zerolog.Logger,
	repo StackRepositoryAPI,
	catalog []apperr.ActionMeta,
) *StackHandler {
	ids := make(map[string]bool, len(catalog))
	for _, a := range catalog {
		ids[a.ID] = true
	}
	return &StackHandler{
		logger:     wailsLogger,
		zlog:       zlog,
		repo:       repo,
		planner:    actions.NewPlanner(catalog),
		catalogIDs: ids,
	}
}

// SetRepository wires the SQLite-backed repository after the DB is open.
// Called from ApplicationContextHolder.Init.
func (h *StackHandler) SetRepository(repo StackRepositoryAPI) {
	h.repo = repo
}

// filterUnknownSteps removes action IDs not present in the catalog,
// logging a warning for each removal. Called on every read (List/Get).
func (h *StackHandler) filterUnknownSteps(stack *apperr.SavedStack) {
	out := make([]string, 0, len(stack.Steps))
	for _, id := range stack.Steps {
		if h.catalogIDs[id] {
			out = append(out, id)
		} else {
			h.zlog.Warn().
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
			wire := apperr.ToWire(h.zlog, ae)
			res = apperr.StacksResult{Error: &wire}
		}
	}()
	list, err := h.repo.List()
	if err != nil {
		wire := apperr.ToWire(h.zlog, apperr.Internal(err))
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

// GetStack returns a single stack by ID. Unknown action IDs are dropped.
func (h *StackHandler) GetStack(id string) (res apperr.StackResult) {
	defer func() {
		if r := recover(); r != nil {
			ae := apperr.Internal(fmt.Errorf(panicMsgFmt, r))
			wire := apperr.ToWire(h.zlog, ae)
			res = apperr.StackResult{Error: &wire}
		}
	}()
	stack, err := h.repo.Get(id)
	if err != nil {
		ae := mapRepoError(err, "")
		wire := apperr.ToWire(h.zlog, ae)
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
			wire := apperr.ToWire(h.zlog, ae)
			res = apperr.StackResult{Error: &wire}
		}
	}()
	if strings.TrimSpace(s.Name) == "" {
		ae := apperr.Validation("name", "be non-empty", "empty string")
		wire := apperr.ToWire(h.zlog, ae)
		return apperr.StackResult{Error: &wire}
	}
	if err := h.validatePlan(s.Steps); err != nil {
		wire := apperr.ToWire(h.zlog, err)
		return apperr.StackResult{Error: &wire}
	}
	created, err := h.repo.Create(s)
	if err != nil {
		ae := mapRepoError(err, s.Name)
		wire := apperr.ToWire(h.zlog, ae)
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
			wire := apperr.ToWire(h.zlog, ae)
			res = apperr.StackResult{Error: &wire}
		}
	}()
	if strings.TrimSpace(s.Name) == "" {
		ae := apperr.Validation("name", "be non-empty", "empty string")
		wire := apperr.ToWire(h.zlog, ae)
		return apperr.StackResult{Error: &wire}
	}
	if err := h.validatePlan(s.Steps); err != nil {
		wire := apperr.ToWire(h.zlog, err)
		return apperr.StackResult{Error: &wire}
	}
	updated, err := h.repo.Update(s)
	if err != nil {
		ae := mapRepoError(err, s.Name)
		wire := apperr.ToWire(h.zlog, ae)
		return apperr.StackResult{Error: &wire}
	}
	return apperr.StackResult{Data: updated}
}

// DeleteStack removes a stack and its steps (cascade).
func (h *StackHandler) DeleteStack(id string) (res apperr.VoidResult) {
	defer func() {
		if r := recover(); r != nil {
			ae := apperr.Internal(fmt.Errorf(panicMsgFmt, r))
			wire := apperr.ToWire(h.zlog, ae)
			res = apperr.VoidResult{Error: &wire}
		}
	}()
	if err := h.repo.Delete(id); err != nil {
		ae := apperr.Internal(err)
		wire := apperr.ToWire(h.zlog, ae)
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
			wire := apperr.ToWire(h.zlog, ae)
			res = apperr.StackResult{Error: &wire}
		}
	}()
	if strings.TrimSpace(newName) == "" {
		ae := apperr.Validation("newName", "be non-empty", "empty string")
		wire := apperr.ToWire(h.zlog, ae)
		return apperr.StackResult{Error: &wire}
	}
	original, err := h.repo.Get(id)
	if err != nil {
		ae := mapRepoError(err, "")
		wire := apperr.ToWire(h.zlog, ae)
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
		wire := apperr.ToWire(h.zlog, ae)
		return apperr.StackResult{Error: &wire}
	}
	return apperr.StackResult{Data: created}
}
