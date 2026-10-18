# Spec Delta

## Purpose

Connects GoText to OpenAI-compatible and local LLM providers. Requests are shaped so the selected
model receives them. Provider failures are reported honestly, and the user can see why a provider
or model does not work.

## ADDED Requirements

### Requirement: Request errors are reported as rejected requests
WHEN a provider answers an inference request with HTTP 400 or 422 and the body does not describe a context-window overflow, the system SHALL report error code `invalid_request` with title "Request rejected" and message "<provider> rejected the request (<status>): <provider message>", marked not retryable.

#### Scenario: Unsupported temperature
- **WHEN** provider "Provider B" answers HTTP 400 with body `{"error":{"message":"Unsupported value: 'temperature' does not support 0.9 with this model.","param":"temperature","code":"unsupported_value"}}`
- **THEN** the error code is `invalid_request`, retryable is false, and the message is "Provider B rejected the request (400): Unsupported value: 'temperature' does not support 0.9 with this model."

#### Scenario: Unprocessable entity
- **WHEN** a provider answers HTTP 422 with body `{"error":"invalid model options"}`
- **THEN** the error code is `invalid_request` and the message ends with "(422): invalid model options"

#### Scenario: Context overflow keeps its own code
- **WHEN** a provider answers HTTP 400 with a body containing `context_length_exceeded`
- **THEN** the error code is `context_window`, not `invalid_request`

### Requirement: Only server failures are reported as retryable provider errors
WHEN a provider answers with HTTP 500–599, the system SHALL report error code `upstream` with message "<provider> had a server error (<status>). Please retry.", marked retryable, and SHALL include the sanitized provider excerpt in the error details when the body has text. HTTP 408 SHALL be reported as `timeout`. Any other 4xx status not otherwise mapped (401, 403, 404, 429, 400, 422) SHALL be reported as `invalid_request`.

#### Scenario: Server error
- **WHEN** a provider answers HTTP 503 with body `{"error":{"message":"upstream overloaded"}}`
- **THEN** the error code is `upstream`, retryable is true, and the provider excerpt is "upstream overloaded"

#### Scenario: Request timeout status
- **WHEN** a provider answers HTTP 408
- **THEN** the error code is `timeout`

#### Scenario: Other client error
- **WHEN** a provider answers HTTP 405
- **THEN** the error code is `invalid_request` and retryable is false

### Requirement: Provider error text is extracted from common body shapes
The system SHALL extract the provider's own error text from OpenAI/Azure `{"error":{"message":...}}`, Anthropic `{"error":{"type":...,"message":...}}` and Ollama `{"error":"..."}` bodies. Other bodies SHALL be used as plain text. An empty body SHALL give the text "no details".

#### Scenario: Anthropic-style body
- **WHEN** the body is `{"type":"error","error":{"type":"invalid_request_error","message":"max_tokens: 64000 > 32000"}}`
- **THEN** the provider message is "max_tokens: 64000 > 32000"

#### Scenario: Plain-text body
- **WHEN** the body is `Bad Request: unknown field n`
- **THEN** the provider message is "Bad Request: unknown field n"

#### Scenario: Empty body
- **WHEN** a provider answers HTTP 400 with an empty body
- **THEN** the message ends with "(400): no details"

### Requirement: Provider error text is sanitized and capped
Before provider error text reaches the user, the error details or the log, the system SHALL replace bearer tokens, `sk-`-style keys, `api-key`/`key`/`token` query or JSON values and URL query strings with `[redacted]`. The text SHALL be cut to at most 300 characters, ending with "…" when cut.

#### Scenario: Echoed key is removed
- **WHEN** the body message is `invalid header Authorization: Bearer sk-abc123def456 for https://h/x?api-key=zzz`
- **THEN** the provider message contains neither `sk-abc123def456` nor `zzz`, and contains `[redacted]`

#### Scenario: Long body is capped
- **WHEN** the body message is 2,000 characters long
- **THEN** the provider message is at most 300 characters and ends with "…"

### Requirement: Rejected parameters produce a settings hint
WHEN a rejected-request body names an unsupported parameter, through its `param` field or its text ("Unrecognized request argument supplied: <name>" names `<name>`), the system SHALL add that parameter as `param` and a hint naming the Settings → Model control to change, as the scenarios define. The first matching rule in scenario order wins. A body that matches none SHALL get no `param` and no hint.

#### Scenario: Temperature hint
- **WHEN** a 400 body has `"param":"temperature"`
- **THEN** the error details include `param` = `temperature` and hint = "Turn off Temperature in Settings → Model."

#### Scenario: Default-only temperature text
- **WHEN** a 400 body says "Unsupported value: 'temperature' does not support 0.2 with this model. Only the default (1) value is supported." with no `param` field
- **THEN** the error details include `param` = `temperature`

#### Scenario: Legacy max tokens hint
- **WHEN** a 400 body says "Unsupported parameter: 'max_tokens' is not supported with this model. Use 'max_completion_tokens' instead."
- **THEN** the hint is "Set Token-limit parameter to max_completion_tokens in Settings → Model."

#### Scenario: Completion tokens field rejected
- **WHEN** a 400 body says "Unrecognized request argument supplied: max_completion_tokens"
- **THEN** the error details include `param` = `max_completion_tokens` and the hint is "Set Token-limit parameter to max_tokens (legacy) in Settings → Model."

#### Scenario: Output token limit too large
- **WHEN** a 400 body says "max_tokens: 64000 > 32000"
- **THEN** the error details include `param` = `max_output_tokens` and the hint is "Lower or turn off Max output tokens in Settings → Model."

#### Scenario: Context window rejected
- **WHEN** a 400 body has `"param":"num_ctx"`
- **THEN** the error details include `param` = `context_window` and the hint is "Lower or turn off Context window in Settings → Model."

#### Scenario: Ollama model without thinking
- **WHEN** an Ollama provider answers HTTP 400 with body `{"error":"\"qwen2.5:1.5b\" does not support thinking"}`
- **THEN** the error code is `invalid_request`, `param` = `reasoning`, and the hint is "Set Reasoning to Provider default in Settings → Model."

#### Scenario: Unknown parameter has no hint
- **WHEN** a 400 body says "Invalid messages array"
- **THEN** the error details contain no `param` and no hint

### Requirement: Inference test sends a bare request first
WHEN the user runs the Settings inference test, the system SHALL first send a request with only the model, one short user message and `stream: false`. It SHALL send no temperature, token limit, context window, reasoning field or `n`.

#### Scenario: Bare request body
- **WHEN** the saved model settings have temperature 0.9 on, max output tokens 32000 on and context window 128000 on, and the test runs against an OpenAI-compatible provider
- **THEN** the first request body contains `model`, `messages` with one user message, and `stream: false`, and contains no `temperature`, `max_tokens`, `max_completion_tokens`, `n` or `reasoning_effort`

#### Scenario: Bare request fails
- **WHEN** the bare request fails with HTTP 404
- **THEN** the test reports error `model_not_found` and sends no further requests

### Requirement: Inference test diagnoses a rejected model setting
WHEN the bare request succeeds and at least one optional model setting is on, the system SHALL send a second request with the saved settings. IF that fails with `invalid_request`, THEN the system SHALL retry once per enabled setting with only that setting removed (temperature, token limit, context window, then reasoning mode) and report the first setting whose removal succeeds. Any other error SHALL fail the test with that error.

#### Scenario: Temperature is rejected
- **WHEN** the bare request succeeds, temperature 0.9 is on, and the provider rejects any request containing `temperature` with HTTP 400
- **THEN** the test outcome is ok with rejected parameter `temperature` and hint "The model works, but it rejects temperature. Turn off Temperature in Settings → Model."

#### Scenario: All settings accepted
- **WHEN** the bare request and the request with saved settings both succeed
- **THEN** the test outcome is ok with no rejected parameter and no hint

#### Scenario: No optional settings on
- **WHEN** temperature, max output tokens and context window are off and the reasoning mode is `default`
- **THEN** only the bare request is sent

#### Scenario: Reasoning mode is rejected
- **WHEN** the bare request succeeds, the reasoning mode is `low`, and the Ollama model answers requests containing `think` with HTTP 400 "does not support thinking"
- **THEN** the test outcome is ok with rejected parameter `reasoning` and hint "The model works, but it rejects the reasoning mode. Set Reasoning to Provider default in Settings → Model."

#### Scenario: Second request fails for another reason
- **WHEN** the bare request succeeds and the request with saved settings fails with HTTP 429
- **THEN** the test fails with error code `rate_limited` and no removal requests are sent

#### Scenario: No single setting explains the failure
- **WHEN** the request with saved settings fails with HTTP 400 and each single-setting removal still fails
- **THEN** the test outcome is ok with hint "The model works with a bare request, but rejects your combined model settings." and no rejected parameter

### Requirement: Inference test diagnosis message
WHEN the inference test finds a rejected setting, the outcome SHALL be ok and carry the rejected parameter and the hint "The model works, but it rejects <setting>. <settings hint>". `<setting>` is `temperature`, `the token limit`, `the context window` or `the reasoning mode`. `<settings hint>` is the rejection's own hint when present, otherwise the parameter's hint from "Rejected parameters produce a settings hint".

#### Scenario: Rejected parameter names
- **WHEN** the removed setting is temperature, the context window or the reasoning mode
- **THEN** the rejected parameter is `temperature`, `context_window` or `reasoning` respectively

#### Scenario: Token limit parameter name
- **WHEN** the removed setting is the token limit and the rejection's `param` is `max_tokens`
- **THEN** the rejected parameter is `max_tokens`; with no token `param` in the rejection it is `max_output_tokens`

#### Scenario: Token limit message
- **WHEN** the diagnosis finds that removing the token limit makes the request succeed after a "max_tokens: 64000 > 32000" rejection
- **THEN** the hint is "The model works, but it rejects the token limit. Lower or turn off Max output tokens in Settings → Model."

### Requirement: Pinned completion path is flagged
WHEN a provider of kind `azure` or `openai` has a completion path that contains `deployments/` but not `{deployment}`, the connection and inference tests SHALL report the warning "The completion path does not contain {deployment}, so every request goes to the same deployment and the model picker has no effect." The test outcome SHALL stay ok.

#### Scenario: Pinned Azure path
- **WHEN** an azure provider's completion path is `openai/deployments/haiku-small/chat/completions`
- **THEN** the inference test outcome is ok and its warnings contain the pinned-path warning

#### Scenario: Placeholder path
- **WHEN** the completion path is `openai/deployments/{deployment}/chat/completions`
- **THEN** the outcome has no pinned-path warning

#### Scenario: Standard OpenAI path
- **WHEN** an openai provider's completion path is `v1/chat/completions`
- **THEN** no pinned-path warning is reported

#### Scenario: Local provider
- **WHEN** an ollama provider has any path
- **THEN** no pinned-path warning is reported

### Requirement: Azure completion requests carry the API version
WHERE a provider has an API version set and its completion path does not already contain `api-version=`, the system SHALL add `api-version=<version>` to the completion request URL as a query parameter, as it already does for model listing.

#### Scenario: API version on completion
- **WHEN** an azure provider has API version `2024-10-21` and sends a completion
- **THEN** the request URL ends with `/chat/completions?api-version=2024-10-21`

#### Scenario: Path already carries the API version
- **WHEN** the completion path is `openai/deployments/{deployment}/chat/completions?api-version=2024-06-01` and the API version is `2024-10-21`
- **THEN** the request URL contains `api-version=2024-06-01` exactly once and no second `api-version`

#### Scenario: No API version
- **WHEN** the API version is empty
- **THEN** the completion URL has no query string

### Requirement: Completion requests omit the choice count
The system SHALL NOT send the `n` field in completion requests.

#### Scenario: Chain request body
- **WHEN** a chain step sends a completion to an OpenAI-compatible provider
- **THEN** the request body has no `n` field
