# User-Prompt Templates — TRANSLATE Family (GoText v3)

Family: `translate` · System prompt: `system-translate.md`
Version (all actions): `v3.0.0`
Class: solo, terminal (orderRank 90). All actions: mergeable=false · terminal=true.
Requires: `input_language`,`output_language` for translate / localize / dictionary;
`output_language` only for example-sentences (its template does not reference the
input language). Placeholders: `{{user_text}}`, `{{user_format}}`,
`{{input_language}}`, `{{output_language}}`.

Pass-through: if `{{input_language}}` == `{{output_language}}`, the system prompt's
PASS-THROUGH rule returns the input text unchanged (no-op).

Each template ends with the language-direction block, the `<<<UserText Start>>> …
<<<UserText End>>>` delimiters, and a `Format: {{user_format}}` footer.

---

### translate.text — "Translate text"
Metadata: family=translate · orderRank=90 · mergeable=false · terminal=true · requires=input_language,output_language

```
Task: Translate the text below from {{input_language}} into {{output_language}}.
- Produce a natural, fluent, idiomatic translation; preserve meaning, intent, tone, and facts exactly.
- Keep the original structure, formatting, and paragraph breaks. Add no notes or alternatives.
- If {{input_language}} and {{output_language}} are the same, return the text unchanged.

<<<UserText Start>>>
{{user_text}}
<<<UserText End>>>

Language direction: {{input_language}} -> {{output_language}}
Format: {{user_format}}
```

### translate.localize — "Localize"
Metadata: family=translate · orderRank=90 · mergeable=false · terminal=true · requires=input_language,output_language

```
Task: Localize the text below from {{input_language}} into {{output_language}}.
- Translate naturally and adapt locale-specific conventions for the {{output_language}} audience: dates, times, numbers, currency, units, names/forms of address, and idioms.
- Preserve the core meaning, intent, and all factual content; do not change the substance or invent locale facts.
- If {{input_language}} and {{output_language}} are the same, return the text unchanged.

<<<UserText Start>>>
{{user_text}}
<<<UserText End>>>

Language direction: {{input_language}} -> {{output_language}}
Format: {{user_format}}
```

### translate.dictionary — "Dictionary table (glossary)"
Metadata: family=translate · orderRank=90 · mergeable=false · terminal=true · requires=input_language,output_language

```
Task: Build a vocabulary glossary table from the text below.
- Extract the distinct, learning-worthy words (exclude punctuation and duplicates) and produce a word -> translation table from {{input_language}} into {{output_language}}.
- Keep each source word in its original form. Include only words present in the text. Add no definitions, notes, or commentary.
- If {{input_language}} and {{output_language}} are the same, return the text unchanged.

<<<UserText Start>>>
{{user_text}}
<<<UserText End>>>

Language direction: {{input_language}} -> {{output_language}}
Format: {{user_format}}
```

### translate.examples — "Example sentences"
Metadata: family=translate · orderRank=90 · mergeable=false · terminal=true · requires=output_language
(This action's template uses only `{{output_language}}` — the input language is not referenced — so its `requires` is `output_language` only, ensuring runtime Requires-validation does not reject valid runs.)

```
Task: Write example sentences for the words in the text below.
- Treat the words in the text as the complete, exclusive vocabulary set. Write one clear, grammatically correct example sentence per word in {{output_language}}.
- Use each word as given (adjusting only for grammar). Introduce no words not present in the text. Add no translations or explanations.

<<<UserText Start>>>
{{user_text}}
<<<UserText End>>>

Output language: {{output_language}}
Format: {{user_format}}
```
