# Spec Delta

## Purpose

Provides the application frame: app bar, notifications, theme, menus and window. Error
notifications must tell the user what went wrong and what to change, in the provider's own words
where available.

## ADDED Requirements

### Requirement: Error notifications show the backend message
WHEN an operation fails with a typed error of any code, the error notification SHALL show the error's title and message as the backend sent them. Only when the backend title or message is empty SHALL the notification use the app's own text for that error code.

#### Scenario: Rejected request toast
- **WHEN** the inference test fails with code `invalid_request`, title "Request rejected", message "Provider B rejected the request (400): Unsupported value: 'temperature'"
- **THEN** the toast title is "Request rejected" and its body contains "Unsupported value: 'temperature'"

#### Scenario: Failed chain step toast
- **WHEN** a chain run fails with code `step_failed`, title "Step 1 failed", message "Step 1 (rewrite) failed: Provider B rejected the request (400): Unsupported value: 'temperature'. Earlier steps completed."
- **THEN** the toast title is "Step 1 failed" and its body contains "Unsupported value: 'temperature'"

#### Scenario: Empty backend text
- **WHEN** an error with code `busy` arrives with an empty title and message
- **THEN** the toast shows the app's own text for `busy`

### Requirement: Error notifications show the settings hint
WHEN an error carries a `hint` in its details, the notification SHALL show the hint as a separate line below the message.

#### Scenario: Temperature hint
- **WHEN** the error details include hint "Turn off Temperature in Settings → Model."
- **THEN** the toast shows that sentence on its own line

#### Scenario: No hint
- **WHEN** the error has no hint
- **THEN** the toast shows no hint line

### Requirement: Error notifications offer the provider excerpt
WHEN an error carries a sanitized provider excerpt (`providerMessage` in its details), the notification SHALL offer a collapsed "Provider said" section that reveals the excerpt when expanded.

#### Scenario: Expand excerpt
- **WHEN** the user expands "Provider said" on a failed-step toast whose details carry `providerMessage`
- **THEN** the sanitized provider excerpt (at most 300 characters) is shown

### Requirement: Verification panel shows diagnosis results
WHEN the Settings inference test finishes, the verification panel SHALL show the test's hint and every warning under the inference check. On failure, it SHALL show the full error message and hint, not only a status line.

#### Scenario: Rejected temperature diagnosis
- **WHEN** the inference test reports rejected parameter `temperature`
- **THEN** the inference check shows ok and the line "The model works, but it rejects temperature. Turn off Temperature in Settings → Model."

#### Scenario: Pinned path warning
- **WHEN** the test reports the pinned-path warning
- **THEN** the panel shows the warning text next to the inference check
