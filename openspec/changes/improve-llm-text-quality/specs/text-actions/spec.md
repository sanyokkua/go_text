# Spec Delta

## Purpose

Defines the catalog of text actions and the prompts GoText sends for them. Outputs must apply the
requested transformation faithfully, keep the author's voice and add no machine-sounding
patterns, on both frontier and small local models.

## ADDED Requirements

### Requirement: Proofreading runs as its own inference
WHEN a chain contains a proofreading action (`rewrite.proofread.*`), the system SHALL run that action in its own inference with the proofreading system prompt. It SHALL NOT merge the action with other rewrite actions. The user prompt of that inference SHALL end with "Return only the corrected text, keeping every sentence."

#### Scenario: Proofread with humanize
- **WHEN** the chain is `rewrite.proofread.enhanced` then `rewrite.intent.humanize`
- **THEN** the plan has 2 inferences; the first uses the proofreading system prompt, contains only the proofread directive, and its user prompt ends with "Return only the corrected text, keeping every sentence."

#### Scenario: Tone and style still merge
- **WHEN** the chain is `rewrite.tone.friendly` then `rewrite.style.conversational`
- **THEN** the plan has 1 inference

### Requirement: Proofreading prompt lists what to fix and what to keep
The proofreading system prompt SHALL tell the model to fix spelling, grammar, articles, verb tense, prepositions, word order and unidiomatic phrases. It SHALL also tell it to keep every sentence, sentence order, greetings, thanks, sign-offs, polite wording, hedges, who does what, the author's contractions or full forms, line breaks, lists, links, names, numbers, IDs and @mentions. It SHALL tell the model to return already-correct text unchanged and not to expand abbreviations.

#### Scenario: Prompt preview
- **WHEN** the user previews the prompt for `rewrite.proofread.basic`
- **THEN** the system prompt names the fix list and the keep list, including "greetings", "please", "maybe", "line breaks", and "If the text is already correct, return it unchanged."

### Requirement: Proofreading directives forbid restructuring
The `rewrite.proofread.basic` directive SHALL ask to change only what is wrong. The `rewrite.proofread.enhanced` directive SHALL allow smoothing awkward phrasing only within each sentence, and SHALL forbid merging, splitting or removing sentences. Neither directive SHALL ask to remove redundancy or resolve ambiguous references.

#### Scenario: Enhanced directive text
- **WHEN** the user views the `rewrite.proofread.enhanced` directive in the action catalog
- **THEN** it contains "Do not merge, split or remove sentences" and does not contain "redundancy" or "ambiguous references"

### Requirement: Every family carries the house style
Every system prompt in every family SHALL include a short house-style block. It asks for plain words in the register of the input or of the requested tone. It asks the model to add no long dashes, preface, closing offer, new linking words such as "However" or "Additionally", or rhetorical questions, and to keep the author's greetings, politeness and hedges. It SHALL name at most 5 "do not add" items.

#### Scenario: Summarize prompt
- **WHEN** the user previews the prompt for `summarize.summary`
- **THEN** the system prompt contains the house-style block

#### Scenario: Translate dashes follow the target language
- **WHEN** the user previews the prompt for `translate.text`
- **THEN** the house-style block says dashes follow the target language's punctuation instead of forbidding long dashes

### Requirement: Prompt texts contain no em dashes
The system SHALL NOT include the em dash character (U+2014) in any system prompt or action directive text, except inside quoted examples of the character itself.

#### Scenario: Catalog scan
- **WHEN** every action's preview prompt is generated
- **THEN** no system prompt or directive contains "—" outside a quoted example

#### Scenario: Tone directive phrasing
- **WHEN** the user views the `rewrite.tone.professional` directive
- **THEN** it contains "Adjust the tone to be professional: calm, competent and courteous" and no "—"

### Requirement: Humanize replaces machine wording only
The `rewrite.intent.humanize` action SHALL keep its ID. Its directive SHALL ask only to replace machine-sounding wording (long dashes, stock phrases, new transition words, trailing ", highlighting…" clauses) with plain words. It SHALL require keeping every sentence, its order and meaning, greetings, politeness, hedges and all facts. It SHALL NOT ask to vary sentence length, prefer active voice or remove filler.

#### Scenario: Saved stack still runs
- **WHEN** a saved stack contains `rewrite.intent.humanize`
- **THEN** the stack plans and runs without an `invalid_plan` error

#### Scenario: Directive text
- **WHEN** the user views the humanize directive
- **THEN** it does not contain "vary", "active voice" or "filler", and it contains "Keep every sentence"

### Requirement: Translate system prompt names the languages
WHEN a translate action runs, the system prompt SHALL contain the actual input and output language names, not `{{input_language}}` or `{{output_language}}` placeholders.

#### Scenario: English to Ukrainian
- **WHEN** `translate.text` runs with input language English and output language Ukrainian
- **THEN** the system prompt contains "Ukrainian" and "English" and contains no "{{"
