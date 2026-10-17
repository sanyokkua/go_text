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
WHEN a provider answers with HTTP 500–599, the system SHALL report error code `upstream` with message "<provider> had a server error (<status>). Please retry.", marked retryable. A 4xx status other than 401, 403, 404, 429, 400 and 422 SHALL be reported as `invalid_request`.

#### Scenario: Server error
- **WHEN** a provider answers HTTP 503
- **THEN** the error code is `upstream` and retryable is true

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
WHEN a rejected-request body names an unsupported parameter (`param` field, or text such as "temperature … not supported", "Only the default (1) value is supported", "max_tokens is not supported … use max_completion_tokens", "Unrecognized request argument"), the system SHALL include the parameter in the error details and add a hint naming the model setting to change.

#### Scenario: Temperature hint
- **WHEN** a 400 body has `"param":"temperature"`
- **THEN** the error details include `param` = `temperature` and hint = "Turn off Temperature in Settings → Model."

#### Scenario: Legacy max tokens hint
- **WHEN** a 400 body says "Unsupported parameter: 'max_tokens' is not supported with this model. Use 'max_completion_tokens' instead."
- **THEN** the hint is "Turn off the legacy max_tokens field in Settings → Model."

#### Scenario: Unknown parameter has no hint
- **WHEN** a 400 body says "Invalid messages array"
- **THEN** the error details contain no hint

### Requirement: Inference test sends a bare request first
WHEN the user runs the Settings inference test, the system SHALL first send a request with only the model, one short user message and `stream: false`. It SHALL send no temperature, token limit, context window, reasoning field or `n`.

#### Scenario: Bare request body
- **WHEN** the saved model settings have temperature 0.9 on, max output tokens 32000 on and context window 128000 on, and the test runs against an OpenAI-compatible provider
- **THEN** the first request body contains `model`, `messages` with one user message, and `stream: false`, and contains no `temperature`, `max_tokens`, `max_completion_tokens`, `n` or `reasoning_effort`

#### Scenario: Bare request fails
- **WHEN** the bare request fails with HTTP 404
- **THEN** the test reports error `model_not_found` and sends no further requests

### Requirement: Inference test diagnoses a rejected model setting
WHEN the bare request succeeds and at least one optional model setting is on, the system SHALL send a second request with the saved settings. If that fails with a 4xx, the system SHALL retry once per enabled setting with that setting removed, in the order temperature, token limit, context window, reasoning mode (at most 4 extra requests). It SHALL report the first setting whose removal succeeds.

#### Scenario: Temperature is rejected
- **WHEN** the bare request succeeds, temperature 0.9 is on, and the provider rejects any request containing `temperature` with HTTP 400
- **THEN** the test outcome is ok with rejected parameter `temperature` and hint "The model works, but it rejects temperature. Turn off Temperature in Settings → Model."

#### Scenario: All settings accepted
- **WHEN** the bare request and the request with saved settings both succeed
- **THEN** the test outcome is ok with no rejected parameter and no hint

#### Scenario: No optional settings on
- **WHEN** every optional model setting is off
- **THEN** only the bare request is sent

#### Scenario: No single setting explains the failure
- **WHEN** the request with saved settings fails with HTTP 400 and each single-setting removal still fails
- **THEN** the test outcome is ok with hint "The model works with a bare request, but rejects your combined model settings." and no rejected parameter

### Requirement: Pinned completion path is flagged
WHEN a provider of kind `azure` or `openai` has a custom completion path that does not contain `{deployment}`, the connection and inference tests SHALL report the warning "The completion path does not contain {deployment}, so every request goes to the same deployment and the model picker has no effect." The test outcome SHALL stay ok.

#### Scenario: Pinned Azure path
- **WHEN** an azure provider's completion path is `openai/deployments/haiku-small/chat/completions`
- **THEN** the inference test outcome is ok and its warnings contain the pinned-path warning

#### Scenario: Placeholder path
- **WHEN** the completion path is `openai/deployments/{deployment}/chat/completions`
- **THEN** the outcome has no pinned-path warning

#### Scenario: Local provider
- **WHEN** an ollama provider has any path
- **THEN** no pinned-path warning is reported

### Requirement: Azure completion requests carry the API version
WHERE a provider has an API version set, the system SHALL append `api-version=<version>` to completion request URLs, as it already does for model listing.

#### Scenario: API version on completion
- **WHEN** an azure provider has API version `2024-10-21` and sends a completion
- **THEN** the request URL ends with `/chat/completions?api-version=2024-10-21`

#### Scenario: No API version
- **WHEN** the API version is empty
- **THEN** the completion URL has no query string

### Requirement: Completion requests omit the choice count
The system SHALL NOT send the `n` field in completion requests.

#### Scenario: Chain request body
- **WHEN** a chain step sends a completion to an OpenAI-compatible provider
- **THEN** the request body has no `n` field
