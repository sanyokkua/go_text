package v3_test

import (
	"strings"
	"testing"

	"go_text/internal/apperr"
	v3 "go_text/internal/prompts/v3"
)

func TestCatalog_ExactCount(t *testing.T) {
	const wantCount = 91
	got := v3.Catalog()
	if len(got) != wantCount {
		t.Errorf("Catalog() len = %d, want %d", len(got), wantCount)
	}
}

func TestCatalog_NoDuplicateIDs(t *testing.T) {
	seen := make(map[string]bool)
	for _, a := range v3.Catalog() {
		if seen[a.ID] {
			t.Errorf("duplicate action ID: %q", a.ID)
		}
		seen[a.ID] = true
	}
}

func TestCatalog_DroppedCompositesAbsent(t *testing.T) {
	dropped := []string{
		"everyday.text-to-coworker",
		"everyday.text-to-management",
		"everyday.task-problem-explanation",
	}
	ids := make(map[string]bool)
	for _, a := range v3.Catalog() {
		ids[a.ID] = true
	}
	for _, id := range dropped {
		if ids[id] {
			t.Errorf("dropped composite action %q must not be in catalog", id)
		}
	}
}

func TestCatalog_AllActionsHaveNonEmptyDirective(t *testing.T) {
	for _, a := range v3.Catalog() {
		if strings.TrimSpace(a.Directive) == "" {
			t.Errorf("action %q has empty Directive", a.ID)
		}
	}
}

func TestCatalog_AllActionsHaveNonEmptyNameAndID(t *testing.T) {
	for _, a := range v3.Catalog() {
		if strings.TrimSpace(a.ID) == "" {
			t.Errorf("action has empty ID: %+v", a)
		}
		if strings.TrimSpace(a.Name) == "" {
			t.Errorf("action %q has empty Name", a.ID)
		}
	}
}

// TestCatalog_RequiresTokensAreKnown guards internal/actions.Planner.checkRequirements,
// which fails closed on any Requires token it doesn't recognize: if a future catalog
// entry declares a new requirement constant without wiring it into that switch, every
// chain using it would hard-fail at runtime while this test — not that switch — is the
// first place to catch the mismatch.
func TestCatalog_RequiresTokensAreKnown(t *testing.T) {
	known := map[string]bool{
		v3.ReqInputLang:   true,
		v3.ReqOutputLang:  true,
		v3.ReqTargetModel: true,
		v3.ReqGoal:        true,
	}
	for _, a := range v3.Catalog() {
		for _, r := range a.Requires {
			if !known[r] {
				t.Errorf("action %q declares unrecognized Requires token %q", a.ID, r)
			}
		}
	}
}

func TestCatalog_DefensiveCopy(t *testing.T) {
	c1 := v3.Catalog()
	c2 := v3.Catalog()
	if len(c1) == 0 {
		t.Fatal("Catalog() returned empty slice")
	}
	c1[0].ID = "mutated"
	if c2[0].ID == "mutated" {
		t.Error("Catalog() returned a reference to the internal slice (not a defensive copy)")
	}
}

type wantMeta struct {
	family      string
	category    string
	exclusivity string
	mergeable   bool
	terminal    bool
	orderRank   int
	requires    []string
}

func TestCatalog_MetadataCorrectness(t *testing.T) {
	byID := make(map[string]apperr.ActionMeta)
	for _, a := range v3.Catalog() {
		byID[a.ID] = a
	}

	// Each row: id, then want fields in wantMeta declaration order:
	// family, category, exclusivity, mergeable, terminal, orderRank, requires
	rw := func(cat, excl string, rank int) wantMeta {
		return wantMeta{family: "rewrite", category: cat, exclusivity: excl, mergeable: true, terminal: false, orderRank: rank}
	}
	st := func(cat, excl string, rank int, merge bool) wantMeta {
		return wantMeta{family: "structure", category: cat, exclusivity: excl, mergeable: merge, terminal: false, orderRank: rank}
	}
	sum := func() wantMeta {
		return wantMeta{family: "summarize", category: "Summarization", exclusivity: "summarize", mergeable: false, terminal: true, orderRank: 80}
	}
	tr := func(req []string) wantMeta {
		return wantMeta{family: "translate", category: "Translation", exclusivity: "translate", mergeable: false, terminal: true, orderRank: 90, requires: req}
	}
	pe := func(req []string) wantMeta {
		return wantMeta{family: "prompteng", category: "Prompt Engineering", exclusivity: "prompteng", mergeable: false, terminal: true, orderRank: 100, requires: req}
	}

	tests := []struct {
		id   string
		want wantMeta
	}{
		// proofread — mergeable, non-terminal, orderRank=10
		{"rewrite.proofread.basic", rw("Proofreading", "proofread", 10)},
		{"rewrite.proofread.enhanced", rw("Proofreading", "proofread", 10)},
		{"rewrite.proofread.consistency", rw("Proofreading", "proofread", 10)},
		{"rewrite.proofread.readability", rw("Proofreading", "proofread", 10)},
		{"rewrite.proofread.clarification", rw("Proofreading", "proofread", 10)},
		// rewrite-intent — mergeable, non-terminal, orderRank=20
		{"rewrite.intent.concise", rw("Rewriting", "rewrite-intent", 20)},
		{"rewrite.intent.simplify", rw("Rewriting", "rewrite-intent", 20)},
		{"rewrite.intent.paraphrase", rw("Rewriting", "rewrite-intent", 20)},
		{"rewrite.intent.humanize", rw("Rewriting", "rewrite-intent", 20)},
		{"rewrite.intent.professionalize", rw("Rewriting", "rewrite-intent", 20)},
		// tone — mergeable, non-terminal, orderRank=30
		{"rewrite.tone.professional", rw("Tone", "tone", 30)},
		{"rewrite.tone.friendly", rw("Tone", "tone", 30)},
		{"rewrite.tone.neutral", rw("Tone", "tone", 30)},
		{"rewrite.tone.direct", rw("Tone", "tone", 30)},
		{"rewrite.tone.indirect", rw("Tone", "tone", 30)},
		{"rewrite.tone.enthusiastic", rw("Tone", "tone", 30)},
		{"rewrite.tone.formal", rw("Tone", "tone", 30)},
		{"rewrite.tone.warm", rw("Tone", "tone", 30)},
		{"rewrite.tone.empathetic", rw("Tone", "tone", 30)},
		{"rewrite.tone.confident", rw("Tone", "tone", 30)},
		{"rewrite.tone.assertive", rw("Tone", "tone", 30)},
		{"rewrite.tone.diplomatic", rw("Tone", "tone", 30)},
		{"rewrite.tone.collaborative", rw("Tone", "tone", 30)},
		{"rewrite.tone.respectful", rw("Tone", "tone", 30)},
		{"rewrite.tone.educational", rw("Tone", "tone", 30)},
		{"rewrite.tone.supportive", rw("Tone", "tone", 30)},
		{"rewrite.tone.reassuring", rw("Tone", "tone", 30)},
		{"rewrite.tone.authoritative", rw("Tone", "tone", 30)},
		{"rewrite.tone.serious", rw("Tone", "tone", 30)},
		{"rewrite.tone.casual", rw("Tone", "tone", 30)},
		// style — mergeable, non-terminal, orderRank=40
		{"rewrite.style.formal", rw("Style", "style", 40)},
		{"rewrite.style.semi-formal", rw("Style", "style", 40)},
		{"rewrite.style.casual", rw("Style", "style", 40)},
		{"rewrite.style.academic", rw("Style", "style", 40)},
		{"rewrite.style.technical", rw("Style", "style", 40)},
		{"rewrite.style.journalistic", rw("Style", "style", 40)},
		{"rewrite.style.creative", rw("Style", "style", 40)},
		{"rewrite.style.seo", rw("Style", "style", 40)},
		{"rewrite.style.risk-reduce", rw("Style", "style", 40)},
		{"rewrite.style.conversational", rw("Style", "style", 40)},
		{"rewrite.style.persuasive", rw("Style", "style", 40)},
		{"rewrite.style.executive", rw("Style", "style", 40)},
		{"rewrite.style.documentation", rw("Style", "style", 40)},
		{"rewrite.style.instructional", rw("Style", "style", 40)},
		{"rewrite.style.support", rw("Style", "style", 40)},
		// format — mergeable, non-terminal, orderRank=50, NO exclusivity (composable)
		{"structure.format.markdown", st("Format", "", 50, true)},
		{"structure.format.prose", st("Format", "", 50, true)},
		{"structure.format.bullets", st("Format", "", 50, true)},
		{"structure.format.numbered", st("Format", "", 50, true)},
		{"structure.format.headings", st("Format", "", 50, true)},
		{"structure.format.table", st("Format", "", 50, true)},
		{"structure.format.steps", st("Format", "", 50, true)},
		// doc — non-mergeable, non-terminal, orderRank=60, exclusive
		{"structure.doc.faq", st("Document Structure", "doc-structure", 60, false)},
		{"structure.doc.userstory", st("Document Structure", "doc-structure", 60, false)},
		{"structure.doc.techspec", st("Document Structure", "doc-structure", 60, false)},
		{"structure.doc.meetingnotes", st("Document Structure", "doc-structure", 60, false)},
		{"structure.doc.proposal", st("Document Structure", "doc-structure", 60, false)},
		{"structure.doc.report", st("Document Structure", "doc-structure", 60, false)},
		{"structure.doc.email", st("Document Structure", "doc-structure", 60, false)},
		{"structure.doc.blog", st("Document Structure", "doc-structure", 60, false)},
		{"structure.doc.social", st("Document Structure", "doc-structure", 60, false)},
		{"structure.doc.resume", st("Document Structure", "doc-structure", 60, false)},
		{"structure.doc.headline", st("Document Structure", "doc-structure", 60, false)},
		{"structure.doc.tagline", st("Document Structure", "doc-structure", 60, false)},
		{"structure.doc.readme", st("Document Structure", "doc-structure", 60, false)},
		{"structure.doc.changelog", st("Document Structure", "doc-structure", 60, false)},
		{"structure.doc.releasenotes", st("Document Structure", "doc-structure", 60, false)},
		{"structure.doc.adr", st("Document Structure", "doc-structure", 60, false)},
		{"structure.doc.rfc", st("Document Structure", "doc-structure", 60, false)},
		{"structure.doc.apidocs", st("Document Structure", "doc-structure", 60, false)},
		{"structure.doc.tutorial", st("Document Structure", "doc-structure", 60, false)},
		{"structure.doc.userguide", st("Document Structure", "doc-structure", 60, false)},
		{"structure.doc.newsletter", st("Document Structure", "doc-structure", 60, false)},
		{"structure.doc.linkedin", st("Document Structure", "doc-structure", 60, false)},
		{"structure.doc.xpost", st("Document Structure", "doc-structure", 60, false)},
		{"structure.doc.instagram", st("Document Structure", "doc-structure", 60, false)},
		// summarize — non-mergeable, terminal, orderRank=80
		{"summarize.summary", sum()},
		{"summarize.keypoints", sum()},
		{"summarize.tldr", sum()},
		{"summarize.executive", sum()},
		{"summarize.eli5", sum()},
		{"summarize.hashtags", sum()},
		// translate — terminal, requires language pair
		{"translate.text", tr([]string{"input_language", "output_language"})},
		{"translate.localize", tr([]string{"input_language", "output_language"})},
		{"translate.dictionary", tr([]string{"input_language", "output_language"})},
		{"translate.examples", tr([]string{"output_language"})},
		// prompteng — terminal
		{"prompteng.text.improve", pe(nil)},
		{"prompteng.text.compress", pe(nil)},
		{"prompteng.text.expand", pe(nil)},
		{"prompteng.image", pe([]string{"target_model", "goal"})},
		{"prompteng.video", pe([]string{"target_model"})},
	}

	for _, tt := range tests {
		t.Run(tt.id, func(t *testing.T) {
			a, ok := byID[tt.id]
			if !ok {
				t.Fatalf("action %q not found in catalog", tt.id)
			}
			assertActionFields(t, a, tt.want)
		})
	}
}

func assertActionFields(t *testing.T, a apperr.ActionMeta, w wantMeta) {
	t.Helper()
	if a.Family != w.family {
		t.Errorf("Family = %q, want %q", a.Family, w.family)
	}
	if a.Category != w.category {
		t.Errorf("Category = %q, want %q", a.Category, w.category)
	}
	if a.Mergeable != w.mergeable {
		t.Errorf("Mergeable = %v, want %v", a.Mergeable, w.mergeable)
	}
	if a.Terminal != w.terminal {
		t.Errorf("Terminal = %v, want %v", a.Terminal, w.terminal)
	}
	if a.ExclusivityGroup != w.exclusivity {
		t.Errorf("ExclusivityGroup = %q, want %q", a.ExclusivityGroup, w.exclusivity)
	}
	if a.OrderRank != w.orderRank {
		t.Errorf("OrderRank = %d, want %d", a.OrderRank, w.orderRank)
	}
	if !stringSlicesEqual(a.Requires, w.requires) {
		t.Errorf("Requires = %v, want %v", a.Requires, w.requires)
	}
}

func stringSlicesEqual(a, b []string) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}
