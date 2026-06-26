package actions

import (
	"testing"

	"go_text/internal/apperr"
	v3 "go_text/internal/prompts/v3"
)

func testCatalog() []apperr.ActionMeta {
	return []apperr.ActionMeta{
		// Rewrite — mergeable, non-terminal
		{ID: "rewrite.proofread.basic", Family: v3.FamilyRewrite, OrderRank: 10, ExclusivityGroup: "proofread", Mergeable: true, Terminal: false},
		{ID: "rewrite.proofread.enhanced", Family: v3.FamilyRewrite, OrderRank: 10, ExclusivityGroup: "proofread", Mergeable: true, Terminal: false},
		{ID: "rewrite.tone.professional", Family: v3.FamilyRewrite, OrderRank: 30, ExclusivityGroup: "tone", Mergeable: true, Terminal: false},
		{ID: "rewrite.tone.friendly", Family: v3.FamilyRewrite, OrderRank: 30, ExclusivityGroup: "tone", Mergeable: true, Terminal: false},
		{ID: "rewrite.intent.concise", Family: v3.FamilyRewrite, OrderRank: 20, ExclusivityGroup: "rewrite-intent", Mergeable: true, Terminal: false},
		{ID: "rewrite.style.formal", Family: v3.FamilyRewrite, OrderRank: 40, ExclusivityGroup: "style", Mergeable: true, Terminal: false},
		// Structure — format (composable), doc (exclusive, non-mergeable)
		{ID: "structure.format.bullets", Family: v3.FamilyStructure, OrderRank: 50, ExclusivityGroup: "", Mergeable: true, Terminal: false},
		{ID: "structure.format.headings", Family: v3.FamilyStructure, OrderRank: 50, ExclusivityGroup: "", Mergeable: true, Terminal: false},
		{ID: "structure.doc.faq", Family: v3.FamilyStructure, OrderRank: 60, ExclusivityGroup: "doc-structure", Mergeable: false, Terminal: false},
		{ID: "structure.doc.report", Family: v3.FamilyStructure, OrderRank: 60, ExclusivityGroup: "doc-structure", Mergeable: false, Terminal: false},
		// Summarize — terminal
		{ID: "summarize.summary", Family: v3.FamilySummarize, OrderRank: 80, ExclusivityGroup: "summarize", Mergeable: false, Terminal: true},
		// Translate — terminal
		{ID: "translate.text", Family: v3.FamilyTranslate, OrderRank: 90, ExclusivityGroup: "translate", Mergeable: false, Terminal: true},
		// PromptEng — terminal
		{ID: "prompteng.text.improve", Family: v3.FamilyPromptEng, OrderRank: 100, ExclusivityGroup: "prompteng", Mergeable: false, Terminal: true},
	}
}

func step(id string) apperr.ChainStep { return apperr.ChainStep{ActionID: id} }

func TestPlanner_Plan_CanonicalOrdering(t *testing.T) {
	p := NewPlanner(testCatalog())

	tests := []struct {
		name       string
		input      []apperr.ChainStep
		wantOrder  []string
		wantGroups int
	}{
		{
			name:       "already in order",
			input:      []apperr.ChainStep{step("rewrite.proofread.basic"), step("rewrite.tone.professional")},
			wantOrder:  []string{"rewrite.proofread.basic", "rewrite.tone.professional"},
			wantGroups: 1,
		},
		{
			name:       "reversed input → canonical output",
			input:      []apperr.ChainStep{step("rewrite.tone.professional"), step("rewrite.proofread.basic")},
			wantOrder:  []string{"rewrite.proofread.basic", "rewrite.tone.professional"},
			wantGroups: 1,
		},
		{
			name:       "terminal action pinned to end regardless of input position",
			input:      []apperr.ChainStep{step("summarize.summary"), step("rewrite.proofread.basic")},
			wantOrder:  []string{"rewrite.proofread.basic", "summarize.summary"},
			wantGroups: 2,
		},
		{
			name:       "multi-family: rewrite, structure, summarize",
			input:      []apperr.ChainStep{step("summarize.summary"), step("structure.format.bullets"), step("rewrite.proofread.basic")},
			wantOrder:  []string{"rewrite.proofread.basic", "structure.format.bullets", "summarize.summary"},
			wantGroups: 3,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			plan, err := p.Plan(apperr.ChainRequest{Steps: tt.input})
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if plan.Inferences != tt.wantGroups {
				t.Errorf("groups: got %d, want %d", plan.Inferences, tt.wantGroups)
			}
			var got []string
			for _, g := range plan.Groups {
				for _, s := range g.Steps {
					got = append(got, s.ActionID)
				}
			}
			if len(got) != len(tt.wantOrder) {
				t.Fatalf("step count: got %d, want %d: %v", len(got), len(tt.wantOrder), got)
			}
			for i := range tt.wantOrder {
				if got[i] != tt.wantOrder[i] {
					t.Errorf("step[%d]: got %q, want %q", i, got[i], tt.wantOrder[i])
				}
			}
		})
	}
}

func TestPlanner_Plan_ExclusivityDedupe(t *testing.T) {
	p := NewPlanner(testCatalog())

	tests := []struct {
		name    string
		input   []apperr.ChainStep
		wantErr bool
	}{
		{
			name:    "two actions in same exclusivity group → error",
			input:   []apperr.ChainStep{step("rewrite.tone.professional"), step("rewrite.tone.friendly")},
			wantErr: true,
		},
		{
			name:    "two proofread actions → error",
			input:   []apperr.ChainStep{step("rewrite.proofread.basic"), step("rewrite.proofread.enhanced")},
			wantErr: true,
		},
		{
			name:    "two doc-structure actions → error",
			input:   []apperr.ChainStep{step("structure.doc.faq"), step("structure.doc.report")},
			wantErr: true,
		},
		{
			name:    "two format actions (empty exclusivity) → ok",
			input:   []apperr.ChainStep{step("structure.format.bullets"), step("structure.format.headings")},
			wantErr: false,
		},
		{
			name:    "different exclusivity groups → ok",
			input:   []apperr.ChainStep{step("rewrite.proofread.basic"), step("rewrite.tone.professional")},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := p.Plan(apperr.ChainRequest{Steps: tt.input})
			if (err != nil) != tt.wantErr {
				t.Errorf("error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestPlanner_Plan_Caps(t *testing.T) {
	p := NewPlanner(testCatalog())

	sixSteps := []apperr.ChainStep{
		step("rewrite.proofread.basic"),
		step("rewrite.intent.concise"),
		step("rewrite.tone.professional"),
		step("rewrite.style.formal"),
		step("structure.format.bullets"),
		step("structure.format.headings"),
	}
	_, err := p.Plan(apperr.ChainRequest{Steps: sixSteps})
	if err == nil {
		t.Fatal("expected error for 6 steps, got nil")
	}

	fourGroups := []apperr.ChainStep{
		step("rewrite.proofread.basic"),
		step("structure.doc.faq"),
		step("summarize.summary"),
		step("translate.text"),
	}
	_, err = p.Plan(apperr.ChainRequest{Steps: fourGroups})
	if err == nil {
		t.Fatal("expected error for 4 inference groups, got nil")
	}
}

func TestPlanner_Plan_MergeGrouping(t *testing.T) {
	p := NewPlanner(testCatalog())

	tests := []struct {
		name       string
		input      []apperr.ChainStep
		wantGroups int
		wantFamily []string
	}{
		{
			name:       "single action → one group",
			input:      []apperr.ChainStep{step("rewrite.proofread.basic")},
			wantGroups: 1,
			wantFamily: []string{v3.FamilyRewrite},
		},
		{
			name:       "two mergeable Rewrite → one group",
			input:      []apperr.ChainStep{step("rewrite.proofread.basic"), step("rewrite.tone.professional")},
			wantGroups: 1,
			wantFamily: []string{v3.FamilyRewrite},
		},
		{
			name:       "Rewrite + Structure(doc,non-mergeable) → two groups",
			input:      []apperr.ChainStep{step("rewrite.proofread.basic"), step("structure.doc.faq")},
			wantGroups: 2,
			wantFamily: []string{v3.FamilyRewrite, v3.FamilyStructure},
		},
		{
			name:       "two format actions (mergeable) → one Structure group",
			input:      []apperr.ChainStep{step("structure.format.bullets"), step("structure.format.headings")},
			wantGroups: 1,
			wantFamily: []string{v3.FamilyStructure},
		},
		{
			name:       "proofread+tone+bullets+summary → 3 groups",
			input:      []apperr.ChainStep{step("rewrite.proofread.basic"), step("rewrite.tone.professional"), step("structure.format.bullets"), step("summarize.summary")},
			wantGroups: 3,
			wantFamily: []string{v3.FamilyRewrite, v3.FamilyStructure, v3.FamilySummarize},
		},
		{
			name:       "Rewrite + terminal Summarize → two groups",
			input:      []apperr.ChainStep{step("rewrite.proofread.basic"), step("summarize.summary")},
			wantGroups: 2,
			wantFamily: []string{v3.FamilyRewrite, v3.FamilySummarize},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			plan, err := p.Plan(apperr.ChainRequest{Steps: tt.input})
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if plan.Inferences != tt.wantGroups {
				t.Errorf("groups: got %d, want %d", plan.Inferences, tt.wantGroups)
			}
			for i, g := range plan.Groups {
				if i < len(tt.wantFamily) && g.Family != tt.wantFamily[i] {
					t.Errorf("group[%d].Family: got %q, want %q", i, g.Family, tt.wantFamily[i])
				}
			}
		})
	}
}

func TestPlanner_Plan_EmptySteps(t *testing.T) {
	p := NewPlanner(testCatalog())
	_, err := p.Plan(apperr.ChainRequest{Steps: nil})
	if err == nil {
		t.Fatal("expected error for empty steps, got nil")
	}
}

func TestPlanner_Plan_UnknownActionID(t *testing.T) {
	p := NewPlanner(testCatalog())
	_, err := p.Plan(apperr.ChainRequest{Steps: []apperr.ChainStep{{ActionID: "does.not.exist"}}})
	if err == nil {
		t.Fatal("expected error for unknown action ID, got nil")
	}
}
