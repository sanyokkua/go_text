# Spec Delta

## Purpose

Runs a single action or a multi-step chain against the selected LLM. Each step is planned,
composed, executed and reported, and failures that retrying cannot fix are not retried.

## ADDED Requirements

### Requirement: Rejected requests are not retried
WHEN a chain step fails with error code `invalid_request`, the system SHALL fail the step after that single attempt, without retries or backoff, regardless of the configured retry count.

#### Scenario: Deterministic 400
- **WHEN** max retries is 3 and the provider answers every request with HTTP 400 "Unsupported parameter: 'temperature'"
- **THEN** exactly one request is sent and the run fails with error code `invalid_request`

#### Scenario: Server errors still retry
- **WHEN** max retries is 3 and the provider answers HTTP 503 every time
- **THEN** 4 requests are sent and the run fails with error code `upstream`

### Requirement: Edge-case markers are not returned as results
WHEN a step's output, after trimming, is exactly `[NO_TEXT_PROVIDED]` or `[PROCESSING_ERROR]`, the system SHALL fail the step with error code `empty_completion` instead of returning the marker as text.

#### Scenario: Marker output
- **WHEN** the input is "Hello, can you check this?" and the model answers `[NO_TEXT_PROVIDED]`
- **THEN** the run fails with error code `empty_completion` and the output pane does not receive the marker

#### Scenario: Marker inside text
- **WHEN** the model answers "The tag [PROCESSING_ERROR] appears in the log."
- **THEN** the output is returned unchanged

### Requirement: Truncated answers are flagged
WHEN a provider reports finish reason `length` for a step, the system SHALL return the step output and record a truncation warning in the application log and the task log.

#### Scenario: Output cut by token limit
- **WHEN** max output tokens is 50 and the provider returns finish reason `length`
- **THEN** the run succeeds with the returned text, and the task-log entry for the step has finish reason `length`

### Requirement: Chains may use up to four inferences
The system SHALL accept a chain that needs at most 4 LLM inferences and at most 5 steps. It SHALL reject a chain needing 5 or more inferences with error code `invalid_plan`.

#### Scenario: Proofread plus three other groups
- **WHEN** the chain is `rewrite.proofread.basic`, `rewrite.tone.professional`, `structure.doc.email`, `summarize.executive`
- **THEN** the plan has 4 inferences and the run is accepted

#### Scenario: Too many inferences
- **WHEN** a chain needs 5 inferences
- **THEN** the run is rejected with error code `invalid_plan`
