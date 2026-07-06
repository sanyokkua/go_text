package v3

import "go_text/internal/apperr"

var actionCatalog []apperr.ActionMeta

func init() {
	actionCatalog = buildCatalog()
}

// Catalog returns all registered v3 actions in canonical orderRank sequence.
// The returned slice is a defensive copy — callers may not mutate the registry.
func Catalog() []apperr.ActionMeta {
	result := make([]apperr.ActionMeta, len(actionCatalog))
	copy(result, actionCatalog)
	return result
}

func buildCatalog() []apperr.ActionMeta {
	return []apperr.ActionMeta{

		// ── REWRITE — proofread (orderRank 10) ───────────────────────────────
		// Source: original v3 prompt draft — directives-rewrite.md §proofread
		{
			ID:               "rewrite.proofread.basic",
			Name:             "Basic proofreading",
			Category:         CatProofread,
			Family:           FamilyRewrite,
			Directive:        "Correct grammar, spelling, punctuation, capitalization, and basic internal consistency (tense, voice, terminology), making only the minimal changes needed for correctness. Do not rephrase for style, alter tone, or reorganize content.",
			OrderRank:        10,
			ExclusivityGroup: ExclProofread,
			Mergeable:        true,
			Terminal:         false,
			Requires:         nil,
		},
		{
			ID:               "rewrite.proofread.enhanced",
			Name:             "Enhanced proofreading",
			Category:         CatProofread,
			Family:           FamilyRewrite,
			Directive:        "Correct all surface errors and, in addition, smooth sentence flow and transitions, resolve ambiguous references, and remove unnecessary redundancy without changing meaning, tone, or register. Add no new content and introduce no stylistic changes beyond what clarity and flow require.",
			OrderRank:        10,
			ExclusivityGroup: ExclProofread,
			Mergeable:        true,
			Terminal:         false,
			Requires:         nil,
		},
		{
			ID:               "rewrite.proofread.consistency",
			Name:             "Style & terminology consistency",
			Category:         CatProofread,
			Family:           FamilyRewrite,
			Directive:        "Enforce consistent tense, grammatical voice, terminology, capitalization, and usage throughout the text, resolving conflicting word choices and references to a single consistent form. Make only the changes needed for consistency and correctness; do not rewrite for style or flow beyond that.",
			OrderRank:        10,
			ExclusivityGroup: ExclProofread,
			Mergeable:        true,
			Terminal:         false,
			Requires:         nil,
		},
		{
			ID:               "rewrite.proofread.readability",
			Name:             "Readability improvement",
			Category:         CatProofread,
			Family:           FamilyRewrite,
			Directive:        "Improve readability for a general audience by breaking up or simplifying overly long or complex sentences and replacing needlessly difficult wording with clearer equivalents. Preserve the original meaning, intent, tone, and all facts; add no stylistic flair and remove no content.",
			OrderRank:        10,
			ExclusivityGroup: ExclProofread,
			Mergeable:        true,
			Terminal:         false,
			Requires:         nil,
		},
		{
			ID:               "rewrite.proofread.clarification",
			Name:             "Clarification",
			Category:         CatProofread,
			Family:           FamilyRewrite,
			Directive:        "Remove ambiguity by making the existing meaning explicit — clarifying vague references, undefined terms, and unclear relationships using only information already present in the text. Do not add new facts, examples, or interpretations, and do not change the stance or level of detail.",
			OrderRank:        10,
			ExclusivityGroup: ExclProofread,
			Mergeable:        true,
			Terminal:         false,
			Requires:         nil,
		},

		// ── REWRITE — rewrite-intent (orderRank 20) ──────────────────────────
		// Source: original v3 prompt draft — directives-rewrite.md §rewrite-intent
		{
			ID:               "rewrite.intent.concise",
			Name:             "Concise",
			Category:         CatRewrite,
			Family:           FamilyRewrite,
			Directive:        "Make the text more concise by removing filler, redundancy, and unnecessary verbosity and tightening phrasing, while preserving the original meaning, intent, tone, and every essential detail. Do not summarize beyond the natural reduction of removing fluff, and add no new information.",
			OrderRank:        20,
			ExclusivityGroup: ExclRewriteIntent,
			Mergeable:        true,
			Terminal:         false,
			Requires:         nil,
		},
		{
			ID:               "rewrite.intent.simplify",
			Name:             "Simplify",
			Category:         CatRewrite,
			Family:           FamilyRewrite,
			Directive:        "Reduce complexity using plainer vocabulary, shorter sentences, and less jargon so a non-expert reader can follow it, while keeping the original meaning, intent, and all facts intact. Avoid idioms and culture-specific expressions; do not omit essential detail.",
			OrderRank:        20,
			ExclusivityGroup: ExclRewriteIntent,
			Mergeable:        true,
			Terminal:         false,
			Requires:         nil,
		},
		{
			ID:               "rewrite.intent.paraphrase",
			Name:             "Paraphrase",
			Category:         CatRewrite,
			Family:           FamilyRewrite,
			Directive:        "Restate the text using different wording and sentence structure while keeping the same meaning, intent, facts, tone, register, and approximate length. Do not add or remove information and do not shift the formality.",
			OrderRank:        20,
			ExclusivityGroup: ExclRewriteIntent,
			Mergeable:        true,
			Terminal:         false,
			Requires:         nil,
		},
		{
			ID:               "rewrite.intent.humanize",
			Name:             "Humanize",
			Category:         CatRewrite,
			Family:           FamilyRewrite,
			Directive:        `Make the text read as natural human writing: remove formulaic AI-tell vocabulary and corporate filler (English examples — "delve," "leverage," "tapestry," "navigate the landscape," "it's important to note," "in today's fast-paced world"; apply the equivalent AI-tell removal in the text's own language), prefer plain verbs and active voice, and deliberately vary sentence and paragraph length so the rhythm is uneven rather than uniform. Keep every existing fact, name, number, and the author's intent; invent no new specifics and add no commentary.`,
			OrderRank:        20,
			ExclusivityGroup: ExclRewriteIntent,
			Mergeable:        true,
			Terminal:         false,
			Requires:         nil,
		},
		{
			ID:               "rewrite.intent.professionalize",
			Name:             "Professionalize",
			Category:         CatRewrite,
			Family:           FamilyRewrite,
			Directive:        "Raise the register to polished, competent, workplace-appropriate language: replace casual or slang phrasing with professional equivalents, tighten structure, and remove informality, while preserving the original meaning, intent, and all facts. Add no new claims, requests, or commitments.",
			OrderRank:        20,
			ExclusivityGroup: ExclRewriteIntent,
			Mergeable:        true,
			Terminal:         false,
			Requires:         nil,
		},

		// ── REWRITE — tone (orderRank 30) ────────────────────────────────────
		// Source: original v3 prompt draft — directives-rewrite.md §tone
		{
			ID:               "rewrite.tone.professional",
			Name:             "Professional",
			Category:         CatTone,
			Family:           FamilyRewrite,
			Directive:        "Adjust the tone to be professional — competent, composed, and outcome-focused — using clear, courteous workplace language. Change only the emotional framing; keep the message, facts, and structure unchanged.",
			OrderRank:        30,
			ExclusivityGroup: ExclTone,
			Mergeable:        true,
			Terminal:         false,
			Requires:         nil,
		},
		{
			ID:               "rewrite.tone.friendly",
			Name:             "Friendly",
			Category:         CatTone,
			Family:           FamilyRewrite,
			Directive:        "Adjust the tone to be friendly — warm, approachable, and kind — with everyday wording and a personable framing. Change only the emotional framing; keep the message, facts, and structure unchanged.",
			OrderRank:        30,
			ExclusivityGroup: ExclTone,
			Mergeable:        true,
			Terminal:         false,
			Requires:         nil,
		},
		{
			ID:               "rewrite.tone.neutral",
			Name:             "Neutral",
			Category:         CatTone,
			Family:           FamilyRewrite,
			Directive:        "Adjust the tone to be neutral — detached, even, and free of emotional coloring or subjective phrasing. Change only the emotional framing; keep the message, facts, and structure unchanged.",
			OrderRank:        30,
			ExclusivityGroup: ExclTone,
			Mergeable:        true,
			Terminal:         false,
			Requires:         nil,
		},
		{
			ID:               "rewrite.tone.direct",
			Name:             "Direct",
			Category:         CatTone,
			Family:           FamilyRewrite,
			Directive:        "Adjust the tone to be direct — straightforward, concise, and action-focused — leading with the point and using plain, unhedged language. Change only the emotional framing; add no new actions or requests and keep the facts unchanged.",
			OrderRank:        30,
			ExclusivityGroup: ExclTone,
			Mergeable:        true,
			Terminal:         false,
			Requires:         nil,
		},
		{
			ID:               "rewrite.tone.indirect",
			Name:             "Indirect",
			Category:         CatTone,
			Family:           FamilyRewrite,
			Directive:        "Adjust the tone to be indirect — softened, tactful, and considerate — reducing bluntness while still conveying the same point. Change only the emotional framing; keep the message, facts, and structure unchanged.",
			OrderRank:        30,
			ExclusivityGroup: ExclTone,
			Mergeable:        true,
			Terminal:         false,
			Requires:         nil,
		},
		{
			ID:               "rewrite.tone.enthusiastic",
			Name:             "Enthusiastic",
			Category:         CatTone,
			Family:           FamilyRewrite,
			Directive:        "Adjust the tone to be enthusiastic — energetic, upbeat, and positive — without exaggeration or invented excitement. Change only the emotional framing; keep the message, facts, and structure unchanged.",
			OrderRank:        30,
			ExclusivityGroup: ExclTone,
			Mergeable:        true,
			Terminal:         false,
			Requires:         nil,
		},
		{
			ID:               "rewrite.tone.formal",
			Name:             "Formal",
			Category:         CatTone,
			Family:           FamilyRewrite,
			Directive:        "Adjust the tone to be formal — reserved, respectful, and impersonal — avoiding contractions, slang, and casual phrasing. Change only the emotional framing; keep the message, facts, and structure unchanged.",
			OrderRank:        30,
			ExclusivityGroup: ExclTone,
			Mergeable:        true,
			Terminal:         false,
			Requires:         nil,
		},
		{
			ID:               "rewrite.tone.warm",
			Name:             "Warm",
			Category:         CatTone,
			Family:           FamilyRewrite,
			Directive:        "Adjust the tone to be warm — caring, personal, and considerate — using gentle, human phrasing. Change only the emotional framing; keep the message, facts, and structure unchanged.",
			OrderRank:        30,
			ExclusivityGroup: ExclTone,
			Mergeable:        true,
			Terminal:         false,
			Requires:         nil,
		},
		{
			ID:               "rewrite.tone.empathetic",
			Name:             "Empathetic",
			Category:         CatTone,
			Family:           FamilyRewrite,
			Directive:        "Adjust the tone to be empathetic — acknowledging and validating the reader's feelings or situation while staying specific rather than hollow. Change only the emotional framing; add no new promises or admissions and keep the facts unchanged.",
			OrderRank:        30,
			ExclusivityGroup: ExclTone,
			Mergeable:        true,
			Terminal:         false,
			Requires:         nil,
		},
		{
			ID:               "rewrite.tone.confident",
			Name:             "Confident",
			Category:         CatTone,
			Family:           FamilyRewrite,
			Directive:        "Adjust the tone to be confident — assured and decisive — stating points firmly without hedging and without tipping into arrogance. Change only the emotional framing; keep the message, facts, and structure unchanged.",
			OrderRank:        30,
			ExclusivityGroup: ExclTone,
			Mergeable:        true,
			Terminal:         false,
			Requires:         nil,
		},
		{
			ID:               "rewrite.tone.assertive",
			Name:             "Assertive",
			Category:         CatTone,
			Family:           FamilyRewrite,
			Directive:        "Adjust the tone to be assertive — direct and boundary-setting — clearly stating needs or positions while remaining respectful and non-aggressive. Change only the emotional framing; add no new demands and keep the facts unchanged.",
			OrderRank:        30,
			ExclusivityGroup: ExclTone,
			Mergeable:        true,
			Terminal:         false,
			Requires:         nil,
		},
		{
			ID:               "rewrite.tone.diplomatic",
			Name:             "Diplomatic",
			Category:         CatTone,
			Family:           FamilyRewrite,
			Directive:        `Adjust the tone to be diplomatic — tactful and balanced — framing the point considerately and as "us versus the problem" rather than confrontationally. Change only the emotional framing; keep the message, facts, and structure unchanged.`,
			OrderRank:        30,
			ExclusivityGroup: ExclTone,
			Mergeable:        true,
			Terminal:         false,
			Requires:         nil,
		},
		{
			ID:               "rewrite.tone.collaborative",
			Name:             "Collaborative",
			Category:         CatTone,
			Family:           FamilyRewrite,
			Directive:        `Adjust the tone to be collaborative — inclusive and team-oriented, using "we" and "let's" framing where natural — without manufacturing false consensus. Change only the emotional framing; keep the message, facts, and structure unchanged.`,
			OrderRank:        30,
			ExclusivityGroup: ExclTone,
			Mergeable:        true,
			Terminal:         false,
			Requires:         nil,
		},
		{
			ID:               "rewrite.tone.respectful",
			Name:             "Respectful",
			Category:         CatTone,
			Family:           FamilyRewrite,
			Directive:        "Adjust the tone to be respectful — deferential and considerate — while staying clear and not servile. Change only the emotional framing; keep the message, facts, and structure unchanged.",
			OrderRank:        30,
			ExclusivityGroup: ExclTone,
			Mergeable:        true,
			Terminal:         false,
			Requires:         nil,
		},
		{
			ID:               "rewrite.tone.educational",
			Name:             "Educational",
			Category:         CatTone,
			Family:           FamilyRewrite,
			Directive:        "Adjust the tone to be educational — patient and explanatory, as when teaching — without becoming condescending. Change only the emotional framing; add no new explanatory content and keep the facts unchanged.",
			OrderRank:        30,
			ExclusivityGroup: ExclTone,
			Mergeable:        true,
			Terminal:         false,
			Requires:         nil,
		},
		{
			ID:               "rewrite.tone.supportive",
			Name:             "Supportive",
			Category:         CatTone,
			Family:           FamilyRewrite,
			Directive:        "Adjust the tone to be supportive — encouraging and constructive — while still conveying the message candidly and not softening it into vagueness. Change only the emotional framing; keep the message, facts, and structure unchanged.",
			OrderRank:        30,
			ExclusivityGroup: ExclTone,
			Mergeable:        true,
			Terminal:         false,
			Requires:         nil,
		},
		{
			ID:               "rewrite.tone.reassuring",
			Name:             "Reassuring",
			Category:         CatTone,
			Family:           FamilyRewrite,
			Directive:        "Adjust the tone to be reassuring — calm and steadying — to ease worry or uncertainty, without offering false comfort or unfounded guarantees. Change only the emotional framing; add no new assurances and keep the facts unchanged.",
			OrderRank:        30,
			ExclusivityGroup: ExclTone,
			Mergeable:        true,
			Terminal:         false,
			Requires:         nil,
		},
		{
			ID:               "rewrite.tone.authoritative",
			Name:             "Authoritative",
			Category:         CatTone,
			Family:           FamilyRewrite,
			Directive:        "Adjust the tone to be authoritative — expert and definitive — conveying command of the subject without arrogance. Change only the emotional framing; keep the message, facts, and structure unchanged.",
			OrderRank:        30,
			ExclusivityGroup: ExclTone,
			Mergeable:        true,
			Terminal:         false,
			Requires:         nil,
		},
		{
			ID:               "rewrite.tone.serious",
			Name:             "Serious",
			Category:         CatTone,
			Family:           FamilyRewrite,
			Directive:        "Adjust the tone to be serious — grave and focused — removing levity and signaling the weight of the matter. Change only the emotional framing; keep the message, facts, and structure unchanged.",
			OrderRank:        30,
			ExclusivityGroup: ExclTone,
			Mergeable:        true,
			Terminal:         false,
			Requires:         nil,
		},
		{
			ID:               "rewrite.tone.casual",
			Name:             "Casual",
			Category:         CatTone,
			Family:           FamilyRewrite,
			Directive:        "Adjust the tone to be casual — relaxed and informal, as when writing to a peer — using contractions and everyday phrasing. Change only the emotional framing; keep the message, facts, and structure unchanged.",
			OrderRank:        30,
			ExclusivityGroup: ExclTone,
			Mergeable:        true,
			Terminal:         false,
			Requires:         nil,
		},

		// ── REWRITE — style (orderRank 40) ───────────────────────────────────
		// Source: original v3 prompt draft — directives-rewrite.md §style
		{
			ID:               "rewrite.style.formal",
			Name:             "Formal",
			Category:         CatStyle,
			Family:           FamilyRewrite,
			Directive:        "Adapt the style to formal: impersonal, precise, and rule-correct, with no contractions or slang and complete, well-structured sentences suitable for legal, regulatory, or formal business contexts. Preserve all meaning, facts, names, and references; do not summarize or expand.",
			OrderRank:        40,
			ExclusivityGroup: ExclStyle,
			Mergeable:        true,
			Terminal:         false,
			Requires:         nil,
		},
		{
			ID:               "rewrite.style.semi-formal",
			Name:             "Semi-formal",
			Category:         CatStyle,
			Family:           FamilyRewrite,
			Directive:        "Adapt the style to semi-formal: polished but human, with light contractions, standard vocabulary, and medium-length sentences suitable for business email, proposals, and client documents. Preserve all meaning, facts, and references; avoid slang and do not change substance.",
			OrderRank:        40,
			ExclusivityGroup: ExclStyle,
			Mergeable:        true,
			Terminal:         false,
			Requires:         nil,
		},
		{
			ID:               "rewrite.style.casual",
			Name:             "Casual",
			Category:         CatStyle,
			Family:           FamilyRewrite,
			Directive:        "Adapt the style to casual: relaxed, everyday language with contractions and a peer-to-peer feel, while staying clear and coherent. Preserve all meaning, intent, and facts; do not add or remove content.",
			OrderRank:        40,
			ExclusivityGroup: ExclStyle,
			Mergeable:        true,
			Terminal:         false,
			Requires:         nil,
		},
		{
			ID:               "rewrite.style.academic",
			Name:             "Academic",
			Category:         CatStyle,
			Family:           FamilyRewrite,
			Directive:        "Adapt the style to academic: objective, evidence-based, and precisely worded, using scholarly tone and discipline-appropriate terminology and avoiding colloquial phrasing. Preserve all meaning, claims, data, names, and references without altering substance.",
			OrderRank:        40,
			ExclusivityGroup: ExclStyle,
			Mergeable:        true,
			Terminal:         false,
			Requires:         nil,
		},
		{
			ID:               "rewrite.style.technical",
			Name:             "Technical",
			Category:         CatStyle,
			Family:           FamilyRewrite,
			Directive:        "Adapt the style to technical: precise and unambiguous, using exact, consistent domain terminology and clear sentence structure suitable for specifications and documentation. Preserve all meaning and technical detail; reduce ambiguity without changing substance.",
			OrderRank:        40,
			ExclusivityGroup: ExclStyle,
			Mergeable:        true,
			Terminal:         false,
			Requires:         nil,
		},
		{
			ID:               "rewrite.style.journalistic",
			Name:             "Journalistic",
			Category:         CatStyle,
			Family:           FamilyRewrite,
			Directive:        "Adapt the style to journalistic: clear, factual, and concise, leading with the most important information (inverted pyramid) and using neutral, attributed phrasing in short paragraphs. Preserve all facts and meaning; reorder for emphasis only as the inverted pyramid requires and add no opinion.",
			OrderRank:        40,
			ExclusivityGroup: ExclStyle,
			Mergeable:        true,
			Terminal:         false,
			Requires:         nil,
		},
		{
			ID:               "rewrite.style.creative",
			Name:             "Creative / storytelling",
			Category:         CatStyle,
			Family:           FamilyRewrite,
			Directive:        "Adapt the style to creative storytelling: expressive and vivid, with narrative flow, sensory detail, and varied rhythm, while remaining coherent. Preserve the original meaning and facts; enhance imagery and rhythm without inventing new events or claims.",
			OrderRank:        40,
			ExclusivityGroup: ExclStyle,
			Mergeable:        true,
			Terminal:         false,
			Requires:         nil,
		},
		{
			ID:               "rewrite.style.seo",
			Name:             "SEO-optimized",
			Category:         CatStyle,
			Family:           FamilyRewrite,
			Directive:        "Adapt the style to SEO-optimized: scannable and keyword-aware, with clear structure and logical flow that naturally reinforces relevant keywords already present in the text. Do not invent or inject new keywords, claims, or content; preserve all meaning and facts.",
			OrderRank:        40,
			ExclusivityGroup: ExclStyle,
			Mergeable:        true,
			Terminal:         false,
			Requires:         nil,
		},
		{
			ID:               "rewrite.style.risk-reduce",
			Name:             "Risk-reduce (hedged / low-liability)",
			Category:         CatStyle,
			Family:           FamilyRewrite,
			Directive:        "Adapt the style to reduce risk: soften strong claims, guarantees, promises, and absolutes into cautious, neutral, professional phrasing that limits legal, regulatory, or compliance exposure. Preserve the underlying meaning and intent; introduce no new assurances, obligations, or legal positions.",
			OrderRank:        40,
			ExclusivityGroup: ExclStyle,
			Mergeable:        true,
			Terminal:         false,
			Requires:         nil,
		},
		{
			ID:               "rewrite.style.conversational",
			Name:             "Conversational",
			Category:         CatStyle,
			Family:           FamilyRewrite,
			Directive:        "Adapt the style to conversational: natural, edited speech with contractions, second person, and short sentences suitable for blogs, docs, and UX copy. Preserve all meaning and facts; keep it clear and add no content.",
			OrderRank:        40,
			ExclusivityGroup: ExclStyle,
			Mergeable:        true,
			Terminal:         false,
			Requires:         nil,
		},
		{
			ID:               "rewrite.style.persuasive",
			Name:             "Persuasive",
			Category:         CatStyle,
			Family:           FamilyRewrite,
			Directive:        "Adapt the style to persuasive: structure the existing points as a reasoned argument that builds toward the conclusion already present, strengthening phrasing and flow for impact. Add no new claims, guarantees, or calls to action and do not change the stance or facts.",
			OrderRank:        40,
			ExclusivityGroup: ExclStyle,
			Mergeable:        true,
			Terminal:         false,
			Requires:         nil,
		},
		{
			ID:               "rewrite.style.executive",
			Name:             "Executive (BLUF)",
			Category:         CatStyle,
			Family:           FamilyRewrite,
			Directive:        "Adapt the style to executive BLUF (bottom line up front): lead with the conclusion or recommendation, then supporting points, using concise, high-level, quantified language and no jargon dumps. Preserve all facts and meaning; reorder for the bottom-line-first structure only and add nothing new.",
			OrderRank:        40,
			ExclusivityGroup: ExclStyle,
			Mergeable:        true,
			Terminal:         false,
			Requires:         nil,
		},
		{
			ID:               "rewrite.style.documentation",
			Name:             "Documentation",
			Category:         CatStyle,
			Family:           FamilyRewrite,
			Directive:        "Adapt the style to documentation: findable and scannable, using sentence-case phrasing, consistent terminology, present tense, and active voice without subjective language. Preserve all meaning and facts; do not add reference material the source does not contain.",
			OrderRank:        40,
			ExclusivityGroup: ExclStyle,
			Mergeable:        true,
			Terminal:         false,
			Requires:         nil,
		},
		{
			ID:               "rewrite.style.instructional",
			Name:             "Instructional",
			Category:         CatStyle,
			Family:           FamilyRewrite,
			Directive:        `Adapt the style to instructional: clear, second-person, imperative phrasing ("Click," "Run," "Create") organized as ordered steps where the content supports it, suitable for tutorials and how-tos. Preserve all meaning and facts; introduce no steps the source does not support.`,
			OrderRank:        40,
			ExclusivityGroup: ExclStyle,
			Mergeable:        true,
			Terminal:         false,
			Requires:         nil,
		},
		{
			ID:               "rewrite.style.support",
			Name:             "Support / customer-facing",
			Category:         CatStyle,
			Family:           FamilyRewrite,
			Directive:        "Adapt the style to support and customer-facing: accessible, jargon-free, courteous, and solution-focused, avoiding blame and defensiveness. Preserve all meaning and facts; add no new commitments, apologies, or guarantees beyond what the source already states.",
			OrderRank:        40,
			ExclusivityGroup: ExclStyle,
			Mergeable:        true,
			Terminal:         false,
			Requires:         nil,
		},

		// ── STRUCTURE — format (orderRank 50, composable) ────────────────────
		// Source: original v3 prompt draft — templates-structure.md §format
		// ExclusivityGroup="" — multiple format directives may coexist in one stack.
		{
			ID:       "structure.format.markdown",
			Name:     "To Markdown",
			Category: CatFormat,
			Family:   FamilyStructure,
			Directive: "Task: Convert to a clean Markdown document.\n" +
				"- Re-express the text below using valid Markdown: headings, lists, emphasis, code blocks, and tables only where the content already implies them.\n" +
				"- Preserve all wording, meaning, facts, and the original language. Add nothing.\n\n" +
				"<<<UserText Start>>>\n{{user_text}}\n<<<UserText End>>>\n\n" +
				"Format: {{user_format}}",
			OrderRank:        50,
			ExclusivityGroup: "",
			Mergeable:        true,
			Terminal:         false,
			Requires:         nil,
		},
		{
			ID:       "structure.format.prose",
			Name:     "Paragraph / prose",
			Category: CatFormat,
			Family:   FamilyStructure,
			Directive: "Task: Format the text below as flowing paragraph prose.\n" +
				"- Merge fragments, bullets, or lists into coherent, well-connected paragraphs with minimal transitional wording.\n" +
				"- Preserve meaning, intent, facts, and the original language. Do not add, drop, reorder, or summarize content.\n\n" +
				"<<<UserText Start>>>\n{{user_text}}\n<<<UserText End>>>\n\n" +
				"Format: {{user_format}}",
			OrderRank:        50,
			ExclusivityGroup: "",
			Mergeable:        true,
			Terminal:         false,
			Requires:         nil,
		},
		{
			ID:       "structure.format.bullets",
			Name:     "Bullet list",
			Category: CatFormat,
			Family:   FamilyStructure,
			Directive: "Task: Format the text below as a bullet list.\n" +
				"- Make each bullet one distinct idea drawn from the text; keep parallel phrasing.\n" +
				"- Preserve meaning, facts, and the original language. Do not add or invent points.\n\n" +
				"<<<UserText Start>>>\n{{user_text}}\n<<<UserText End>>>\n\n" +
				"Format: {{user_format}}",
			OrderRank:        50,
			ExclusivityGroup: "",
			Mergeable:        true,
			Terminal:         false,
			Requires:         nil,
		},
		{
			ID:       "structure.format.numbered",
			Name:     "Numbered / ordered list",
			Category: CatFormat,
			Family:   FamilyStructure,
			Directive: "Task: Format the text below as a numbered (ordered) list.\n" +
				"- Use numbering only where the content has a genuine sequence or ranking; one item per line.\n" +
				"- Preserve meaning, order, facts, and the original language. Do not add items.\n\n" +
				"<<<UserText Start>>>\n{{user_text}}\n<<<UserText End>>>\n\n" +
				"Format: {{user_format}}",
			OrderRank:        50,
			ExclusivityGroup: "",
			Mergeable:        true,
			Terminal:         false,
			Requires:         nil,
		},
		{
			ID:       "structure.format.headings",
			Name:     "Headings & sections",
			Category: CatFormat,
			Family:   FamilyStructure,
			Directive: "Task: Organize the text below under clear headings and sections.\n" +
				"- Group related content and add concise section headings derived strictly from the existing content.\n" +
				"- Preserve all wording, facts, level of detail, and the original language. Do not introduce new topics.\n\n" +
				"<<<UserText Start>>>\n{{user_text}}\n<<<UserText End>>>\n\n" +
				"Format: {{user_format}}",
			OrderRank:        50,
			ExclusivityGroup: "",
			Mergeable:        true,
			Terminal:         false,
			Requires:         nil,
		},
		{
			ID:       "structure.format.table",
			Name:     "Table",
			Category: CatFormat,
			Family:   FamilyStructure,
			Directive: "Task: Format the text below as a table.\n" +
				"- Infer columns and rows only from structure the content already contains; use a clear header row.\n" +
				"- Place every value in the cell it belongs to without altering or inventing data. Preserve the original language.\n\n" +
				"<<<UserText Start>>>\n{{user_text}}\n<<<UserText End>>>\n\n" +
				"Format: {{user_format}}",
			OrderRank:        50,
			ExclusivityGroup: "",
			Mergeable:        true,
			Terminal:         false,
			Requires:         nil,
		},
		{
			ID:       "structure.format.steps",
			Name:     "Instruction / numbered steps",
			Category: CatFormat,
			Family:   FamilyStructure,
			Directive: "Task: Format the text below as sequential numbered steps.\n" +
				"- Convert the described process into ordered, action-oriented steps; keep any prerequisites or notes the text supplies.\n" +
				"- Preserve all instructions, technical detail, order, and the original language. Add no steps that are not in the text.\n\n" +
				"<<<UserText Start>>>\n{{user_text}}\n<<<UserText End>>>\n\n" +
				"Format: {{user_format}}",
			OrderRank:        50,
			ExclusivityGroup: "",
			Mergeable:        true,
			Terminal:         false,
			Requires:         nil,
		},

		// ── STRUCTURE — doc (orderRank 60, one type per run) ─────────────────
		// Source: original v3 prompt draft — templates-structure.md §doc
		{
			ID:       "structure.doc.faq",
			Name:     "FAQ",
			Category: CatDocStructure,
			Family:   FamilyStructure,
			Directive: "Task: Structure the text below as an FAQ.\n" +
				"- Derive clear question-and-answer pairs covering the key topics the text contains.\n" +
				"- Every answer must be supported by the text; add no new information. Preserve the original language.\n\n" +
				"<<<UserText Start>>>\n{{user_text}}\n<<<UserText End>>>\n\n" +
				"Format: {{user_format}}",
			OrderRank:        60,
			ExclusivityGroup: ExclDocStructure,
			Mergeable:        false,
			Terminal:         false,
			Requires:         nil,
		},
		{
			ID:       "structure.doc.userstory",
			Name:     "User story",
			Category: CatDocStructure,
			Family:   FamilyStructure,
			Directive: "Task: Structure the text below as a user story.\n" +
				`- Use sections where supported: title, "As a / I want / so that" statement, description, and acceptance criteria.` + "\n" +
				"- Derive everything strictly from the text; omit any expected section the text does not cover, silently and without a placeholder. Preserve the original language.\n\n" +
				"<<<UserText Start>>>\n{{user_text}}\n<<<UserText End>>>\n\n" +
				"Format: {{user_format}}",
			OrderRank:        60,
			ExclusivityGroup: ExclDocStructure,
			Mergeable:        false,
			Terminal:         false,
			Requires:         nil,
		},
		{
			ID:       "structure.doc.techspec",
			Name:     "Technical spec",
			Category: CatDocStructure,
			Family:   FamilyStructure,
			Directive: "Task: Structure the text below as a technical specification.\n" +
				"- Use sections where supported: overview, requirements, constraints, interfaces/design, and acceptance criteria.\n" +
				"- Derive every element from the text; introduce no new requirements. Omit any expected section the text does not cover, silently and without a placeholder. Preserve the original language.\n\n" +
				"<<<UserText Start>>>\n{{user_text}}\n<<<UserText End>>>\n\n" +
				"Format: {{user_format}}",
			OrderRank:        60,
			ExclusivityGroup: ExclDocStructure,
			Mergeable:        false,
			Terminal:         false,
			Requires:         nil,
		},
		{
			ID:       "structure.doc.meetingnotes",
			Name:     "Meeting notes / minutes",
			Category: CatDocStructure,
			Family:   FamilyStructure,
			Directive: "Task: Structure the text below as meeting minutes.\n" +
				"- Use sections where supported: attendees, agenda, discussion, decisions, and action items (with owners where stated).\n" +
				"- Separate decisions from action items; include only what the notes support. Preserve names, facts, and the original language.\n\n" +
				"<<<UserText Start>>>\n{{user_text}}\n<<<UserText End>>>\n\n" +
				"Format: {{user_format}}",
			OrderRank:        60,
			ExclusivityGroup: ExclDocStructure,
			Mergeable:        false,
			Terminal:         false,
			Requires:         nil,
		},
		{
			ID:       "structure.doc.proposal",
			Name:     "Proposal",
			Category: CatDocStructure,
			Family:   FamilyStructure,
			Directive: "Task: Structure the text below as a proposal.\n" +
				"- Use sections where supported: problem statement, proposed solution, benefits, scope, and timeline.\n" +
				"- Derive all content from the text; add no new offers, benefits, or dates. Omit any expected section the text does not cover, silently and without a placeholder. Preserve the original language.\n\n" +
				"<<<UserText Start>>>\n{{user_text}}\n<<<UserText End>>>\n\n" +
				"Format: {{user_format}}",
			OrderRank:        60,
			ExclusivityGroup: ExclDocStructure,
			Mergeable:        false,
			Terminal:         false,
			Requires:         nil,
		},
		{
			ID:       "structure.doc.report",
			Name:     "Report",
			Category: CatDocStructure,
			Family:   FamilyStructure,
			Directive: "Task: Structure the text below as a report.\n" +
				"- Use sections where supported: title, introduction, body sections with headings, and conclusion.\n" +
				"- Derive headings and content strictly from the text; do not summarize or expand. Preserve facts and the original language.\n\n" +
				"<<<UserText Start>>>\n{{user_text}}\n<<<UserText End>>>\n\n" +
				"Format: {{user_format}}",
			OrderRank:        60,
			ExclusivityGroup: ExclDocStructure,
			Mergeable:        false,
			Terminal:         false,
			Requires:         nil,
		},
		{
			ID:       "structure.doc.email",
			Name:     "Email (format)",
			Category: CatDocStructure,
			Family:   FamilyStructure,
			Directive: "Task: Format the text below as a professional email.\n" +
				"- Organize into subject line (if derivable), greeting, body paragraphs, and closing.\n" +
				"- Preserve the message, wording, intent, and the original language. Add no new content, signature details, or claims.\n\n" +
				"<<<UserText Start>>>\n{{user_text}}\n<<<UserText End>>>\n\n" +
				"Format: {{user_format}}",
			OrderRank:        60,
			ExclusivityGroup: ExclDocStructure,
			Mergeable:        false,
			Terminal:         false,
			Requires:         nil,
		},
		{
			ID:       "structure.doc.blog",
			Name:     "Blog post (format)",
			Category: CatDocStructure,
			Family:   FamilyStructure,
			Directive: "Task: Format the text below as a blog post.\n" +
				"- Add a title and logical section headings derived from the content; arrange into readable paragraphs.\n" +
				"- Preserve meaning, facts, and the original language. Add no new ideas or embellishment.\n\n" +
				"<<<UserText Start>>>\n{{user_text}}\n<<<UserText End>>>\n\n" +
				"Format: {{user_format}}",
			OrderRank:        60,
			ExclusivityGroup: ExclDocStructure,
			Mergeable:        false,
			Terminal:         false,
			Requires:         nil,
		},
		{
			ID:       "structure.doc.social",
			Name:     "Social post (format)",
			Category: CatDocStructure,
			Family:   FamilyStructure,
			Directive: "Task: Format the text below as a generic social media post.\n" +
				"- Make it concise and scannable with line breaks; keep the core message.\n" +
				"- Preserve meaning and the original language. Add no hashtags, emojis, or calls to action unless already present.\n\n" +
				"<<<UserText Start>>>\n{{user_text}}\n<<<UserText End>>>\n\n" +
				"Format: {{user_format}}",
			OrderRank:        60,
			ExclusivityGroup: ExclDocStructure,
			Mergeable:        false,
			Terminal:         false,
			Requires:         nil,
		},
		{
			ID:       "structure.doc.resume",
			Name:     "Resume (format)",
			Category: CatDocStructure,
			Family:   FamilyStructure,
			Directive: "Task: Format the text below as a resume.\n" +
				"- Use sections where supported: summary, experience, skills, and education, with concise bullet points.\n" +
				"- Preserve all facts, dates, names, and the original language. Add no achievements or details not in the text.\n\n" +
				"<<<UserText Start>>>\n{{user_text}}\n<<<UserText End>>>\n\n" +
				"Format: {{user_format}}",
			OrderRank:        60,
			ExclusivityGroup: ExclDocStructure,
			Mergeable:        false,
			Terminal:         false,
			Requires:         nil,
		},
		{
			ID:       "structure.doc.headline",
			Name:     "Headline / title generator",
			Category: CatDocStructure,
			Family:   FamilyStructure,
			Directive: "Task: Generate headline / title options for the text below.\n" +
				"- Produce several distinct titles (neutral, concise, engaging) that accurately reflect the content.\n" +
				"- Derive each strictly from the text; add no new claims. Keep the original language.\n\n" +
				"<<<UserText Start>>>\n{{user_text}}\n<<<UserText End>>>\n\n" +
				"Format: {{user_format}}",
			OrderRank:        60,
			ExclusivityGroup: ExclDocStructure,
			Mergeable:        false,
			Terminal:         false,
			Requires:         nil,
		},
		{
			ID:       "structure.doc.tagline",
			Name:     "Tagline generator",
			Category: CatDocStructure,
			Family:   FamilyStructure,
			Directive: "Task: Generate taglines / slogans for the text below.\n" +
				"- Produce several short, punchy taglines that reflect the core message.\n" +
				"- Derive each strictly from the text; add no new claims. Keep the original language.\n\n" +
				"<<<UserText Start>>>\n{{user_text}}\n<<<UserText End>>>\n\n" +
				"Format: {{user_format}}",
			OrderRank:        60,
			ExclusivityGroup: ExclDocStructure,
			Mergeable:        false,
			Terminal:         false,
			Requires:         nil,
		},
		{
			ID:       "structure.doc.readme",
			Name:     "README",
			Category: CatDocStructure,
			Family:   FamilyStructure,
			Directive: "Task: Structure the text below as a project README.\n" +
				"- Use sections where supported: title, description, features, installation, usage, configuration, and license.\n" +
				"- Derive every section from the text; omit any expected section the text does not cover, silently and without a placeholder. Preserve the original language.\n\n" +
				"<<<UserText Start>>>\n{{user_text}}\n<<<UserText End>>>\n\n" +
				"Format: {{user_format}}",
			OrderRank:        60,
			ExclusivityGroup: ExclDocStructure,
			Mergeable:        false,
			Terminal:         false,
			Requires:         nil,
		},
		{
			ID:       "structure.doc.changelog",
			Name:     "Changelog",
			Category: CatDocStructure,
			Family:   FamilyStructure,
			Directive: "Task: Structure the text below as a changelog.\n" +
				"- Group entries under versions/dates where present and categories such as Added, Changed, Fixed, Removed.\n" +
				"- Use only changes the text supplies; invent no version numbers or dates. Preserve the original language.\n\n" +
				"<<<UserText Start>>>\n{{user_text}}\n<<<UserText End>>>\n\n" +
				"Format: {{user_format}}",
			OrderRank:        60,
			ExclusivityGroup: ExclDocStructure,
			Mergeable:        false,
			Terminal:         false,
			Requires:         nil,
		},
		{
			ID:       "structure.doc.releasenotes",
			Name:     "Release notes",
			Category: CatDocStructure,
			Family:   FamilyStructure,
			Directive: "Task: Structure the text below as release notes.\n" +
				"- Use sections where supported: release summary, highlights, new features, improvements, fixes, and known issues.\n" +
				"- Derive all content from the text; add nothing. Preserve the original language.\n\n" +
				"<<<UserText Start>>>\n{{user_text}}\n<<<UserText End>>>\n\n" +
				"Format: {{user_format}}",
			OrderRank:        60,
			ExclusivityGroup: ExclDocStructure,
			Mergeable:        false,
			Terminal:         false,
			Requires:         nil,
		},
		{
			ID:       "structure.doc.adr",
			Name:     "ADR (Architecture Decision Record)",
			Category: CatDocStructure,
			Family:   FamilyStructure,
			Directive: "Task: Structure the text below as an Architecture Decision Record (ADR).\n" +
				"- Use sections: Title, Status, Context, Decision, and Consequences.\n" +
				"- Derive every section strictly from the text; omit any expected section the text does not cover, silently and without a placeholder. Preserve the original language.\n\n" +
				"<<<UserText Start>>>\n{{user_text}}\n<<<UserText End>>>\n\n" +
				"Format: {{user_format}}",
			OrderRank:        60,
			ExclusivityGroup: ExclDocStructure,
			Mergeable:        false,
			Terminal:         false,
			Requires:         nil,
		},
		{
			ID:       "structure.doc.rfc",
			Name:     "RFC",
			Category: CatDocStructure,
			Family:   FamilyStructure,
			Directive: "Task: Structure the text below as an RFC (Request for Comments).\n" +
				"- Use sections where supported: summary, motivation, proposal/design, alternatives considered, drawbacks, and open questions.\n" +
				"- Derive all content from the text; introduce no new proposals. Omit any expected section the text does not cover, silently and without a placeholder. Preserve the original language.\n\n" +
				"<<<UserText Start>>>\n{{user_text}}\n<<<UserText End>>>\n\n" +
				"Format: {{user_format}}",
			OrderRank:        60,
			ExclusivityGroup: ExclDocStructure,
			Mergeable:        false,
			Terminal:         false,
			Requires:         nil,
		},
		{
			ID:       "structure.doc.apidocs",
			Name:     "API docs",
			Category: CatDocStructure,
			Family:   FamilyStructure,
			Directive: "Task: Structure the text below as API reference documentation.\n" +
				"- Use sections where supported: endpoint/method, description, parameters, request, response, and errors.\n" +
				"- Derive every detail from the text; invent no parameters, fields, or status codes. Omit any expected section the text does not cover, silently and without a placeholder. Preserve the original language.\n\n" +
				"<<<UserText Start>>>\n{{user_text}}\n<<<UserText End>>>\n\n" +
				"Format: {{user_format}}",
			OrderRank:        60,
			ExclusivityGroup: ExclDocStructure,
			Mergeable:        false,
			Terminal:         false,
			Requires:         nil,
		},
		{
			ID:       "structure.doc.tutorial",
			Name:     "Tutorial / How-to",
			Category: CatDocStructure,
			Family:   FamilyStructure,
			Directive: "Task: Structure the text below as a tutorial / how-to guide.\n" +
				"- Use sections where supported: goal, prerequisites, numbered steps, and result/next steps.\n" +
				"- Present steps in clear sequence using only the text's content. Preserve technical detail and the original language.\n\n" +
				"<<<UserText Start>>>\n{{user_text}}\n<<<UserText End>>>\n\n" +
				"Format: {{user_format}}",
			OrderRank:        60,
			ExclusivityGroup: ExclDocStructure,
			Mergeable:        false,
			Terminal:         false,
			Requires:         nil,
		},
		{
			ID:       "structure.doc.userguide",
			Name:     "User guide",
			Category: CatDocStructure,
			Family:   FamilyStructure,
			Directive: "Task: Structure the text below as a user guide.\n" +
				"- Use sections where supported: overview, getting started, features/usage, and troubleshooting.\n" +
				"- Derive all content from the text; add no new features or tips. Preserve the original language.\n\n" +
				"<<<UserText Start>>>\n{{user_text}}\n<<<UserText End>>>\n\n" +
				"Format: {{user_format}}",
			OrderRank:        60,
			ExclusivityGroup: ExclDocStructure,
			Mergeable:        false,
			Terminal:         false,
			Requires:         nil,
		},
		{
			ID:       "structure.doc.newsletter",
			Name:     "Newsletter (format)",
			Category: CatDocStructure,
			Family:   FamilyStructure,
			Directive: "Task: Format the text below as a newsletter.\n" +
				"- Use a subject/headline, a short intro, themed sections with subheadings, and a closing, where supported.\n" +
				"- Derive all content from the text; add no new items. Preserve meaning and the original language.\n\n" +
				"<<<UserText Start>>>\n{{user_text}}\n<<<UserText End>>>\n\n" +
				"Format: {{user_format}}",
			OrderRank:        60,
			ExclusivityGroup: ExclDocStructure,
			Mergeable:        false,
			Terminal:         false,
			Requires:         nil,
		},
		{
			ID:       "structure.doc.linkedin",
			Name:     "LinkedIn post (format)",
			Category: CatDocStructure,
			Family:   FamilyStructure,
			Directive: "Task: Format the text below as a LinkedIn post.\n" +
				"- Open with a strong hook line, use short single-line paragraphs and white space for readability, and keep a professional tone.\n" +
				"- Preserve the message and the original language. Add hashtags or a CTA only if already present in the text.\n\n" +
				"<<<UserText Start>>>\n{{user_text}}\n<<<UserText End>>>\n\n" +
				"Format: {{user_format}}",
			OrderRank:        60,
			ExclusivityGroup: ExclDocStructure,
			Mergeable:        false,
			Terminal:         false,
			Requires:         nil,
		},
		{
			ID:       "structure.doc.xpost",
			Name:     "X post (format)",
			Category: CatDocStructure,
			Family:   FamilyStructure,
			Directive: "Task: Format the text below as an X (Twitter) post.\n" +
				"- Keep it concise within roughly 280 characters; if the content cannot fit, format it as a numbered thread.\n" +
				"- Preserve the core message and the original language. Add no hashtags or emojis unless already present.\n\n" +
				"<<<UserText Start>>>\n{{user_text}}\n<<<UserText End>>>\n\n" +
				"Format: {{user_format}}",
			OrderRank:        60,
			ExclusivityGroup: ExclDocStructure,
			Mergeable:        false,
			Terminal:         false,
			Requires:         nil,
		},
		{
			ID:       "structure.doc.instagram",
			Name:     "Instagram caption (format)",
			Category: CatDocStructure,
			Family:   FamilyStructure,
			Directive: "Task: Format the text below as an Instagram caption.\n" +
				"- Lead with an engaging first line, use short lines and spacing, and keep the original message.\n" +
				"- Preserve the original language. Add hashtags or emojis only if already present in the text.\n\n" +
				"<<<UserText Start>>>\n{{user_text}}\n<<<UserText End>>>\n\n" +
				"Format: {{user_format}}",
			OrderRank:        60,
			ExclusivityGroup: ExclDocStructure,
			Mergeable:        false,
			Terminal:         false,
			Requires:         nil,
		},

		// ── SUMMARIZE (orderRank 80, terminal) ───────────────────────────────
		// Source: original v3 prompt draft — templates-summarize.md
		{
			ID:       "summarize.summary",
			Name:     "Summary",
			Category: CatSummarize,
			Family:   FamilySummarize,
			Directive: "Task: Write a concise summary of the text below.\n" +
				"- Capture the essential ideas faithfully in a short narrative, in your own concise wording.\n" +
				"- Add no facts, opinions, or outside context. Preserve emphasis and the original language.\n\n" +
				"<<<UserText Start>>>\n{{user_text}}\n<<<UserText End>>>\n\n" +
				"Format: {{user_format}}",
			OrderRank:        80,
			ExclusivityGroup: ExclSummarize,
			Mergeable:        false,
			Terminal:         true,
			Requires:         nil,
		},
		{
			ID:       "summarize.keypoints",
			Name:     "Key points",
			Category: CatSummarize,
			Family:   FamilySummarize,
			Directive: "Task: Extract the key points from the text below.\n" +
				"- List the main ideas as concise, standalone bullet points, each supported by the text.\n" +
				"- Add no interpretation or outside information. Preserve emphasis and the original language.\n\n" +
				"<<<UserText Start>>>\n{{user_text}}\n<<<UserText End>>>\n\n" +
				"Format: {{user_format}}",
			OrderRank:        80,
			ExclusivityGroup: ExclSummarize,
			Mergeable:        false,
			Terminal:         true,
			Requires:         nil,
		},
		{
			ID:       "summarize.tldr",
			Name:     "TL;DR",
			Category: CatSummarize,
			Family:   FamilySummarize,
			Directive: "Task: Write a TL;DR of the text below.\n" +
				"- Give the bottom line in one to three sentences capturing the single most important takeaway.\n" +
				"- Add nothing beyond the source. Preserve the original language.\n\n" +
				"<<<UserText Start>>>\n{{user_text}}\n<<<UserText End>>>\n\n" +
				"Format: {{user_format}}",
			OrderRank:        80,
			ExclusivityGroup: ExclSummarize,
			Mergeable:        false,
			Terminal:         true,
			Requires:         nil,
		},
		{
			ID:       "summarize.executive",
			Name:     "Executive summary",
			Category: CatSummarize,
			Family:   FamilySummarize,
			Directive: "Task: Write an executive summary of the text below.\n" +
				"- Lead with the bottom line, then the key findings, implications, and any decisions or recommendations the text already contains, written for a decision-maker.\n" +
				"- Use only information present in the text; add no new analysis. Preserve the original language.\n\n" +
				"<<<UserText Start>>>\n{{user_text}}\n<<<UserText End>>>\n\n" +
				"Format: {{user_format}}",
			OrderRank:        80,
			ExclusivityGroup: ExclSummarize,
			Mergeable:        false,
			Terminal:         true,
			Requires:         nil,
		},
		{
			ID:       "summarize.eli5",
			Name:     "Simple explanation (ELI5)",
			Category: CatSummarize,
			Family:   FamilySummarize,
			Directive: "Task: Re-express the text below in simple, plain language (explain it simply).\n" +
				"- Replace jargon and complex structure with everyday wording while keeping the meaning intact.\n" +
				"- Add no new examples, opinions, or outside context. Preserve the original language.\n\n" +
				"<<<UserText Start>>>\n{{user_text}}\n<<<UserText End>>>\n\n" +
				"Format: {{user_format}}",
			OrderRank:        80,
			ExclusivityGroup: ExclSummarize,
			Mergeable:        false,
			Terminal:         true,
			Requires:         nil,
		},
		{
			ID:       "summarize.hashtags",
			Name:     "Hashtag summary",
			Category: CatSummarize,
			Family:   FamilySummarize,
			Directive: "Task: Generate thematic hashtags for the text below.\n" +
				"- Produce concise hashtags, each reflecting a distinct core theme present in the text.\n" +
				"- Add no concepts not in the text; output hashtags only, no sentences. Keep the original language.\n\n" +
				"<<<UserText Start>>>\n{{user_text}}\n<<<UserText End>>>\n\n" +
				"Format: {{user_format}}",
			OrderRank:        80,
			ExclusivityGroup: ExclSummarize,
			Mergeable:        false,
			Terminal:         true,
			Requires:         nil,
		},

		// ── TRANSLATE (orderRank 90, terminal) ───────────────────────────────
		// Source: original v3 prompt draft — templates-translate.md
		{
			ID:       "translate.text",
			Name:     "Translate text",
			Category: CatTranslate,
			Family:   FamilyTranslate,
			Directive: "Task: Translate the text below from {{input_language}} into {{output_language}}.\n" +
				"- Produce a natural, fluent, idiomatic translation; preserve meaning, intent, tone, and facts exactly.\n" +
				"- Keep the original structure, formatting, and paragraph breaks. Add no notes or alternatives.\n" +
				"- If {{input_language}} and {{output_language}} are the same, return the text unchanged.\n\n" +
				"<<<UserText Start>>>\n{{user_text}}\n<<<UserText End>>>\n\n" +
				"Language direction: {{input_language}} -> {{output_language}}\n" +
				"Format: {{user_format}}",
			OrderRank:        90,
			ExclusivityGroup: ExclTranslate,
			Mergeable:        false,
			Terminal:         true,
			Requires:         []string{ReqInputLang, ReqOutputLang},
		},
		{
			ID:       "translate.localize",
			Name:     "Localize",
			Category: CatTranslate,
			Family:   FamilyTranslate,
			Directive: "Task: Localize the text below from {{input_language}} into {{output_language}}.\n" +
				"- Translate naturally and adapt locale-specific conventions for the {{output_language}} audience: dates, times, numbers, currency, units, names/forms of address, and idioms.\n" +
				"- Preserve the core meaning, intent, and all factual content; do not change the substance or invent locale facts.\n" +
				"- If {{input_language}} and {{output_language}} are the same, return the text unchanged.\n\n" +
				"<<<UserText Start>>>\n{{user_text}}\n<<<UserText End>>>\n\n" +
				"Language direction: {{input_language}} -> {{output_language}}\n" +
				"Format: {{user_format}}",
			OrderRank:        90,
			ExclusivityGroup: ExclTranslate,
			Mergeable:        false,
			Terminal:         true,
			Requires:         []string{ReqInputLang, ReqOutputLang},
		},
		{
			ID:       "translate.dictionary",
			Name:     "Dictionary table (glossary)",
			Category: CatTranslate,
			Family:   FamilyTranslate,
			Directive: "Task: Build a vocabulary glossary table from the text below.\n" +
				"- Extract the distinct, learning-worthy words (exclude punctuation and duplicates) and produce a word -> translation table from {{input_language}} into {{output_language}}.\n" +
				"- Keep each source word in its original form. Include only words present in the text. Add no definitions, notes, or commentary.\n" +
				"- If {{input_language}} and {{output_language}} are the same, return the text unchanged.\n\n" +
				"<<<UserText Start>>>\n{{user_text}}\n<<<UserText End>>>\n\n" +
				"Language direction: {{input_language}} -> {{output_language}}\n" +
				"Format: {{user_format}}",
			OrderRank:        90,
			ExclusivityGroup: ExclTranslate,
			Mergeable:        false,
			Terminal:         true,
			Requires:         []string{ReqInputLang, ReqOutputLang},
		},
		{
			ID:       "translate.examples",
			Name:     "Example sentences",
			Category: CatTranslate,
			Family:   FamilyTranslate,
			Directive: "Task: Write example sentences for the words in the text below.\n" +
				"- Treat the words in the text as the complete, exclusive vocabulary set. Write one clear, grammatically correct example sentence per word in {{output_language}}.\n" +
				"- Use each word as given (adjusting only for grammar). Introduce no words not present in the text. Add no translations or explanations.\n\n" +
				"<<<UserText Start>>>\n{{user_text}}\n<<<UserText End>>>\n\n" +
				"Output language: {{output_language}}\n" +
				"Format: {{user_format}}",
			OrderRank:        90,
			ExclusivityGroup: ExclTranslate,
			Mergeable:        false,
			Terminal:         true,
			Requires:         []string{ReqOutputLang},
		},

		// ── PROMPT ENGINEERING (orderRank 100, terminal, standalone) ─────────
		// Source: original v3 prompt draft — templates-prompt-engineering.md

		// text-LLM tools — system: SysPromptEngText, requires: none
		{
			ID:       "prompteng.text.improve",
			Name:     "Improve a text-LLM prompt",
			Category: CatPromptEng,
			Family:   FamilyPromptEng,
			Directive: "Task: Improve the prompt below for use with any text-based LLM.\n" +
				"- Sharpen clarity, structure, role, instructions, constraints, and success criteria; resolve ambiguity.\n" +
				"- Preserve the original intent, task, and output type. Add no new goals or domain content.\n" +
				"- Keep it provider-agnostic and self-contained — do not reference any tool, file, workflow, or vendor.\n\n" +
				"<<<UserText Start>>>\n{{user_text}}\n<<<UserText End>>>\n\n" +
				"Format: {{user_format}}",
			OrderRank:        100,
			ExclusivityGroup: ExclPromptEng,
			Mergeable:        false,
			Terminal:         true,
			Requires:         nil,
		},
		{
			ID:       "prompteng.text.compress",
			Name:     "Compress a prompt",
			Category: CatPromptEng,
			Family:   FamilyPromptEng,
			Directive: "Task: Compress the prompt below.\n" +
				"- Remove redundancy and verbosity while keeping every instruction, constraint, edge case, and success criterion intact and functional.\n" +
				"- Do not weaken, drop, or alter required behaviors. Preserve the original intent and output type.\n\n" +
				"<<<UserText Start>>>\n{{user_text}}\n<<<UserText End>>>\n\n" +
				"Format: {{user_format}}",
			OrderRank:        100,
			ExclusivityGroup: ExclPromptEng,
			Mergeable:        false,
			Terminal:         true,
			Requires:         nil,
		},
		{
			ID:       "prompteng.text.expand",
			Name:     "Expand a prompt",
			Category: CatPromptEng,
			Family:   FamilyPromptEng,
			Directive: "Task: Expand the prompt below into a detailed, well-structured instruction set.\n" +
				"- Elaborate roles, instructions, requirements, and edge cases only where the original intent implies them.\n" +
				"- Preserve the original task, output type, and success criteria. Introduce no new goals or stylistic preferences.\n\n" +
				"<<<UserText Start>>>\n{{user_text}}\n<<<UserText End>>>\n\n" +
				"Format: {{user_format}}",
			OrderRank:        100,
			ExclusivityGroup: ExclPromptEng,
			Mergeable:        false,
			Terminal:         true,
			Requires:         nil,
		},

		// image-prompt builder — system: SysPromptEngImage, requires: target_model, goal
		{
			ID:       "prompteng.image",
			Name:     "Build an image-edit prompt",
			Category: CatPromptEng,
			Family:   FamilyPromptEng,
			Directive: `Task: Build ONE optimized image-edit prompt for the model "{{target_model}}", tuned to the goal "{{goal}}", from the description/seed below.` + "\n" +
				`- Resolve "{{target_model}}" to its output paradigm:` + "\n" +
				"  - GPT-Image / Gemini (Nano-Banana) / FLUX.2 / FLUX.2-Klein -> a single natural-language brief, NO negative-prompt field (FLUX front-loads camera/lens language; FLUX.2-Klein stays short and literal).\n" +
				"  - Qwen-Image-Edit / JoyAI-Image-Edit -> concise imperative instructions plus a separate \"Negative prompt:\" block and an optional short settings note (JoyAI negatives may be prefixed \"--neg-prompt\").\n" +
				"  - Stable Diffusion (SDXL/3.5) -> a \"Positive prompt:\" (comma-tags for SDXL or a natural sentence for SD 3.5), a \"Negative prompt:\" block, and a \"Settings:\" note (denoise per the fidelity dial, CFG, sampler/steps, identity-lock add-ons).\n" +
				`- Resolve "{{goal}}" to the fidelity dial and content recipe:` + "\n" +
				"  - Restore / improve / colorize / all-in-one -> stay FAITHFUL: repair and clean only, lock identity, pose, framing, and composition, keep natural skin/scene texture, no beautifying or reshaping; on Stable Diffusion keep denoise low.\n" +
				"  - Restyle / photo->anime / anime-or-cartoon->photo -> allow the rendering medium or art style to change but still pin identity, pose, and composition; on Stable Diffusion raise denoise.\n" +
				"  - Pro-camera / cinematic restyle -> add explicit camera and optics vocabulary (camera body + lens, key/fill lighting, depth of field, color accuracy, crisp focus on the eyes).\n" +
				"- Always state explicitly what must NOT change (face/identity, expression, pose, hairstyle, key objects, composition, aspect ratio) and include a \"do not\" block (no beautify/slim/reshape, no added/removed people or objects, no recomposition, no plastic/waxy skin, no warped anatomy, no extra fingers, no text/watermark).\n" +
				"- Reconstruct any missing detail conservatively from surrounding context; do not invent a new identity.\n\n" +
				"Description / seed:\n" +
				"<<<UserText Start>>>\n{{user_text}}\n<<<UserText End>>>\n\n" +
				"Target model: {{target_model}}\n" +
				"Goal: {{goal}}\n" +
				"Format: {{user_format}}",
			OrderRank:        100,
			ExclusivityGroup: ExclPromptEng,
			Mergeable:        false,
			Terminal:         true,
			Requires:         []string{ReqTargetModel, ReqGoal},
		},

		// video-prompt builder — system: SysPromptEngVideo, requires: target_model
		{
			ID:       "prompteng.video",
			Name:     "Build a video-generation prompt",
			Category: CatPromptEng,
			Family:   FamilyPromptEng,
			Directive: `Task: Build ONE optimized video-generation prompt for the model "{{target_model}}" from the description/seed below.` + "\n" +
				"- Use the shot anatomy: Subject + Action + Scene + Camera + Lighting + Style (+ Audio if \"{{target_model}}\" supports it).\n" +
				"- Keep ONE dominant action; never combine contradictory or multiple simultaneous actions in a single clip.\n" +
				"- Name shot size and camera move in film grammar (static shot, slow dolly-in, pan, tracking, crane, orbit) with motion-speed adverbs; use \"static shot\" to suppress camera motion.\n" +
				"- If the seed implies image-to-video conditioning, describe ONLY motion and camera — do not re-describe static content already fixed by the image.\n" +
				`- Resolve "{{target_model}}" to its negative-prompt paradigm:` + "\n" +
				"  - Wan / Kling / Hailuo / HunyuanVideo / LTX / CogVideoX / Mochi / Seedance -> append a separate \"Negative prompt:\" block (artifact list: blurred details, low quality, overexposed, deformed, extra/fused fingers, warped anatomy, flicker, morphing, watermark, subtitles) plus seed-specific exclusions; for open-weight models add a short settings note (guidance/CFG, steps, frames/FPS); for Hailuo write camera moves as bracketed [commands].\n" +
				"  - Runway / Pika / Luma -> write only what you DO want; do NOT phrase any exclusions.\n" +
				"  - Veo -> keep the prose free of negation and add a short \"negative_prompt parameter:\" line listing exclusions for the API field.\n" +
				"- Do not put duration or resolution in the prose; those are tool/UI parameters.\n\n" +
				"Description / seed:\n" +
				"<<<UserText Start>>>\n{{user_text}}\n<<<UserText End>>>\n\n" +
				"Target model: {{target_model}}\n" +
				"Format: {{user_format}}",
			OrderRank:        100,
			ExclusivityGroup: ExclPromptEng,
			Mergeable:        false,
			Terminal:         true,
			Requires:         []string{ReqTargetModel},
		},
	}
}
