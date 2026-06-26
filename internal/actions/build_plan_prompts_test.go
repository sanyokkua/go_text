package actions

import (
	"strings"
	"testing"

	"go_text/internal/apperr"
	v3 "go_text/internal/prompts/v3"
)

// buildTestService creates a minimal ActionService using the real v3 catalog without
// an LLM backend — sufficient for testing planning and composition.
func buildTestService(t *testing.T) *ActionService {
	t.Helper()
	catalog := v3.Catalog()
	return &ActionService{
		catalog:  catalog,
		planner:  NewPlanner(catalog),
		composer: NewComposer(catalog),
	}
}

func TestActionService_BuildPlanAndPrompts_SingleAction(t *testing.T) {
	svc := buildTestService(t)
	preview, err := svc.BuildPlanAndPrompts(apperr.PromptPreviewRequest{
		ActionID:    "rewrite.proofread.basic",
		SampleInput: "Hello world",
		UseMarkdown: false,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if preview == nil {
		t.Fatal("expected non-nil preview")
	}
	if preview.Inferences != 1 {
		t.Errorf("inferences: got %d, want 1", preview.Inferences)
	}
	if preview.Kind != "single" {
		t.Errorf("kind: got %q, want %q", preview.Kind, "single")
	}
	if len(preview.Groups) != 1 {
		t.Fatalf("groups: got %d, want 1", len(preview.Groups))
	}
	g := preview.Groups[0]
	if g.Family != v3.FamilyRewrite {
		t.Errorf("family: got %q, want %q", g.Family, v3.FamilyRewrite)
	}
	if !strings.Contains(g.UserPrompt, "Hello world") {
		t.Error("user prompt should contain sample input")
	}
	if g.SystemPrompt == "" {
		t.Error("system prompt should not be empty")
	}
	if len(g.AppliedActions) != 1 {
		t.Fatalf("applied actions: got %d, want 1", len(g.AppliedActions))
	}
	if g.AppliedActions[0].ID != "rewrite.proofread.basic" {
		t.Errorf("applied action ID: got %q, want %q", g.AppliedActions[0].ID, "rewrite.proofread.basic")
	}
}

func TestActionService_BuildPlanAndPrompts_ThreeGroupPlan(t *testing.T) {
	svc := buildTestService(t)
	preview, err := svc.BuildPlanAndPrompts(apperr.PromptPreviewRequest{
		Steps: []apperr.ChainStep{
			{ActionID: "rewrite.proofread.basic"},
			{ActionID: "structure.format.bullets"},
			{ActionID: "summarize.summary"},
		},
		SampleInput: "sample",
		UseMarkdown: false,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if preview.Kind != "chain" {
		t.Errorf("kind: got %q, want %q", preview.Kind, "chain")
	}
	if preview.Inferences != 3 {
		t.Errorf("inferences: got %d, want 3", preview.Inferences)
	}
	if len(preview.Groups) != 3 {
		t.Fatalf("groups: got %d, want 3", len(preview.Groups))
	}
	if preview.Groups[0].Family != v3.FamilyRewrite {
		t.Errorf("group[0] family: got %q, want %q", preview.Groups[0].Family, v3.FamilyRewrite)
	}
	if preview.Groups[1].Family != v3.FamilyStructure {
		t.Errorf("group[1] family: got %q, want %q", preview.Groups[1].Family, v3.FamilyStructure)
	}
	if preview.Groups[2].Family != v3.FamilySummarize {
		t.Errorf("group[2] family: got %q, want %q", preview.Groups[2].Family, v3.FamilySummarize)
	}
}

func TestActionService_BuildPlanAndPrompts_MergedRewriteGroup(t *testing.T) {
	svc := buildTestService(t)
	preview, err := svc.BuildPlanAndPrompts(apperr.PromptPreviewRequest{
		Steps: []apperr.ChainStep{
			{ActionID: "rewrite.proofread.basic"},
			{ActionID: "rewrite.tone.professional"},
		},
		SampleInput: "Test input",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if preview.Inferences != 1 {
		t.Errorf("merged Rewrite should produce 1 inference group, got %d", preview.Inferences)
	}
	if len(preview.Groups[0].AppliedActions) != 2 {
		t.Errorf("merged group should have 2 applied actions, got %d", len(preview.Groups[0].AppliedActions))
	}
	// Context injected exactly once
	if strings.Count(preview.Groups[0].UserPrompt, "<<<UserText Start>>>") != 1 {
		t.Error("merged Rewrite user prompt should contain context block exactly once")
	}
}

func TestActionService_BuildPlanAndPrompts_InvalidPlan_ExclusivityViolation(t *testing.T) {
	svc := buildTestService(t)
	_, err := svc.BuildPlanAndPrompts(apperr.PromptPreviewRequest{
		Steps: []apperr.ChainStep{
			{ActionID: "rewrite.tone.professional"},
			{ActionID: "rewrite.tone.friendly"},
		},
	})
	if err == nil {
		t.Fatal("expected error for exclusivity violation, got nil")
	}
}

func TestActionService_BuildPlanAndPrompts_InvalidPlan_CapViolation(t *testing.T) {
	svc := buildTestService(t)
	_, err := svc.BuildPlanAndPrompts(apperr.PromptPreviewRequest{
		Steps: []apperr.ChainStep{
			{ActionID: "rewrite.proofread.basic"},
			{ActionID: "rewrite.intent.concise"},
			{ActionID: "rewrite.tone.professional"},
			{ActionID: "rewrite.style.formal"},
			{ActionID: "structure.format.bullets"},
			{ActionID: "structure.format.headings"},
		},
	})
	if err == nil {
		t.Fatal("expected error for 6 steps (cap=5), got nil")
	}
}

func TestActionService_BuildPlanAndPrompts_SummaryFormat(t *testing.T) {
	svc := buildTestService(t)
	preview, err := svc.BuildPlanAndPrompts(apperr.PromptPreviewRequest{
		ActionID: "rewrite.proofread.basic",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !strings.Contains(preview.Summary, "1 step") {
		t.Errorf("summary should mention step count, got %q", preview.Summary)
	}
	if !strings.Contains(preview.Summary, "1 inference") {
		t.Errorf("summary should mention inference count, got %q", preview.Summary)
	}
}
