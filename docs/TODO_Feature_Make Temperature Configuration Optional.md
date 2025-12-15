# Feature: Make Temperature Configuration Optional

## UI Requirements

- Add a checkbox labeled **"Enable Temperature"** above the "Model Temperature" slider.
- **Behavior**:
    - *Checked*: Slider is active (adjustable range: 0.0–1.0).
    - *Unchecked*: Slider is disabled (greyed out; non-interactive).

## Payload Handling

- **Enabled**: Include `"temperature": <value>` in the LLM request JSON.
- **Disabled**: **Omit the `temperature` field entirely** (do not send `null`/default values).

## Validation Criteria

1. Checkbox toggle immediately updates slider state.
2. Network requests confirm correct payload structure (field presence/absence).
3. Backend gracefully handles missing `temperature` field when disabled.

*Note: Maintain existing slider behavior when enabled; no default value required for disabled state.*