# User-Prompt Templates — STRUCTURE Family (GoText v3)

Family: `structure` · System prompt: `system-structure.md`
Version (all actions): `v3.0.0`
Placeholders: `{{user_text}}`, `{{user_format}}` (Plain / Markdown).

Two sub-groups:
- `structure.format` (orderRank 50) — mergeable within the family; exclusivity:
  none (composable). 7 actions.
- `structure.doc` (orderRank 60) — exclusive within the family (one document
  type per run); not mergeable with other doc-structure actions. 24 actions.

All actions in this family are non-terminal, require nothing, and preserve the
original language. Each template ends with the `<<<UserText Start>>> … <<<UserText
End>>>` delimiters and a `Format: {{user_format}}` footer.

================================================================================
## SUB-GROUP: structure.format  (orderRank 50 · mergeable · composable)
================================================================================

### structure.format.markdown — "To Markdown"
Metadata: family=structure · subGroup=format · orderRank=50 · mergeable=true · terminal=false · requires=none

```
Task: Convert to a clean Markdown document.
- Re-express the text below using valid Markdown: headings, lists, emphasis, code blocks, and tables only where the content already implies them.
- Preserve all wording, meaning, facts, and the original language. Add nothing.

<<<UserText Start>>>
{{user_text}}
<<<UserText End>>>

Format: {{user_format}}
```

### structure.format.prose — "Paragraph / prose"
Metadata: family=structure · subGroup=format · orderRank=50 · mergeable=true · terminal=false · requires=none

```
Task: Format the text below as flowing paragraph prose.
- Merge fragments, bullets, or lists into coherent, well-connected paragraphs with minimal transitional wording.
- Preserve meaning, intent, facts, and the original language. Do not add, drop, reorder, or summarize content.

<<<UserText Start>>>
{{user_text}}
<<<UserText End>>>

Format: {{user_format}}
```

### structure.format.bullets — "Bullet list"
Metadata: family=structure · subGroup=format · orderRank=50 · mergeable=true · terminal=false · requires=none

```
Task: Format the text below as a bullet list.
- Make each bullet one distinct idea drawn from the text; keep parallel phrasing.
- Preserve meaning, facts, and the original language. Do not add or invent points.

<<<UserText Start>>>
{{user_text}}
<<<UserText End>>>

Format: {{user_format}}
```

### structure.format.numbered — "Numbered / ordered list"
Metadata: family=structure · subGroup=format · orderRank=50 · mergeable=true · terminal=false · requires=none

```
Task: Format the text below as a numbered (ordered) list.
- Use numbering only where the content has a genuine sequence or ranking; one item per line.
- Preserve meaning, order, facts, and the original language. Do not add items.

<<<UserText Start>>>
{{user_text}}
<<<UserText End>>>

Format: {{user_format}}
```

### structure.format.headings — "Headings & sections"
Metadata: family=structure · subGroup=format · orderRank=50 · mergeable=true · terminal=false · requires=none

```
Task: Organize the text below under clear headings and sections.
- Group related content and add concise section headings derived strictly from the existing content.
- Preserve all wording, facts, level of detail, and the original language. Do not introduce new topics.

<<<UserText Start>>>
{{user_text}}
<<<UserText End>>>

Format: {{user_format}}
```

### structure.format.table — "Table"
Metadata: family=structure · subGroup=format · orderRank=50 · mergeable=true · terminal=false · requires=none

```
Task: Format the text below as a table.
- Infer columns and rows only from structure the content already contains; use a clear header row.
- Place every value in the cell it belongs to without altering or inventing data. Preserve the original language.

<<<UserText Start>>>
{{user_text}}
<<<UserText End>>>

Format: {{user_format}}
```

### structure.format.steps — "Instruction / numbered steps"
Metadata: family=structure · subGroup=format · orderRank=50 · mergeable=true · terminal=false · requires=none

```
Task: Format the text below as sequential numbered steps.
- Convert the described process into ordered, action-oriented steps; keep any prerequisites or notes the text supplies.
- Preserve all instructions, technical detail, order, and the original language. Add no steps that are not in the text.

<<<UserText Start>>>
{{user_text}}
<<<UserText End>>>

Format: {{user_format}}
```

================================================================================
## SUB-GROUP: structure.doc  (orderRank 60 · exclusive · one type per run)
================================================================================

> Every doc template derives sections strictly from the input; expected-but-missing
> sections are **omitted silently** — never fabricated and never marked with a "TODO"
> placeholder. Each preserves the original language and ends with the delimiters +
> `Format: {{user_format}}` footer.

### structure.doc.faq — "FAQ"
Metadata: family=structure · subGroup=doc · orderRank=60 · mergeable=false · exclusive=true · terminal=false · requires=none

```
Task: Structure the text below as an FAQ.
- Derive clear question-and-answer pairs covering the key topics the text contains.
- Every answer must be supported by the text; add no new information. Preserve the original language.

<<<UserText Start>>>
{{user_text}}
<<<UserText End>>>

Format: {{user_format}}
```

### structure.doc.userstory — "User story"
Metadata: family=structure · subGroup=doc · orderRank=60 · mergeable=false · exclusive=true · terminal=false · requires=none

```
Task: Structure the text below as a user story.
- Use sections where supported: title, "As a / I want / so that" statement, description, and acceptance criteria.
- Derive everything strictly from the text; omit any expected section the text does not cover, silently and without a placeholder. Preserve the original language.

<<<UserText Start>>>
{{user_text}}
<<<UserText End>>>

Format: {{user_format}}
```

### structure.doc.techspec — "Technical spec"
Metadata: family=structure · subGroup=doc · orderRank=60 · mergeable=false · exclusive=true · terminal=false · requires=none

```
Task: Structure the text below as a technical specification.
- Use sections where supported: overview, requirements, constraints, interfaces/design, and acceptance criteria.
- Derive every element from the text; introduce no new requirements. Omit any expected section the text does not cover, silently and without a placeholder. Preserve the original language.

<<<UserText Start>>>
{{user_text}}
<<<UserText End>>>

Format: {{user_format}}
```

### structure.doc.meetingnotes — "Meeting notes / minutes"
Metadata: family=structure · subGroup=doc · orderRank=60 · mergeable=false · exclusive=true · terminal=false · requires=none

```
Task: Structure the text below as meeting minutes.
- Use sections where supported: attendees, agenda, discussion, decisions, and action items (with owners where stated).
- Separate decisions from action items; include only what the notes support. Preserve names, facts, and the original language.

<<<UserText Start>>>
{{user_text}}
<<<UserText End>>>

Format: {{user_format}}
```

### structure.doc.proposal — "Proposal"
Metadata: family=structure · subGroup=doc · orderRank=60 · mergeable=false · exclusive=true · terminal=false · requires=none

```
Task: Structure the text below as a proposal.
- Use sections where supported: problem statement, proposed solution, benefits, scope, and timeline.
- Derive all content from the text; add no new offers, benefits, or dates. Omit any expected section the text does not cover, silently and without a placeholder. Preserve the original language.

<<<UserText Start>>>
{{user_text}}
<<<UserText End>>>

Format: {{user_format}}
```

### structure.doc.report — "Report"
Metadata: family=structure · subGroup=doc · orderRank=60 · mergeable=false · exclusive=true · terminal=false · requires=none

```
Task: Structure the text below as a report.
- Use sections where supported: title, introduction, body sections with headings, and conclusion.
- Derive headings and content strictly from the text; do not summarize or expand. Preserve facts and the original language.

<<<UserText Start>>>
{{user_text}}
<<<UserText End>>>

Format: {{user_format}}
```

### structure.doc.email — "Email (format)"
Metadata: family=structure · subGroup=doc · orderRank=60 · mergeable=false · exclusive=true · terminal=false · requires=none

```
Task: Format the text below as a professional email.
- Organize into subject line (if derivable), greeting, body paragraphs, and closing.
- Preserve the message, wording, intent, and the original language. Add no new content, signature details, or claims.

<<<UserText Start>>>
{{user_text}}
<<<UserText End>>>

Format: {{user_format}}
```

### structure.doc.blog — "Blog post (format)"
Metadata: family=structure · subGroup=doc · orderRank=60 · mergeable=false · exclusive=true · terminal=false · requires=none

```
Task: Format the text below as a blog post.
- Add a title and logical section headings derived from the content; arrange into readable paragraphs.
- Preserve meaning, facts, and the original language. Add no new ideas or embellishment.

<<<UserText Start>>>
{{user_text}}
<<<UserText End>>>

Format: {{user_format}}
```

### structure.doc.social — "Social post (format)"
Metadata: family=structure · subGroup=doc · orderRank=60 · mergeable=false · exclusive=true · terminal=false · requires=none

```
Task: Format the text below as a generic social media post.
- Make it concise and scannable with line breaks; keep the core message.
- Preserve meaning and the original language. Add no hashtags, emojis, or calls to action unless already present.

<<<UserText Start>>>
{{user_text}}
<<<UserText End>>>

Format: {{user_format}}
```

### structure.doc.resume — "Resume (format)"
Metadata: family=structure · subGroup=doc · orderRank=60 · mergeable=false · exclusive=true · terminal=false · requires=none

```
Task: Format the text below as a resume.
- Use sections where supported: summary, experience, skills, and education, with concise bullet points.
- Preserve all facts, dates, names, and the original language. Add no achievements or details not in the text.

<<<UserText Start>>>
{{user_text}}
<<<UserText End>>>

Format: {{user_format}}
```

### structure.doc.headline — "Headline / title generator"
Metadata: family=structure · subGroup=doc · orderRank=60 · mergeable=false · exclusive=true · terminal=false · requires=none

```
Task: Generate headline / title options for the text below.
- Produce several distinct titles (neutral, concise, engaging) that accurately reflect the content.
- Derive each strictly from the text; add no new claims. Keep the original language.

<<<UserText Start>>>
{{user_text}}
<<<UserText End>>>

Format: {{user_format}}
```

### structure.doc.tagline — "Tagline generator"
Metadata: family=structure · subGroup=doc · orderRank=60 · mergeable=false · exclusive=true · terminal=false · requires=none

```
Task: Generate taglines / slogans for the text below.
- Produce several short, punchy taglines that reflect the core message.
- Derive each strictly from the text; add no new claims. Keep the original language.

<<<UserText Start>>>
{{user_text}}
<<<UserText End>>>

Format: {{user_format}}
```

### structure.doc.readme — "README"
Metadata: family=structure · subGroup=doc · orderRank=60 · mergeable=false · exclusive=true · terminal=false · requires=none

```
Task: Structure the text below as a project README.
- Use sections where supported: title, description, features, installation, usage, configuration, and license.
- Derive every section from the text; omit any expected section the text does not cover, silently and without a placeholder. Preserve the original language.

<<<UserText Start>>>
{{user_text}}
<<<UserText End>>>

Format: {{user_format}}
```

### structure.doc.changelog — "Changelog"
Metadata: family=structure · subGroup=doc · orderRank=60 · mergeable=false · exclusive=true · terminal=false · requires=none

```
Task: Structure the text below as a changelog.
- Group entries under versions/dates where present and categories such as Added, Changed, Fixed, Removed.
- Use only changes the text supplies; invent no version numbers or dates. Preserve the original language.

<<<UserText Start>>>
{{user_text}}
<<<UserText End>>>

Format: {{user_format}}
```

### structure.doc.releasenotes — "Release notes"
Metadata: family=structure · subGroup=doc · orderRank=60 · mergeable=false · exclusive=true · terminal=false · requires=none

```
Task: Structure the text below as release notes.
- Use sections where supported: release summary, highlights, new features, improvements, fixes, and known issues.
- Derive all content from the text; add nothing. Preserve the original language.

<<<UserText Start>>>
{{user_text}}
<<<UserText End>>>

Format: {{user_format}}
```

### structure.doc.adr — "ADR (Architecture Decision Record)"
Metadata: family=structure · subGroup=doc · orderRank=60 · mergeable=false · exclusive=true · terminal=false · requires=none

```
Task: Structure the text below as an Architecture Decision Record (ADR).
- Use sections: Title, Status, Context, Decision, and Consequences.
- Derive every section strictly from the text; omit any expected section the text does not cover, silently and without a placeholder. Preserve the original language.

<<<UserText Start>>>
{{user_text}}
<<<UserText End>>>

Format: {{user_format}}
```

### structure.doc.rfc — "RFC"
Metadata: family=structure · subGroup=doc · orderRank=60 · mergeable=false · exclusive=true · terminal=false · requires=none

```
Task: Structure the text below as an RFC (Request for Comments).
- Use sections where supported: summary, motivation, proposal/design, alternatives considered, drawbacks, and open questions.
- Derive all content from the text; introduce no new proposals. Omit any expected section the text does not cover, silently and without a placeholder. Preserve the original language.

<<<UserText Start>>>
{{user_text}}
<<<UserText End>>>

Format: {{user_format}}
```

### structure.doc.apidocs — "API docs"
Metadata: family=structure · subGroup=doc · orderRank=60 · mergeable=false · exclusive=true · terminal=false · requires=none

```
Task: Structure the text below as API reference documentation.
- Use sections where supported: endpoint/method, description, parameters, request, response, and errors.
- Derive every detail from the text; invent no parameters, fields, or status codes. Omit any expected section the text does not cover, silently and without a placeholder. Preserve the original language.

<<<UserText Start>>>
{{user_text}}
<<<UserText End>>>

Format: {{user_format}}
```

### structure.doc.tutorial — "Tutorial / How-to"
Metadata: family=structure · subGroup=doc · orderRank=60 · mergeable=false · exclusive=true · terminal=false · requires=none

```
Task: Structure the text below as a tutorial / how-to guide.
- Use sections where supported: goal, prerequisites, numbered steps, and result/next steps.
- Present steps in clear sequence using only the text's content. Preserve technical detail and the original language.

<<<UserText Start>>>
{{user_text}}
<<<UserText End>>>

Format: {{user_format}}
```

### structure.doc.userguide — "User guide"
Metadata: family=structure · subGroup=doc · orderRank=60 · mergeable=false · exclusive=true · terminal=false · requires=none

```
Task: Structure the text below as a user guide.
- Use sections where supported: overview, getting started, features/usage, and troubleshooting.
- Derive all content from the text; add no new features or tips. Preserve the original language.

<<<UserText Start>>>
{{user_text}}
<<<UserText End>>>

Format: {{user_format}}
```

### structure.doc.newsletter — "Newsletter (format)"
Metadata: family=structure · subGroup=doc · orderRank=60 · mergeable=false · exclusive=true · terminal=false · requires=none

```
Task: Format the text below as a newsletter.
- Use a subject/headline, a short intro, themed sections with subheadings, and a closing, where supported.
- Derive all content from the text; add no new items. Preserve meaning and the original language.

<<<UserText Start>>>
{{user_text}}
<<<UserText End>>>

Format: {{user_format}}
```

### structure.doc.linkedin — "LinkedIn post (format)"
Metadata: family=structure · subGroup=doc · orderRank=60 · mergeable=false · exclusive=true · terminal=false · requires=none

```
Task: Format the text below as a LinkedIn post.
- Open with a strong hook line, use short single-line paragraphs and white space for readability, and keep a professional tone.
- Preserve the message and the original language. Add hashtags or a CTA only if already present in the text.

<<<UserText Start>>>
{{user_text}}
<<<UserText End>>>

Format: {{user_format}}
```

### structure.doc.xpost — "X post (format)"
Metadata: family=structure · subGroup=doc · orderRank=60 · mergeable=false · exclusive=true · terminal=false · requires=none

```
Task: Format the text below as an X (Twitter) post.
- Keep it concise within roughly 280 characters; if the content cannot fit, format it as a numbered thread.
- Preserve the core message and the original language. Add no hashtags or emojis unless already present.

<<<UserText Start>>>
{{user_text}}
<<<UserText End>>>

Format: {{user_format}}
```

### structure.doc.instagram — "Instagram caption (format)"
Metadata: family=structure · subGroup=doc · orderRank=60 · mergeable=false · exclusive=true · terminal=false · requires=none

```
Task: Format the text below as an Instagram caption.
- Lead with an engaging first line, use short lines and spacing, and keep the original message.
- Preserve the original language. Add hashtags or emojis only if already present in the text.

<<<UserText Start>>>
{{user_text}}
<<<UserText End>>>

Format: {{user_format}}
```
