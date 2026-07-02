package actions

import (
	"fmt"
	"strings"

	"go_text/internal/apperr"
	v3 "go_text/internal/prompts/v3"
)

const (
	tokenUserText      = "{{user_text}}"
	tokenUserFormat    = "{{user_format}}"
	tokenInputLang     = "{{input_language}}"
	tokenOutputLang    = "{{output_language}}"
	tokenTargetModel   = "{{target_model}}"
	tokenGoal          = "{{goal}}"
	userTextSplitPoint = "\n\n<<<UserText Start>>>"
	userTextBlock      = "<<<UserText Start>>>\n%s\n<<<UserText End>>>"
)

const userGuardrailSuffix = "\n\nReminder: reply with only the requested result text. " +
	"Do not add a preamble, explanation, heading, or commentary, and do not wrap the " +
	"output in code fences unless the source text itself is code or the requested output " +
	"type inherently requires labeled sections (e.g. a translation table, an FAQ, or a " +
	"negative-prompt/settings block)."

// Composer builds the two-tier (system + user) prompt for one inference group.
type Composer struct {
	catalog map[string]apperr.ActionMeta
}

// NewComposer builds a Composer from the v3 action catalog.
func NewComposer(catalog []apperr.ActionMeta) *Composer {
	m := make(map[string]apperr.ActionMeta, len(catalog))
	for _, a := range catalog {
		m[a.ID] = a
	}
	return &Composer{catalog: m}
}

// Compose returns the (system, user) prompt pair for one inference group.
func (c *Composer) Compose(g Group, inputText string, req apperr.ChainRequest, useMarkdown bool) (system, user string) {
	system = c.systemPrompt(g)
	user = c.userPrompt(g, inputText, req, useMarkdown) + userGuardrailSuffix
	return
}

// systemPrompt selects the family system prompt, branching on the first step for
// families that have sub-variants (structure, prompteng).
func (c *Composer) systemPrompt(g Group) string {
	if len(g.Steps) == 0 {
		return ""
	}
	meta := c.catalog[g.Steps[0].ActionID]
	switch g.Family {
	case v3.FamilyRewrite:
		return v3.SysRewrite
	case v3.FamilyStructure:
		if meta.ExclusivityGroup == "" {
			return v3.SysStructureFormat
		}
		return v3.SysStructureDoc
	case v3.FamilySummarize:
		return v3.SysSummarize
	case v3.FamilyTranslate:
		return v3.SysTranslate
	case v3.FamilyPromptEng:
		id := g.Steps[0].ActionID
		if strings.HasPrefix(id, "prompteng.image") {
			return v3.SysPromptEngImage
		}
		if strings.HasPrefix(id, "prompteng.video") {
			return v3.SysPromptEngVideo
		}
		return v3.SysPromptEngText
	default:
		return ""
	}
}

// userPrompt routes to the per-family composition strategy.
func (c *Composer) userPrompt(g Group, inputText string, req apperr.ChainRequest, useMarkdown bool) string {
	format := "PlainText"
	if useMarkdown {
		format = "Markdown"
	}
	switch g.Family {
	case v3.FamilyRewrite:
		return c.rewriteUserPrompt(g, inputText, format)
	case v3.FamilyStructure:
		return c.structureUserPrompt(g, inputText, format)
	default:
		return c.singleStepUserPrompt(g.Steps[0], inputText, req, format)
	}
}

// rewriteUserPrompt builds the user prompt for Rewrite groups.
// Rewrite directives are short fragments with no embedded {{user_text}};
// context (text + format) is injected once at the end.
func (c *Composer) rewriteUserPrompt(g Group, inputText, format string) string {
	var sb strings.Builder
	if len(g.Steps) == 1 {
		meta := c.catalog[g.Steps[0].ActionID]
		sb.WriteString(meta.Directive)
	} else {
		sb.WriteString("Apply the following edits to the text in order:")
		for i, s := range g.Steps {
			meta := c.catalog[s.ActionID]
			fmt.Fprintf(&sb, "\n%d) %s", i+1, meta.Directive)
		}
	}
	fmt.Fprintf(&sb, "\n\n"+userTextBlock+"\n\nFormat: %s", inputText, format)
	return sb.String()
}

// structureUserPrompt builds the user prompt for Structure groups.
// Single steps use direct token replacement on the directive template.
// Merged format steps extract the instruction part and inject context once.
func (c *Composer) structureUserPrompt(g Group, inputText, format string) string {
	if len(g.Steps) == 1 {
		return c.singleStepUserPrompt(g.Steps[0], inputText, apperr.ChainRequest{}, format)
	}
	var sb strings.Builder
	sb.WriteString("Apply the following formatting operations to the text in order:")
	for i, s := range g.Steps {
		meta := c.catalog[s.ActionID]
		instruction := extractInstructionPart(meta.Directive)
		fmt.Fprintf(&sb, "\n\n%d) %s", i+1, instruction)
	}
	fmt.Fprintf(&sb, "\n\n"+userTextBlock+"\n\nFormat: %s", inputText, format)
	return sb.String()
}

// singleStepUserPrompt does direct token replacement on a directive template.
// Used for Structure doc, Summarize, Translate, PromptEng (always single-step).
func (c *Composer) singleStepUserPrompt(s apperr.ChainStep, inputText string, req apperr.ChainRequest, format string) string {
	meta := c.catalog[s.ActionID]
	d := meta.Directive
	d = strings.ReplaceAll(d, tokenUserText, inputText)
	d = strings.ReplaceAll(d, tokenUserFormat, format)
	d = strings.ReplaceAll(d, tokenInputLang, req.InputLanguageID)
	d = strings.ReplaceAll(d, tokenOutputLang, req.OutputLanguageID)
	d = strings.ReplaceAll(d, tokenTargetModel, s.TargetModel)
	d = strings.ReplaceAll(d, tokenGoal, s.Goal)
	return d
}

// extractInstructionPart strips the embedded context block from a Structure format
// directive so that merged steps can inject context exactly once at the end.
func extractInstructionPart(directive string) string {
	before, _, found := strings.Cut(directive, userTextSplitPoint)
	if found {
		return strings.TrimRight(before, " \t\n")
	}
	return strings.TrimSpace(directive)
}
