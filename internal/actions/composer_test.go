package actions

import (
	"strings"
	"testing"

	"go_text/internal/apperr"
	v3 "go_text/internal/prompts/v3"
)

func composerTestCatalog() []apperr.ActionMeta {
	return []apperr.ActionMeta{
		// Rewrite — short directives, NO embedded {{user_text}}
		{
			ID: "rewrite.proofread.basic", Family: v3.FamilyRewrite,
			Directive:        "Correct grammar, spelling, and punctuation.",
			OrderRank:        10,
			ExclusivityGroup: "proofread",
			Mergeable:        true,
		},
		{
			ID: "rewrite.tone.professional", Family: v3.FamilyRewrite,
			Directive:        "Adjust the tone to be professional.",
			OrderRank:        30,
			ExclusivityGroup: "tone",
			Mergeable:        true,
		},
		// Structure format — full templates with embedded context block
		{
			ID: "structure.format.bullets", Family: v3.FamilyStructure,
			Directive:        "Task: Format the text below as a bullet list.\n- One idea per bullet.\n\n<<<UserText Start>>>\n{{user_text}}\n<<<UserText End>>>\n\nFormat: {{user_format}}",
			OrderRank:        50,
			ExclusivityGroup: "",
			Mergeable:        true,
		},
		{
			ID: "structure.format.headings", Family: v3.FamilyStructure,
			Directive:        "Task: Organize the text below under clear headings.\n- Group related content.\n\n<<<UserText Start>>>\n{{user_text}}\n<<<UserText End>>>\n\nFormat: {{user_format}}",
			OrderRank:        50,
			ExclusivityGroup: "",
			Mergeable:        true,
		},
		// Structure doc — full template, non-mergeable
		{
			ID: "structure.doc.faq", Family: v3.FamilyStructure,
			Directive:        "Task: Structure the text below as an FAQ.\n- Derive Q&A pairs.\n\n<<<UserText Start>>>\n{{user_text}}\n<<<UserText End>>>\n\nFormat: {{user_format}}",
			OrderRank:        60,
			ExclusivityGroup: "doc-structure",
			Mergeable:        false,
		},
		// Summarize
		{
			ID: "summarize.summary", Family: v3.FamilySummarize,
			Directive:        "Task: Write a concise summary.\n\n<<<UserText Start>>>\n{{user_text}}\n<<<UserText End>>>\n\nFormat: {{user_format}}",
			OrderRank:        80,
			ExclusivityGroup: "summarize",
			Mergeable:        false,
			Terminal:         true,
		},
		// Translate
		{
			ID: "translate.text", Family: v3.FamilyTranslate,
			Directive:        "Task: Translate from {{input_language}} to {{output_language}}.\n\n<<<UserText Start>>>\n{{user_text}}\n<<<UserText End>>>\n\nFormat: {{user_format}}",
			OrderRank:        90,
			ExclusivityGroup: "translate",
			Mergeable:        false,
			Terminal:         true,
			Requires:         []string{"input_language", "output_language"},
		},
		// PromptEng text
		{
			ID: "prompteng.text.improve", Family: v3.FamilyPromptEng,
			Directive:        "Task: Improve the prompt below.\n\n<<<UserText Start>>>\n{{user_text}}\n<<<UserText End>>>\n\nFormat: {{user_format}}",
			OrderRank:        100,
			ExclusivityGroup: "prompteng",
			Mergeable:        false,
			Terminal:         true,
		},
		// PromptEng image
		{
			ID: "prompteng.image", Family: v3.FamilyPromptEng,
			Directive:        "Task: Build an image prompt for \"{{target_model}}\" with goal \"{{goal}}\".\n\n<<<UserText Start>>>\n{{user_text}}\n<<<UserText End>>>\n\nTarget: {{target_model}}\nGoal: {{goal}}\nFormat: {{user_format}}",
			OrderRank:        100,
			ExclusivityGroup: "prompteng",
			Mergeable:        false,
			Terminal:         true,
			Requires:         []string{"target_model", "goal"},
		},
		// PromptEng video
		{
			ID: "prompteng.video", Family: v3.FamilyPromptEng,
			Directive:        "Task: Build a video prompt for \"{{target_model}}\".\n\n<<<UserText Start>>>\n{{user_text}}\n<<<UserText End>>>\n\nTarget: {{target_model}}\nFormat: {{user_format}}",
			OrderRank:        100,
			ExclusivityGroup: "prompteng",
			Mergeable:        false,
			Terminal:         true,
			Requires:         []string{"target_model"},
		},
	}
}

func groupOf(family string, ids ...string) Group {
	steps := make([]apperr.ChainStep, len(ids))
	for i, id := range ids {
		steps[i] = apperr.ChainStep{ActionID: id}
	}
	return Group{Family: family, Steps: steps}
}

func TestComposer_SystemPromptSelection(t *testing.T) {
	c := NewComposer(composerTestCatalog())
	tests := []struct {
		name       string
		group      Group
		wantSystem string
	}{
		{"rewrite → SysRewrite", groupOf(v3.FamilyRewrite, "rewrite.proofread.basic"), v3.SysRewrite},
		{"structure format → SysStructureFormat", groupOf(v3.FamilyStructure, "structure.format.bullets"), v3.SysStructureFormat},
		{"structure doc → SysStructureDoc", groupOf(v3.FamilyStructure, "structure.doc.faq"), v3.SysStructureDoc},
		{"summarize → SysSummarize", groupOf(v3.FamilySummarize, "summarize.summary"), v3.SysSummarize},
		{"translate → SysTranslate", groupOf(v3.FamilyTranslate, "translate.text"), v3.SysTranslate},
		{"prompteng text → SysPromptEngText", groupOf(v3.FamilyPromptEng, "prompteng.text.improve"), v3.SysPromptEngText},
		{"prompteng image → SysPromptEngImage", groupOf(v3.FamilyPromptEng, "prompteng.image"), v3.SysPromptEngImage},
		{"prompteng video → SysPromptEngVideo", groupOf(v3.FamilyPromptEng, "prompteng.video"), v3.SysPromptEngVideo},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			sys, _ := c.Compose(tt.group, "text", apperr.ChainRequest{}, false)
			if sys != tt.wantSystem {
				short := func(s string) string {
					if len(s) > 40 {
						return s[:40]
					}
					return s
				}
				t.Errorf("system prompt mismatch (first 40 chars): got %q, want %q", short(sys), short(tt.wantSystem))
			}
		})
	}
}

func TestComposer_RewriteUserPrompt(t *testing.T) {
	c := NewComposer(composerTestCatalog())
	req := apperr.ChainRequest{}

	t.Run("single_rewrite_directive_injects_context", func(t *testing.T) {
		_, user := c.Compose(groupOf(v3.FamilyRewrite, "rewrite.proofread.basic"), "Hello world", req, false)
		if !strings.Contains(user, "Hello world") {
			t.Errorf("user prompt should contain input text, got: %q", user)
		}
		if !strings.Contains(user, "PlainText") {
			t.Errorf("user prompt should contain format, got: %q", user)
		}
		if !strings.Contains(user, "Correct grammar") {
			t.Errorf("user prompt should contain directive, got: %q", user)
		}
		if strings.Count(user, "<<<UserText Start>>>") != 1 {
			t.Errorf("context block should appear exactly once, got %d", strings.Count(user, "<<<UserText Start>>>"))
		}
	})

	t.Run("two_rewrite_directives_context_injected_once", func(t *testing.T) {
		g := groupOf(v3.FamilyRewrite, "rewrite.proofread.basic", "rewrite.tone.professional")
		_, user := c.Compose(g, "Hello world", req, true)
		if strings.Count(user, "<<<UserText Start>>>") != 1 {
			t.Errorf("context block must appear exactly once for merged Rewrite, got %d", strings.Count(user, "<<<UserText Start>>>"))
		}
		if !strings.Contains(user, "Correct grammar") {
			t.Error("first directive should be present")
		}
		if !strings.Contains(user, "professional") {
			t.Error("second directive should be present")
		}
		if !strings.Contains(user, "Markdown") {
			t.Error("useMarkdown=true should set format to Markdown")
		}
	})
}

func TestComposer_StructureFormatUserPrompt(t *testing.T) {
	c := NewComposer(composerTestCatalog())
	req := apperr.ChainRequest{}

	t.Run("single_format_direct_replacement", func(t *testing.T) {
		_, user := c.Compose(groupOf(v3.FamilyStructure, "structure.format.bullets"), "my text", req, false)
		if !strings.Contains(user, "my text") {
			t.Error("input text should be injected")
		}
		if strings.Count(user, "<<<UserText Start>>>") != 1 {
			t.Error("single format step: context block exactly once")
		}
	})

	t.Run("merged_two_format_context_injected_once", func(t *testing.T) {
		g := groupOf(v3.FamilyStructure, "structure.format.bullets", "structure.format.headings")
		_, user := c.Compose(g, "my text", req, false)
		if strings.Count(user, "<<<UserText Start>>>") != 1 {
			t.Errorf("merged format: context block must appear exactly once, got %d", strings.Count(user, "<<<UserText Start>>>"))
		}
		if !strings.Contains(user, "my text") {
			t.Error("input text should appear")
		}
	})
}

func TestComposer_TranslateInjectsLanguages(t *testing.T) {
	c := NewComposer(composerTestCatalog())
	req := apperr.ChainRequest{InputLanguageID: "English", OutputLanguageID: "Spanish"}
	_, user := c.Compose(groupOf(v3.FamilyTranslate, "translate.text"), "Hello", req, false)
	if !strings.Contains(user, "English") {
		t.Error("input_language not injected")
	}
	if !strings.Contains(user, "Spanish") {
		t.Error("output_language not injected")
	}
}

func TestComposer_PromptEngInjectsTargetModelAndGoal(t *testing.T) {
	c := NewComposer(composerTestCatalog())
	req := apperr.ChainRequest{}
	imgStep := apperr.ChainStep{ActionID: "prompteng.image", TargetModel: "SDXL", Goal: "restore"}
	g := Group{Family: v3.FamilyPromptEng, Steps: []apperr.ChainStep{imgStep}}
	_, user := c.Compose(g, "a portrait", req, false)
	if !strings.Contains(user, "SDXL") {
		t.Error("target_model not injected")
	}
	if !strings.Contains(user, "restore") {
		t.Error("goal not injected")
	}
}

func TestComposer_FormatMarkdown(t *testing.T) {
	c := NewComposer(composerTestCatalog())
	req := apperr.ChainRequest{}

	_, userMd := c.Compose(groupOf(v3.FamilySummarize, "summarize.summary"), "text", req, true)
	if !strings.Contains(userMd, "Markdown") {
		t.Error("useMarkdown=true should set format to Markdown")
	}
	_, userPlain := c.Compose(groupOf(v3.FamilySummarize, "summarize.summary"), "text", req, false)
	if !strings.Contains(userPlain, "PlainText") {
		t.Error("useMarkdown=false should set format to PlainText")
	}
}
