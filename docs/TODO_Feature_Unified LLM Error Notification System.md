# Feature: Unified LLM Error Notification System

## Core Requirements

- **Implement a reusable error popup component** (React/TypeScript) for all LLM-related failures:
    - Triggered for *any* failed LLM request (model listing, inference, configuration tests)
    - Must appear *regardless of current view* (Settings, main interface, etc.)

## Popup Specifications

| Element       | Requirement                                                                                                       |
|---------------|-------------------------------------------------------------------------------------------------------------------|
| **Header**    | "LLM Request Failed" + HTTP status code (e.g., "503 Service Unavailable")                                         |
| **Body**      | - Standard HTTP status explanation (e.g., "Service Unavailable")<br>- Raw backend error message (from Go service) |
| **Dismissal** | Close button only (no action buttons)                                                                             |
| **Styling**   | Non-blocking overlay, centered, with error icon (red)                                                             |

## Critical Implementation Rules

1. **Backend Contract**:
    - Go service **must return** structured error responses:
      ```json
      { "status": 503, "message": "Provider unreachable" }
      ```  
    - *No* parsing of raw HTTP status text (use standard RFC descriptions)

2. **Frontend Handling**:
    - **Never** show technical stack traces to users
    - **Omit** the popup for:
        - Validation errors (handled by existing field validation)
        - Non-LLM related failures (e.g., network disconnect)
    - **Always** include both:
        - Machine-readable status code
        - Human-readable explanation (e.g., 429 = "Rate limit exceeded")

3. **Reusability**:
    - Single component exported as `LLMErrorPopup`
    - Accepts props: `{ statusCode: number, message: string }`
    - Must work with existing CSS framework (no new dependencies)

## Validation Criteria

✅ Popup appears for:

- Model listing failures (as shown in screenshot)
- Inference timeouts
- Provider downtime (e.g., Ollama/LM Studio not running)
- Rate limit errors (429)

❌ **Never** appears for:

- Form validation errors (e.g., empty BaseUrl field)
- Successful requests with empty results
- Non-LLM API failures (e.g., user auth)

## Critical Notes

- Backend **must** forward *exact* error messages from LLM providers (no sanitization)
- Frontend **must** use standard HTTP status explanations (e.g., via `http-status-codes` library)
- Popup **replaces** current inline error messages (e.g., "Models Request Failed" text)
- Zero new backend endpoints required (leverages existing error responses)