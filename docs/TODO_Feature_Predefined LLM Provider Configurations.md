# Feature: Predefined LLM Provider Configurations

## Core Requirements

- **Add 3 predefined local provider templates**: Ollama, LM Studio, Llama.cpp Server
- **Preserve existing OpenAI configuration** as a separate "Custom" option
- **Enable one-click switching** between provider types without losing configuration data

## UI Implementation

### Provider Selection Control

- Add a **"Provider Type" dropdown** at the top of the configuration section with options:
    - `Custom OpenAI` (default, maintains current behavior)
    - `Ollama` (preconfigured)
    - `LM Studio` (preconfigured)
    - `Llama.cpp Server` (preconfigured)

### Predefined Configuration Behavior

| Provider      | Base URL                 | Models Endpoint | Chat Endpoint          |  
|---------------|--------------------------|-----------------|------------------------|  
| **Ollama**    | `http://localhost:11434` | `/v1/models`    | `/v1/chat/completions` |  
| **LM Studio** | `http://localhost:1234`  | `/v1/models`    | `/v1/chat/completions` |  
| **Llama.cpp** | `http://localhost:8080`  | `/v1/models`    | `/v1/chat/completions` |  

- **When selecting a predefined provider**:
    1. Auto-populates all endpoint fields with provider-specific values
    2. **Disables** endpoint fields (read-only) but shows them for reference
    3. Retains user's custom request headers
    4. Adds **"Verify Availability" button** next to Base URL field

### Critical Workflow Rules

1. **No configuration overwrite**:
    - Custom OpenAI settings are stored separately and preserved when switching providers
    - Switching back to "Custom OpenAI" restores previous values

2. **Availability Check**:
    - "Verify Availability" button triggers:
      ```ts
      GET {BaseURL}/v1/models (Ollama/LM Studio/Llama.cpp)
      ```  
    - Shows success/failure toast with HTTP status

3. **Model Selection**:
    - "Test Models Endpoint Request" button remains functional
    - Model dropdown (not shown in screenshot) continues to work as before

## Validation Criteria

✅ **Must pass**:

- Predefined configs **never** modify existing Custom OpenAI settings
- All endpoint fields auto-populate correctly for selected provider
- "Verify Availability" shows clear success/failure status
- Custom headers remain editable regardless of provider type

❌ **Must prevent**:

- Accidental overwriting of Custom OpenAI configuration
- Editable endpoint fields when using predefined providers
- Loss of custom headers when switching provider types

## Critical Implementation Notes

- **Storage**: Maintain two separate configuration states in frontend (example):
  ```ts
  interface ProviderConfig {
    type: 'custom' | 'ollama' | 'lm-studio' | 'llama-cpp';
    custom?: { baseUrl: string, ... };
    // Predefined configs use fixed values
  }
  ```  
- **UI Hierarchy**:
  ```mermaid
  graph TD
    A[Provider Type Dropdown] -->|Custom| B[Editable OpenAI Fields]
    A -->|Predefined| C[Read-Only Fields + Verify Button]
  ```  
- **Error Handling**:
    - Availability check errors use the unified error popup system (from previous feature)
    - Failed verification blocks "Save and Close" until resolved

*Note: Predefined configs assume standard local ports. No backend changes required.*