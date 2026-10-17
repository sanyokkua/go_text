# Spec Delta

## Purpose

Owns GoText's local data and diagnostics: database, logs and the opt-in per-step task log. The
task log lets the owner see what was sent, which model answered, and whether the output kept the
input's content.

## ADDED Requirements

### Requirement: Task log records the served model and finish reason
WHILE task logging is enabled, each step entry SHALL record the model name the provider reported as having answered (`servedModel`) and the provider's finish reason (`finishReason`), each empty when the provider did not report it. It SHALL keep recording the configured model in `model`.

#### Scenario: Served model differs from the picked model
- **WHEN** the picked model is `gpt-5` and the provider response has `"model":"claude-haiku-4-5"` and `"finish_reason":"stop"`
- **THEN** the entry has `model` = `gpt-5`, `servedModel` = `claude-haiku-4-5`, `finishReason` = `stop`

#### Scenario: Provider omits the model
- **WHEN** the provider response has no `model` field
- **THEN** the entry has `servedModel` = ""

### Requirement: Task log records token usage
WHILE task logging is enabled, each step entry SHALL record the prompt and completion token counts from the provider response, or 0 when the provider did not report them.

#### Scenario: Usage present
- **WHEN** the response usage is 412 prompt and 57 completion tokens
- **THEN** the entry has `promptTokens` = 412 and `completionTokens` = 57

### Requirement: Task log records the request endpoint without secrets
WHILE task logging is enabled, each step entry SHALL record the completion request's host as `requestHost` and its path as `requestPath`. It SHALL never record the query string, credentials or headers.

#### Scenario: Azure URL with API version
- **WHEN** the request URL is `https://proxy.example/openai/deployments/gpt-5/chat/completions?api-version=2024-10-21`
- **THEN** `requestHost` = `proxy.example` and `requestPath` = `/openai/deployments/gpt-5/chat/completions`

### Requirement: Task log records a prompt version
WHILE task logging is enabled, each step entry SHALL record `promptVersion`: the first 12 lowercase hex characters of a SHA-256 over the step's system prompt and its directive texts. The input text SHALL NOT be part of this hash.

#### Scenario: Same prompt, different input
- **WHEN** two runs use `rewrite.proofread.basic` with different input texts and unchanged prompts
- **THEN** both entries have the same 12-character `promptVersion`

#### Scenario: Prompt edited
- **WHEN** the proofread directive text changes between two builds
- **THEN** the `promptVersion` values differ

### Requirement: Task log records output guard flags
WHILE task logging is enabled, each step entry SHALL record `guardFlags`: the guard names that fired when comparing the step's output with its input. The names are `greeting_dropped`, `signoff_dropped`, `fewer_sentences`, `fewer_lines`, `politeness_lost`, `hedge_lost`, `protected_token_lost` and `tell_introduced`. Guard flags SHALL NOT fail or change the run.

#### Scenario: Greeting and please dropped
- **WHEN** the input is "Hello. Please check the ticket <TICKET-1>." and the output is "Check the ticket <TICKET-1>."
- **THEN** `guardFlags` contains `greeting_dropped`, `politeness_lost` and `fewer_sentences`, and the run result is the output text

#### Scenario: Em dash introduced
- **WHEN** the input is "Nothing is missing - all good." and the output is "Nothing is missing—all good."
- **THEN** `guardFlags` contains `tell_introduced`

#### Scenario: Faithful correction
- **WHEN** the input is "Hi Lena, I am seeing warning that it needs reviewer." and the output is "Hi Lena, I am seeing a warning that it needs a reviewer."
- **THEN** `guardFlags` is empty

#### Scenario: Logging disabled
- **WHEN** task logging is disabled
- **THEN** no task-log file is written and the run result is unchanged
