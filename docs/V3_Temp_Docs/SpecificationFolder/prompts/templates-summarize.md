# User-Prompt Templates — SUMMARIZE Family (GoText v3)

Family: `summarize` · System prompt: `system-summarize.md`
Version (all actions): `v3.0.0`
Class: solo, terminal-class (orderRank 80). All actions: mergeable=false ·
terminal=true · requires=none. Each preserves the original language and ends with
the `<<<UserText Start>>> … <<<UserText End>>>` delimiters and a
`Format: {{user_format}}` footer.

---

### summarize.summary — "Summary"
Metadata: family=summarize · orderRank=80 · mergeable=false · terminal=true · requires=none

```
Task: Write a concise summary of the text below.
- Capture the essential ideas faithfully in a short narrative, in your own concise wording.
- Add no facts, opinions, or outside context. Preserve emphasis and the original language.

<<<UserText Start>>>
{{user_text}}
<<<UserText End>>>

Format: {{user_format}}
```

### summarize.keypoints — "Key points"
Metadata: family=summarize · orderRank=80 · mergeable=false · terminal=true · requires=none

```
Task: Extract the key points from the text below.
- List the main ideas as concise, standalone bullet points, each supported by the text.
- Add no interpretation or outside information. Preserve emphasis and the original language.

<<<UserText Start>>>
{{user_text}}
<<<UserText End>>>

Format: {{user_format}}
```

### summarize.tldr — "TL;DR"
Metadata: family=summarize · orderRank=80 · mergeable=false · terminal=true · requires=none

```
Task: Write a TL;DR of the text below.
- Give the bottom line in one to three sentences capturing the single most important takeaway.
- Add nothing beyond the source. Preserve the original language.

<<<UserText Start>>>
{{user_text}}
<<<UserText End>>>

Format: {{user_format}}
```

### summarize.executive — "Executive summary"
Metadata: family=summarize · orderRank=80 · mergeable=false · terminal=true · requires=none

```
Task: Write an executive summary of the text below.
- Lead with the bottom line, then the key findings, implications, and any decisions or recommendations the text already contains, written for a decision-maker.
- Use only information present in the text; add no new analysis. Preserve the original language.

<<<UserText Start>>>
{{user_text}}
<<<UserText End>>>

Format: {{user_format}}
```

### summarize.eli5 — "Simple explanation (ELI5)"
Metadata: family=summarize · orderRank=80 · mergeable=false · terminal=true · requires=none

```
Task: Re-express the text below in simple, plain language (explain it simply).
- Replace jargon and complex structure with everyday wording while keeping the meaning intact.
- Add no new examples, opinions, or outside context. Preserve the original language.

<<<UserText Start>>>
{{user_text}}
<<<UserText End>>>

Format: {{user_format}}
```

### summarize.hashtags — "Hashtag summary"
Metadata: family=summarize · orderRank=80 · mergeable=false · terminal=true · requires=none

```
Task: Generate thematic hashtags for the text below.
- Produce concise hashtags, each reflecting a distinct core theme present in the text.
- Add no concepts not in the text; output hashtags only, no sentences. Keep the original language.

<<<UserText Start>>>
{{user_text}}
<<<UserText End>>>

Format: {{user_format}}
```
