package actions

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"go_text/internal/apperr"
	v3 "go_text/internal/prompts/v3"
)

// RunChain executes req sequentially through planned inference groups.
//
//   - Settings are resolved once and fixed for the whole chain.
//   - emitProgress is called with "running" before each group and "done"/"failed" after.
//     Pass nil to skip event emission.
//   - On step failure both a partial *ChainResult and a *apperr.AppError (CodeStepFailed) are returned.
//   - On context cancellation both a partial *ChainResult and a *apperr.AppError (CodeCancelled) are returned.
//   - On success the error is nil.
func (a *ActionService) RunChain(
	ctx context.Context,
	req apperr.ChainRequest,
	emitProgress func(apperr.StepProgress),
) (*apperr.ChainResult, error) {
	const op = "ActionService.RunChain"

	if strings.TrimSpace(req.InputText) == "" {
		return nil, apperr.Validation("inputText", "non-empty text", "empty string")
	}
	if len(req.Steps) == 0 {
		return nil, apperr.Validation("steps", "at least one step", "empty slice")
	}

	plan, err := a.planner.Plan(req)
	if err != nil {
		return nil, fmt.Errorf("%s: plan: %w", op, err)
	}

	cfg, err := a.settingsService.GetSettings()
	if err != nil {
		return nil, fmt.Errorf("%s: resolve settings: %w", op, err)
	}

	emit := func(i, total int, family, status string) {
		if emitProgress == nil {
			return
		}
		emitProgress(apperr.StepProgress{
			RunID:       req.RunID,
			GroupIndex:  i,
			TotalGroups: total,
			Family:      family,
			Status:      status,
		})
	}

	input := req.InputText
	completed := 0
	total := len(plan.Groups)

	for i, group := range plan.Groups {
		// Cooperative cancellation: checked before each group so the current group always finishes.
		select {
		case <-ctx.Done():
			return &apperr.ChainResult{
				FinalText: input,
				Completed: completed,
				Error:     apperr.Cancelled(completed).Message,
			}, apperr.Cancelled(completed)
		default:
		}

		emit(i, total, group.Family, "running")

		// Same-language translate short-circuit: skip LLM call, output == input.
		if group.Family == v3.FamilyTranslate &&
			strings.EqualFold(req.InputLanguageID, req.OutputLanguageID) {
			completed++
			emit(i, total, group.Family, "done")
			continue
		}

		sys, user := a.composer.Compose(group, input, req, cfg.InferenceBaseConfig.UseMarkdownForOutput)

		actionIDs := make([]string, len(group.Steps))
		for j, s := range group.Steps {
			actionIDs[j] = s.ActionID
		}

		out, stepErr := a.runStep(ctx, cfg, ChatStepRequest{
			System:      sys,
			User:        user,
			GroupFamily: group.Family,
			ActionIDs:   actionIDs,
			InputText:   input,
			InputLang:   req.InputLanguageID,
			OutputLang:  req.OutputLanguageID,
		})
		if stepErr != nil {
			emit(i, total, group.Family, "failed")
			idx := i

			var ae *apperr.AppError
			if !errors.As(stepErr, &ae) {
				ae = apperr.Internal(stepErr)
			}
			wrapped := apperr.StepFailed(i, group.Family, ae)
			return &apperr.ChainResult{
				FinalText:   input,
				Completed:   completed,
				FailedIndex: &idx,
				Error:       wrapped.Message,
			}, wrapped
		}

		input = out
		completed++
		emit(i, total, group.Family, "done")
	}

	return &apperr.ChainResult{FinalText: input, Completed: completed}, nil
}
