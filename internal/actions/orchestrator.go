package actions

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"go_text/internal/apperr"
	v3 "go_text/internal/prompts/v3"
	"go_text/internal/settings"
)

// Chain-run outcome statuses logged and reported alongside run_id correlation.
const (
	chainStatusDone      = "done"
	chainStatusFailed    = "failed"
	chainStatusCancelled = "cancelled"

	chainFinishedMsg = "chain run finished"
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
	startTime := time.Now()

	lg := a.logger.WithOp(op).With().
		Str("component", "actions").
		Str("run_id", req.RunID).
		Logger()

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

	total := len(plan.Groups)
	lg.Info().
		Int("groups", total).
		Int("steps", len(req.Steps)).
		Msg("chain run starting")

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

	logFinished := func(status string, runErr error) {
		ev := lg.Info()
		if status == chainStatusFailed {
			ev = lg.Error()
		}
		if runErr != nil {
			ev = ev.Err(runErr)
		}
		ev.Str("status", status).
			Int("completed", completed).
			Int64("duration_ms", time.Since(startTime).Milliseconds()).
			Msg(chainFinishedMsg)
	}

	for i, group := range plan.Groups {
		// Cooperative cancellation: checked before each group so the current group always finishes.
		select {
		case <-ctx.Done():
			cancelErr := apperr.Cancelled(completed)
			partialResult := &apperr.ChainResult{
				FinalText: input,
				Completed: completed,
				Error:     cancelErr.Message,
			}
			a.recordChainHistory(req, plan, cfg, partialResult, cancelErr, completed, time.Since(startTime))
			logFinished(chainStatusCancelled, cancelErr)
			return partialResult, cancelErr
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
			RunID:       req.RunID,
		})
		if stepErr != nil {
			var ae *apperr.AppError
			isAppErr := errors.As(stepErr, &ae)

			// A cancelled in-flight HTTP call surfaces the same way a between-groups
			// cancellation already does: normalize both to the identical partial-result/
			// history/logging shape instead of wrapping it as a step failure. Safe to treat
			// any CodeCancelled step error as this run's own cancellation: mapTransportError
			// is the sole producer of CodeCancelled below runStep, and it only fires on
			// context.Canceled — which this run's ctx (context.WithCancel per-run, see
			// ActionHandler.ProcessPromptChain) is the only source of.
			if isAppErr && ae.Code == apperr.CodeCancelled {
				cancelErr := apperr.Cancelled(completed)
				partialResult := &apperr.ChainResult{
					FinalText: input,
					Completed: completed,
					Error:     cancelErr.Message,
				}
				a.recordChainHistory(req, plan, cfg, partialResult, cancelErr, completed, time.Since(startTime))
				logFinished(chainStatusCancelled, cancelErr)
				return partialResult, cancelErr
			}

			emit(i, total, group.Family, "failed")
			idx := i
			if !isAppErr {
				ae = apperr.Internal(stepErr)
			}
			wrapped := apperr.StepFailed(i, group.Family, ae)
			failedResult := &apperr.ChainResult{
				FinalText:   input,
				Completed:   completed,
				FailedIndex: &idx,
				Error:       wrapped.Message,
			}
			a.recordChainHistory(req, plan, cfg, failedResult, wrapped, completed, time.Since(startTime))
			logFinished(chainStatusFailed, wrapped)
			return failedResult, wrapped
		}

		input = out
		completed++
		emit(i, total, group.Family, "done")
	}

	successResult := &apperr.ChainResult{FinalText: input, Completed: completed}
	a.recordChainHistory(req, plan, cfg, successResult, nil, completed, time.Since(startTime))
	logFinished(chainStatusDone, nil)
	return successResult, nil
}

// recordChainHistory builds and records one HistoryEntry per RunChain call.
// All errors are swallowed by historyService.Record — recording never breaks a run.
func (a *ActionService) recordChainHistory(
	req apperr.ChainRequest,
	plan ChainPlan,
	cfg *settings.Settings,
	result *apperr.ChainResult,
	runErr error,
	completed int,
	duration time.Duration,
) {
	applied := make([]apperr.AppliedAction, 0)
	for i := 0; i < completed && i < len(plan.Groups); i++ {
		for _, step := range plan.Groups[i].Steps {
			for _, m := range a.catalog {
				if m.ID == step.ActionID {
					applied = append(applied, apperr.AppliedAction{
						ID:       m.ID,
						Name:     m.Name,
						Category: m.Category,
					})
					break
				}
			}
		}
	}

	ids := make([]string, len(req.Steps))
	for i, s := range req.Steps {
		ids[i] = s.ActionID
	}
	title := strings.Join(ids, " + ")
	if len(title) > 120 {
		title = title[:120] + "…"
	}

	kind := "stack"
	if len(req.Steps) == 1 {
		kind = "single"
	}

	status := "success"
	errorCode := ""
	failedIndex := -1
	if runErr != nil {
		if completed > 0 {
			status = "partial"
		} else {
			status = "error"
		}
		var ae *apperr.AppError
		if errors.As(runErr, &ae) {
			errorCode = string(ae.Code)
		}
	}
	if result != nil && result.FailedIndex != nil {
		failedIndex = *result.FailedIndex
	}

	outputText := ""
	if result != nil {
		outputText = result.FinalText
	}

	providerName := ""
	model := ""
	if cfg != nil {
		providerName = cfg.CurrentProviderConfig.Name
		model = cfg.ModelConfig.Name
	}

	a.historyService.Record(apperr.HistoryEntry{
		ID:           req.RunID,
		Kind:         kind,
		Title:        title,
		InputText:    req.InputText,
		OutputText:   outputText,
		Applied:      applied,
		ProviderName: providerName,
		Model:        model,
		InputLang:    req.InputLanguageID,
		OutputLang:   req.OutputLanguageID,
		DurationMs:   duration.Milliseconds(),
		Inferences:   completed,
		Status:       status,
		ErrorCode:    errorCode,
		FailedIndex:  failedIndex,
	})
}
