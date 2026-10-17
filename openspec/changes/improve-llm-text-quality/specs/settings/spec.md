# Spec Delta

## Purpose

Stores the user's inference, model, language and application preferences. These settings decide
which optional parameters GoText sends with each LLM request.

## ADDED Requirements

### Requirement: Reasoning mode setting
The model settings SHALL include a reasoning mode with values `default`, `off` and `low`. It defaults to `default`, is saved across restarts, and is changed in Settings → Model.

#### Scenario: Default after upgrade
- **WHEN** an existing installation starts after this change
- **THEN** the reasoning mode is `default`

#### Scenario: Saved value
- **WHEN** the user selects `off` and restarts the app
- **THEN** the reasoning mode is `off`

### Requirement: Reasoning mode default sends nothing
WHILE the reasoning mode is `default`, the system SHALL send no `think` or `reasoning_effort` field with any request.

#### Scenario: Ollama default
- **WHEN** the reasoning mode is `default` and a chain step runs on an Ollama provider
- **THEN** the request body has no `think` field

### Requirement: Reasoning mode off disables local thinking
WHILE the reasoning mode is `off`, the system SHALL send `think: false` to Ollama providers. It SHALL send no reasoning field to other providers.

#### Scenario: Ollama off
- **WHEN** the reasoning mode is `off` and a chain step runs on an Ollama provider
- **THEN** the request body contains `"think": false`

#### Scenario: OpenAI-compatible off
- **WHEN** the reasoning mode is `off` and a chain step runs on an LM Studio provider
- **THEN** the request body has no `think` or `reasoning_effort` field

### Requirement: Reasoning mode low requests low effort
WHILE the reasoning mode is `low`, the system SHALL send `think: "low"` to Ollama providers and `reasoning_effort: "low"` to every other provider.

#### Scenario: Ollama low
- **WHEN** the reasoning mode is `low` and the provider is Ollama
- **THEN** the request body contains `"think": "low"`

#### Scenario: OpenAI-compatible low
- **WHEN** the reasoning mode is `low` and the provider kind is `openai`
- **THEN** the request body contains `"reasoning_effort": "low"`

### Requirement: Faithfulness-oriented default temperature
On a new installation and after "Reset to defaults", the model temperature SHALL be 0.2 with temperature enabled. The system SHALL NOT change a temperature already saved by an existing installation.

#### Scenario: New installation
- **WHEN** the app starts with an empty database
- **THEN** Settings → Model shows temperature 0.2

#### Scenario: Existing value kept
- **WHEN** an existing installation has temperature 0.9 saved
- **THEN** after the upgrade the temperature is still 0.9
