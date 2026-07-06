package actions

import (
	"fmt"
	"sort"
	"strings"

	"go_text/internal/apperr"
	v3 "go_text/internal/prompts/v3"
)

const (
	maxSteps      = 5
	maxInferences = 3
)

// Planner runs the four-stage chain-planning algorithm defined in spec §3.
type Planner struct {
	catalog map[string]apperr.ActionMeta
}

// NewPlanner constructs a Planner from the v3 action catalog.
func NewPlanner(catalog []apperr.ActionMeta) *Planner {
	m := make(map[string]apperr.ActionMeta, len(catalog))
	for _, a := range catalog {
		m[a.ID] = a
	}
	return &Planner{catalog: m}
}

// Plan runs all four stages and returns a ChainPlan or a typed *apperr.AppError.
func (p *Planner) Plan(req apperr.ChainRequest) (ChainPlan, error) {
	if len(req.Steps) == 0 {
		return ChainPlan{}, apperr.Validation("steps", "at least one step", "0 steps provided")
	}

	for _, s := range req.Steps {
		if _, ok := p.catalog[s.ActionID]; !ok {
			return ChainPlan{}, apperr.Validation("actionId", "a known action ID", s.ActionID)
		}
	}

	if err := p.checkRequirements(req); err != nil {
		return ChainPlan{}, err
	}

	ordered := p.sortCanonical(req.Steps)

	if err := p.checkExclusivity(ordered); err != nil {
		return ChainPlan{}, err
	}

	if len(ordered) > maxSteps {
		return ChainPlan{}, apperr.InvalidPlan(
			fmt.Sprintf("selected %d steps; maximum is %d", len(ordered), maxSteps),
			len(ordered), 0)
	}

	groups := p.mergeGroups(ordered)

	if len(groups) > maxInferences {
		return ChainPlan{}, apperr.InvalidPlan(
			fmt.Sprintf("stack produces %d inference groups; maximum is %d", len(groups), maxInferences),
			len(ordered), len(groups))
	}

	return ChainPlan{Groups: groups, Inferences: len(groups)}, nil
}

// sortCanonical sorts steps: non-terminal before terminal, then by OrderRank ascending,
// then by original insertion index (stable).
func (p *Planner) sortCanonical(steps []apperr.ChainStep) []apperr.ChainStep {
	type indexed struct {
		step  apperr.ChainStep
		meta  apperr.ActionMeta
		index int
	}
	is := make([]indexed, len(steps))
	for i, s := range steps {
		is[i] = indexed{step: s, meta: p.catalog[s.ActionID], index: i}
	}
	sort.SliceStable(is, func(i, j int) bool {
		a, b := is[i], is[j]
		if a.meta.Terminal != b.meta.Terminal {
			return !a.meta.Terminal
		}
		if a.meta.OrderRank != b.meta.OrderRank {
			return a.meta.OrderRank < b.meta.OrderRank
		}
		return a.index < b.index
	})
	out := make([]apperr.ChainStep, len(steps))
	for i, s := range is {
		out[i] = s.step
	}
	return out
}

// checkRequirements returns an InvalidPlan error if any step's action is missing a
// runtime parameter listed in its ActionMeta.Requires. Existence of the ActionID in
// p.catalog is already guaranteed by the caller's preceding loop.
func (p *Planner) checkRequirements(req apperr.ChainRequest) error {
	for _, s := range req.Steps {
		meta := p.catalog[s.ActionID]
		for _, r := range meta.Requires {
			var missing bool
			switch r {
			case v3.ReqInputLang:
				missing = strings.TrimSpace(req.InputLanguageID) == ""
			case v3.ReqOutputLang:
				missing = strings.TrimSpace(req.OutputLanguageID) == ""
			case v3.ReqTargetModel:
				missing = strings.TrimSpace(s.TargetModel) == ""
			case v3.ReqGoal:
				missing = strings.TrimSpace(s.Goal) == ""
			default:
				// Catalog authoring bug (unwired requirement token) — fail closed
				// and say so distinctly, rather than silently letting it through.
				return apperr.InvalidPlan(
					fmt.Sprintf("action %q declares unknown requirement %q", s.ActionID, r),
					len(req.Steps), 0)
			}
			if missing {
				return apperr.InvalidPlan(
					fmt.Sprintf("action %q is missing required parameter %q", s.ActionID, r),
					len(req.Steps), 0)
			}
		}
	}
	return nil
}

// checkExclusivity returns an InvalidPlan error if any non-empty ExclusivityGroup appears twice.
func (p *Planner) checkExclusivity(steps []apperr.ChainStep) error {
	seen := make(map[string]string)
	for _, s := range steps {
		meta := p.catalog[s.ActionID]
		grp := meta.ExclusivityGroup
		if grp == "" {
			continue
		}
		if prev, ok := seen[grp]; ok {
			return apperr.InvalidPlan(
				fmt.Sprintf("exclusivity group %q already contains %q; cannot add %q",
					grp, prev, s.ActionID),
				len(steps), 0)
		}
		seen[grp] = s.ActionID
	}
	return nil
}

// mergeGroups implements spec §3.4: extends the last group when family matches,
// both the new step and the group's first step are Mergeable, and the step is not Terminal.
func (p *Planner) mergeGroups(steps []apperr.ChainStep) []Group {
	var groups []Group
	for _, s := range steps {
		meta := p.catalog[s.ActionID]
		if len(groups) > 0 {
			last := &groups[len(groups)-1]
			lastMeta := p.catalog[last.Steps[0].ActionID]
			if last.Family == meta.Family &&
				meta.Mergeable &&
				lastMeta.Mergeable &&
				!meta.Terminal {
				last.Steps = append(last.Steps, s)
				continue
			}
		}
		groups = append(groups, Group{Family: meta.Family, Steps: []apperr.ChainStep{s}})
	}
	return groups
}
