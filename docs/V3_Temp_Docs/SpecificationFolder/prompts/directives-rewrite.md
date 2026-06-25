# Directives — REWRITE Family (GoText v3)

Family: `rewrite`
System prompt: `SYS.rewrite` (`v3.0.0`)
Version: `v3.0.0`

Each REWRITE action is an atomic **directive fragment** injected into the paired
user template. All fragments share the single `SYS.rewrite` system prompt and its
meaning-preservation contract.

Common directive metadata (unless noted per directive):

- `mergeable`: `true`
- `terminal`: `false`

Exclusivity sub-groups and canonical order:

| Sub-group | orderRank | Selection rule |
|---|---|---|
| `proofread` | 10 | at most one |
| `rewrite-intent` | 20 | at most one per stack |
| `tone` | 30 | exactly one (when tone is requested) |
| `style` | 40 | exactly one (when style is requested) |

A directive fragment is one or two precise imperative sentences. When several
sub-groups are selected, the Composer concatenates the chosen fragments into a
single ordered "Apply in order" list (see the USER-PROMPT TEMPLATE section).

---

## Sub-group: `proofread` (orderRank 10)

### `rewrite.proofread.basic`
- Display name: Basic proofreading
- Sub-group / exclusivity: `proofread`
- mergeable: `true` · terminal: `false` · orderRank: `10`
- Description: Corrects grammar, spelling, punctuation, capitalization, and basic consistency with minimal changes.
- Directive fragment:
  > Correct grammar, spelling, punctuation, capitalization, and basic internal consistency (tense, voice, terminology), making only the minimal changes needed for correctness. Do not rephrase for style, alter tone, or reorganize content.

### `rewrite.proofread.enhanced`
- Display name: Enhanced proofreading
- Sub-group / exclusivity: `proofread`
- mergeable: `true` · terminal: `false` · orderRank: `10`
- Description: Corrects errors and also resolves ambiguity, redundancy, and rough flow without changing meaning.
- Directive fragment:
  > Correct all surface errors and, in addition, smooth sentence flow and transitions, resolve ambiguous references, and remove unnecessary redundancy without changing meaning, tone, or register. Add no new content and introduce no stylistic changes beyond what clarity and flow require.

### `rewrite.proofread.consistency`
- Display name: Style & terminology consistency
- Sub-group / exclusivity: `proofread`
- mergeable: `true` · terminal: `false` · orderRank: `10`
- Description: Enforces consistent tense, voice, terminology, and usage throughout the text.
- Directive fragment:
  > Enforce consistent tense, grammatical voice, terminology, capitalization, and usage throughout the text, resolving conflicting word choices and references to a single consistent form. Make only the changes needed for consistency and correctness; do not rewrite for style or flow beyond that.

### `rewrite.proofread.readability`
- Display name: Readability improvement
- Sub-group / exclusivity: `proofread`
- mergeable: `true` · terminal: `false` · orderRank: `10`
- Description: Simplifies complex sentences and wording for a general audience while preserving meaning and tone.
- Directive fragment:
  > Improve readability for a general audience by breaking up or simplifying overly long or complex sentences and replacing needlessly difficult wording with clearer equivalents. Preserve the original meaning, intent, tone, and all facts; add no stylistic flair and remove no content.

### `rewrite.proofread.clarification`
- Display name: Clarification
- Sub-group / exclusivity: `proofread`
- mergeable: `true` · terminal: `false` · orderRank: `10`
- Description: Removes ambiguity by making implied meaning explicit, without adding new information.
- Directive fragment:
  > Remove ambiguity by making the existing meaning explicit — clarifying vague references, undefined terms, and unclear relationships using only information already present in the text. Do not add new facts, examples, or interpretations, and do not change the stance or level of detail.

---

## Sub-group: `rewrite-intent` (orderRank 20)

### `rewrite.intent.concise`
- Display name: Concise
- Sub-group / exclusivity: `rewrite-intent`
- mergeable: `true` · terminal: `false` · orderRank: `20`
- Description: Tightens the text by removing filler and redundancy while preserving meaning and tone.
- Directive fragment:
  > Make the text more concise by removing filler, redundancy, and unnecessary verbosity and tightening phrasing, while preserving the original meaning, intent, tone, and every essential detail. Do not summarize beyond the natural reduction of removing fluff, and add no new information.

### `rewrite.intent.simplify`
- Display name: Simplify
- Sub-group / exclusivity: `rewrite-intent`
- mergeable: `true` · terminal: `false` · orderRank: `20`
- Description: Reduces complexity with plainer words and simpler sentences for non-expert readers.
- Directive fragment:
  > Reduce complexity using plainer vocabulary, shorter sentences, and less jargon so a non-expert reader can follow it, while keeping the original meaning, intent, and all facts intact. Avoid idioms and culture-specific expressions; do not omit essential detail.

### `rewrite.intent.paraphrase`
- Display name: Paraphrase
- Sub-group / exclusivity: `rewrite-intent`
- mergeable: `true` · terminal: `false` · orderRank: `20`
- Description: Restates the text with different wording and structure, keeping the same meaning, tone, and length.
- Directive fragment:
  > Restate the text using different wording and sentence structure while keeping the same meaning, intent, facts, tone, register, and approximate length. Do not add or remove information and do not shift the formality.

### `rewrite.intent.humanize`
- Display name: Humanize
- Sub-group / exclusivity: `rewrite-intent`
- mergeable: `true` · terminal: `false` · orderRank: `20`
- Description: Removes AI-tells, varies sentence rhythm, and grounds the text in the specifics already present.
- Directive fragment:
  > Make the text read as natural human writing: remove formulaic AI-tell vocabulary and corporate filler (English examples — "delve," "leverage," "tapestry," "navigate the landscape," "it's important to note," "in today's fast-paced world"; apply the equivalent AI-tell removal in the text's own language), prefer plain verbs and active voice, and deliberately vary sentence and paragraph length so the rhythm is uneven rather than uniform. Keep every existing fact, name, number, and the author's intent; invent no new specifics and add no commentary.

### `rewrite.intent.professionalize`
- Display name: Professionalize
- Sub-group / exclusivity: `rewrite-intent`
- mergeable: `true` · terminal: `false` · orderRank: `20`
- Description: Raises a casual draft to a polished, workplace-appropriate register without changing substance.
- Directive fragment:
  > Raise the register to polished, competent, workplace-appropriate language: replace casual or slang phrasing with professional equivalents, tighten structure, and remove informality, while preserving the original meaning, intent, and all facts. Add no new claims, requests, or commitments.

---

## Sub-group: `tone` (orderRank 30) — exactly one

Each tone directive adjusts only the emotional attitude the text projects; the
substantive message stays the same. All share `mergeable: true`,
`terminal: false`, `orderRank: 30`, exclusivity `tone`.

### `rewrite.tone.professional`
- Display name: Professional
- Description: Competent, composed, outcome-focused workplace tone.
- Directive fragment:
  > Adjust the tone to be professional — competent, composed, and outcome-focused — using clear, courteous workplace language. Change only the emotional framing; keep the message, facts, and structure unchanged.

### `rewrite.tone.friendly`
- Display name: Friendly
- Description: Warm, approachable, and kind tone.
- Directive fragment:
  > Adjust the tone to be friendly — warm, approachable, and kind — with everyday wording and a personable framing. Change only the emotional framing; keep the message, facts, and structure unchanged.

### `rewrite.tone.neutral`
- Display name: Neutral
- Description: Detached, even, fact-first tone with no emotional coloring.
- Directive fragment:
  > Adjust the tone to be neutral — detached, even, and free of emotional coloring or subjective phrasing. Change only the emotional framing; keep the message, facts, and structure unchanged.

### `rewrite.tone.direct`
- Display name: Direct
- Description: Straightforward, concise, action-focused tone.
- Directive fragment:
  > Adjust the tone to be direct — straightforward, concise, and action-focused — leading with the point and using plain, unhedged language. Change only the emotional framing; add no new actions or requests and keep the facts unchanged.

### `rewrite.tone.indirect`
- Display name: Indirect
- Description: Softened, tactful, diplomatically framed tone.
- Directive fragment:
  > Adjust the tone to be indirect — softened, tactful, and considerate — reducing bluntness while still conveying the same point. Change only the emotional framing; keep the message, facts, and structure unchanged.

### `rewrite.tone.enthusiastic`
- Display name: Enthusiastic
- Description: Energetic, upbeat, positive tone.
- Directive fragment:
  > Adjust the tone to be enthusiastic — energetic, upbeat, and positive — without exaggeration or invented excitement. Change only the emotional framing; keep the message, facts, and structure unchanged.

### `rewrite.tone.formal`
- Display name: Formal
- Description: Reserved, respectful, distant tone.
- Directive fragment:
  > Adjust the tone to be formal — reserved, respectful, and impersonal — avoiding contractions, slang, and casual phrasing. Change only the emotional framing; keep the message, facts, and structure unchanged.

### `rewrite.tone.warm`
- Display name: Warm
- Description: Caring, personal, considerate tone.
- Directive fragment:
  > Adjust the tone to be warm — caring, personal, and considerate — using gentle, human phrasing. Change only the emotional framing; keep the message, facts, and structure unchanged.

### `rewrite.tone.empathetic`
- Display name: Empathetic
- Description: Validating, understanding tone that acknowledges the reader's feelings.
- Directive fragment:
  > Adjust the tone to be empathetic — acknowledging and validating the reader's feelings or situation while staying specific rather than hollow. Change only the emotional framing; add no new promises or admissions and keep the facts unchanged.

### `rewrite.tone.confident`
- Display name: Confident
- Description: Assured, decisive tone without arrogance.
- Directive fragment:
  > Adjust the tone to be confident — assured and decisive — stating points firmly without hedging and without tipping into arrogance. Change only the emotional framing; keep the message, facts, and structure unchanged.

### `rewrite.tone.assertive`
- Display name: Assertive
- Description: Direct, boundary-setting tone that stays respectful.
- Directive fragment:
  > Adjust the tone to be assertive — direct and boundary-setting — clearly stating needs or positions while remaining respectful and non-aggressive. Change only the emotional framing; add no new demands and keep the facts unchanged.

### `rewrite.tone.diplomatic`
- Display name: Diplomatic
- Description: Tactful, balanced tone suited to disagreement.
- Directive fragment:
  > Adjust the tone to be diplomatic — tactful and balanced — framing the point considerately and as "us versus the problem" rather than confrontationally. Change only the emotional framing; keep the message, facts, and structure unchanged.

### `rewrite.tone.collaborative`
- Display name: Collaborative
- Description: Inclusive, team-oriented tone using "we/let's" framing.
- Directive fragment:
  > Adjust the tone to be collaborative — inclusive and team-oriented, using "we" and "let's" framing where natural — without manufacturing false consensus. Change only the emotional framing; keep the message, facts, and structure unchanged.

### `rewrite.tone.respectful`
- Display name: Respectful
- Description: Deferential, considerate tone for seniors or sensitive topics.
- Directive fragment:
  > Adjust the tone to be respectful — deferential and considerate — while staying clear and not servile. Change only the emotional framing; keep the message, facts, and structure unchanged.

### `rewrite.tone.educational`
- Display name: Educational
- Description: Patient, explanatory teaching tone.
- Directive fragment:
  > Adjust the tone to be educational — patient and explanatory, as when teaching — without becoming condescending. Change only the emotional framing; add no new explanatory content and keep the facts unchanged.

### `rewrite.tone.supportive`
- Display name: Supportive
- Description: Encouraging tone that still carries the message candidly.
- Directive fragment:
  > Adjust the tone to be supportive — encouraging and constructive — while still conveying the message candidly and not softening it into vagueness. Change only the emotional framing; keep the message, facts, and structure unchanged.

### `rewrite.tone.reassuring`
- Display name: Reassuring
- Description: Calming tone for worry or uncertainty.
- Directive fragment:
  > Adjust the tone to be reassuring — calm and steadying — to ease worry or uncertainty, without offering false comfort or unfounded guarantees. Change only the emotional framing; add no new assurances and keep the facts unchanged.

### `rewrite.tone.authoritative`
- Display name: Authoritative
- Description: Expert, definitive tone for official guidance.
- Directive fragment:
  > Adjust the tone to be authoritative — expert and definitive — conveying command of the subject without arrogance. Change only the emotional framing; keep the message, facts, and structure unchanged.

### `rewrite.tone.serious`
- Display name: Serious
- Description: Grave, focused tone for high-stakes topics.
- Directive fragment:
  > Adjust the tone to be serious — grave and focused — removing levity and signaling the weight of the matter. Change only the emotional framing; keep the message, facts, and structure unchanged.

### `rewrite.tone.casual`
- Display name: Casual
- Description: Relaxed, informal, peer-to-peer tone.
- Directive fragment:
  > Adjust the tone to be casual — relaxed and informal, as when writing to a peer — using contractions and everyday phrasing. Change only the emotional framing; keep the message, facts, and structure unchanged.

---

## Sub-group: `style` (orderRank 40) — exactly one

Each style directive adapts the structural and vocabulary register of the text.
All share `mergeable: true`, `terminal: false`, `orderRank: 40`, exclusivity
`style`. Apply only one style per run.

### `rewrite.style.formal`
- Display name: Formal
- Description: Impersonal, precise, rule-correct register for legal, regulatory, or executive reports.
- Directive fragment:
  > Adapt the style to formal: impersonal, precise, and rule-correct, with no contractions or slang and complete, well-structured sentences suitable for legal, regulatory, or formal business contexts. Preserve all meaning, facts, names, and references; do not summarize or expand.

### `rewrite.style.semi-formal`
- Display name: Semi-formal
- Description: Polished but human register for most business email and client documents.
- Directive fragment:
  > Adapt the style to semi-formal: polished but human, with light contractions, standard vocabulary, and medium-length sentences suitable for business email, proposals, and client documents. Preserve all meaning, facts, and references; avoid slang and do not change substance.

### `rewrite.style.casual`
- Display name: Casual
- Description: Relaxed, everyday register for peers, chat, and informal contexts.
- Directive fragment:
  > Adapt the style to casual: relaxed, everyday language with contractions and a peer-to-peer feel, while staying clear and coherent. Preserve all meaning, intent, and facts; do not add or remove content.

### `rewrite.style.academic`
- Display name: Academic
- Description: Evidence-based, objective scholarly register with discipline-appropriate terminology.
- Directive fragment:
  > Adapt the style to academic: objective, evidence-based, and precisely worded, using scholarly tone and discipline-appropriate terminology and avoiding colloquial phrasing. Preserve all meaning, claims, data, names, and references without altering substance.

### `rewrite.style.technical`
- Display name: Technical
- Description: Precise, unambiguous register with exact domain terminology for documentation.
- Directive fragment:
  > Adapt the style to technical: precise and unambiguous, using exact, consistent domain terminology and clear sentence structure suitable for specifications and documentation. Preserve all meaning and technical detail; reduce ambiguity without changing substance.

### `rewrite.style.journalistic`
- Display name: Journalistic
- Description: Fact-first, concise register using inverted-pyramid emphasis.
- Directive fragment:
  > Adapt the style to journalistic: clear, factual, and concise, leading with the most important information (inverted pyramid) and using neutral, attributed phrasing in short paragraphs. Preserve all facts and meaning; reorder for emphasis only as the inverted pyramid requires and add no opinion.

### `rewrite.style.creative`
- Display name: Creative / storytelling
- Description: Expressive, narrative register with vivid, varied prose.
- Directive fragment:
  > Adapt the style to creative storytelling: expressive and vivid, with narrative flow, sensory detail, and varied rhythm, while remaining coherent. Preserve the original meaning and facts; enhance imagery and rhythm without inventing new events or claims.

### `rewrite.style.seo`
- Display name: SEO-optimized
- Description: Keyword-aware, scannable register structured for search consumption.
- Directive fragment:
  > Adapt the style to SEO-optimized: scannable and keyword-aware, with clear structure and logical flow that naturally reinforces relevant keywords already present in the text. Do not invent or inject new keywords, claims, or content; preserve all meaning and facts.

### `rewrite.style.risk-reduce`
- Display name: Risk-reduce (hedged / low-liability)
- Description: Cautious, hedged register that softens strong claims and reduces legal exposure.
- Directive fragment:
  > Adapt the style to reduce risk: soften strong claims, guarantees, promises, and absolutes into cautious, neutral, professional phrasing that limits legal, regulatory, or compliance exposure. Preserve the underlying meaning and intent; introduce no new assurances, obligations, or legal positions.

### `rewrite.style.conversational`
- Display name: Conversational
- Description: Edited natural-speech register for blogs, docs, and UX copy.
- Directive fragment:
  > Adapt the style to conversational: natural, edited speech with contractions, second person, and short sentences suitable for blogs, docs, and UX copy. Preserve all meaning and facts; keep it clear and add no content.

### `rewrite.style.persuasive`
- Display name: Persuasive
- Description: Argument-driven register that builds reasoned support toward the existing conclusion.
- Directive fragment:
  > Adapt the style to persuasive: structure the existing points as a reasoned argument that builds toward the conclusion already present, strengthening phrasing and flow for impact. Add no new claims, guarantees, or calls to action and do not change the stance or facts.

### `rewrite.style.executive`
- Display name: Executive (BLUF)
- Description: Decision-first, concise register that leads with the bottom line.
- Directive fragment:
  > Adapt the style to executive BLUF (bottom line up front): lead with the conclusion or recommendation, then supporting points, using concise, high-level, quantified language and no jargon dumps. Preserve all facts and meaning; reorder for the bottom-line-first structure only and add nothing new.

### `rewrite.style.documentation`
- Display name: Documentation
- Description: Findable, scannable reference register with consistent terms and active voice.
- Directive fragment:
  > Adapt the style to documentation: findable and scannable, using sentence-case phrasing, consistent terminology, present tense, and active voice without subjective language. Preserve all meaning and facts; do not add reference material the source does not contain.

### `rewrite.style.instructional`
- Display name: Instructional
- Description: Step-by-step, second-person imperative register for how-tos and guides.
- Directive fragment:
  > Adapt the style to instructional: clear, second-person, imperative phrasing ("Click," "Run," "Create") organized as ordered steps where the content supports it, suitable for tutorials and how-tos. Preserve all meaning and facts; introduce no steps the source does not support.

### `rewrite.style.support`
- Display name: Support / customer-facing
- Description: Empathetic, jargon-free, solution-focused register for external touchpoints.
- Directive fragment:
  > Adapt the style to support and customer-facing: accessible, jargon-free, courteous, and solution-focused, avoiding blame and defensiveness. Preserve all meaning and facts; add no new commitments, apologies, or guarantees beyond what the source already states.

---

## USER-PROMPT TEMPLATE (Composer output)

For a merged group, the Composer renders the selected directive fragments — one
per chosen sub-group, ordered by `orderRank` ascending — into the following
template. `{{directive_1}} … {{directive_n}}` are the fragment texts; the
numbered list always reflects canonical order (proofread → rewrite-intent → tone
→ style).

```
Task: Rewrite the text below by applying the following edits.

Apply in order:
1) {{directive_1}}
2) {{directive_2}}
... (one numbered item per selected directive, in canonical order)

Apply every step above to a single result. Preserve the original meaning, intent, facts, names, and numbers, and change only the dimensions the steps request.

Text to process:
<<<UserText Start>>>
{{user_text}}
<<<UserText End>>>

Format: {{user_format}}
- Return ONLY the final processed text in {{user_format}}, with no labels, notes, or commentary.
```

### Worked example — proofread + professional + concise

Selected directives: `rewrite.proofread.enhanced` (orderRank 10),
`rewrite.intent.concise` (orderRank 20), `rewrite.tone.professional`
(orderRank 30). Ordered by `orderRank`, the rendered user prompt is:

```
Task: Rewrite the text below by applying the following edits.

Apply in order:
1) Correct all surface errors and, in addition, smooth sentence flow and transitions, resolve ambiguous references, and remove unnecessary redundancy without changing meaning, tone, or register. Add no new content and introduce no stylistic changes beyond what clarity and flow require.
2) Make the text more concise by removing filler, redundancy, and unnecessary verbosity and tightening phrasing, while preserving the original meaning, intent, tone, and every essential detail. Do not summarize beyond the natural reduction of removing fluff, and add no new information.
3) Adjust the tone to be professional — competent, composed, and outcome-focused — using clear, courteous workplace language. Change only the emotional framing; keep the message, facts, and structure unchanged.

Apply every step above to a single result. Preserve the original meaning, intent, facts, names, and numbers, and change only the dimensions the steps request.

Text to process:
<<<UserText Start>>>
{{user_text}}
<<<UserText End>>>

Format: {{user_format}}
- Return ONLY the final processed text in {{user_format}}, with no labels, notes, or commentary.
```

This merged user prompt is paired with the single `SYS.rewrite` system prompt at
compile time.
