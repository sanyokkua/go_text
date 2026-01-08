This document serves as the **Technical Specification for the Redux Store Implementation**. It is designed for an AI Agent to autonomously implement the Redux logic for the **GoText V2** application.

---

# Redux Store Implementation Specification

**Project Context:** GoText V2 (Wails App - React + Redux Toolkit)
**Base Directory:** `frontend/src/v2/`
**Objective:** Implement a robust, type-safe Redux architecture that handles Settings, Actions, Editor State, UI State, and Notifications, strictly following the optimized "Patch vs. Full" update strategy.

---

## 1. Global Architecture & Utilities

**File:** `frontend/src/v2/logic/store/index.ts`

1.  **Imports:** Combine all slices (`settings`, `actions`, `editor`, `ui`, `notifications`, `clipboard`).
2.  **Store Configuration:**
    *   Configure `configureStore`.
    *   Add middleware (e.g., Redux Logger only if in dev mode).
3.  **Types:** Export `RootState` and `AppDispatch`.
4.  **Hooks:** Create and export typed hooks `useAppDispatch` and `useAppSelector`.

---

## 2. Settings Slice Specification

**Path:** `frontend/src/v2/logic/store/settings/`

### 2.1. Types & State
**File:** `types.ts`
```typescript
import { Settings, AppSettingsMetadata, ModelConfig, InferenceBaseConfig, LanguageConfig, ProviderConfig } from '../../../adapter/models';

export interface SettingsState {
  // Full object cache (Single Source of Truth)
  allSettings: Settings | null;
  
  // Metadata is separate from the main Settings object
  metadata: AppSettingsMetadata | null;

  // Status Flags
  loading: boolean;   // Initial load
  saving: boolean;    // Saving updates
  error: string | null;
}
```

### 2.2. Reducers
**File:** `slice.ts`
*   **No synchronous reducers are required** aside from the standard case handling in `extraReducers`.
*   **CRITICAL RULE:** Do not mutate state directly; use RTK's mutation capabilities or return new objects.

### 2.3. Extra Reducers (Async Handling Logic)
**File:** `slice.ts`

Implement the following logic in `extraReducers`:

1.  **Initialization:**
    *   `initializeSettings/pending`: Set `loading = true`.
    *   `initializeSettings/fulfilled`: Set `loading = false`.
    *   `initializeSettings/rejected`: Set `error`, `loading = false`.

2.  **Full State Replacement (Used for Init, Reset, Create):**
    *   **`getSettings.fulfilled`**: Replace `state.allSettings` with payload.
    *   **`resetSettingsToDefault.fulfilled`**: Replace `state.allSettings` with payload.
    *   **`createProviderConfig.fulfilled`**: Replace `state.allSettings` with payload (Assumes backend returns full settings).

3.  **Patch Updates (Efficient Partial Updates):**
    *   **`updateModelConfig.fulfilled`**:
        *   If `state.allSettings` exists, update `state.allSettings.modelConfig` with payload.
    *   **`updateInferenceBaseConfig.fulfilled`**:
        *   If `state.allSettings` exists, update `state.allSettings.inferenceBaseConfig` with payload.
    *   **`updateProviderConfig.fulfilled`**:
        *   **Step A:** Update provider in `availableProviderConfigs` array (find by ID, replace).
        *   **Step B (Critical):** Check if `updatedProvider.providerId === state.allSettings.currentProviderConfig.providerId`. If true, also update `state.allSettings.currentProviderConfig`.
    *   **`setAsCurrentProviderConfig.fulfilled`**:
        *   Update `state.allSettings.currentProviderConfig` with payload.
    *   **`deleteProviderConfig.fulfilled`**:
        *   Filter `availableProviderConfigs` to remove the ID from payload.
    *   **`addLanguage.fulfilled` / `removeLanguage.fulfilled`**:
        *   Update `state.allSettings.languageConfig.languages` with payload array.

4.  **Metadata:**
    *   **`getAppSettingsMetadata.fulfilled`**: Set `state.metadata`.

5.  **Language Defaults:**
    *   **`setDefaultInputLanguage.fulfilled`**: Update `state.allSettings.languageConfig.defaultInputLanguage`.
    *   **`setDefaultOutputLanguage.fulfilled`**: Update `state.allSettings.languageConfig.defaultOutputLanguage`.

### 2.4. Thunks
**File:** `thunks.ts`

Implement the following async thunks using `createAsyncThunk`. All must use `rejectValue: string` and the existing `parseError` utility.

**Initialization:**
1.  `initializeSettingsState`: Dispatches `getSettings` and `getAppSettingsMetadata` in parallel (Promise.all). Only returns on success.

**CRUD Operations:**
2.  `getSettings`: Calls `SettingsHandlerAdapter.getSettings()`.
3.  `getAppSettingsMetadata`: Calls `SettingsHandlerAdapter.getAppSettingsMetadata()`.
4.  `resetSettingsToDefault`: Calls `SettingsHandlerAdapter.resetSettingsToDefault()`.
5.  `createProviderConfig`: Calls `SettingsHandlerAdapter.createProviderConfig`.
6.  `updateProviderConfig`: Calls `SettingsHandlerAdapter.updateProviderConfig`.
7.  `deleteProviderConfig`: Calls `SettingsHandlerAdapter.deleteProviderConfig`.
8.  `setAsCurrentProviderConfig`: Calls `SettingsHandlerAdapter.setAsCurrentProviderConfig`.

**Sub-Config Updates:**
9.  `updateModelConfig`: Calls `SettingsHandlerAdapter.updateModelConfig`.
10. `updateInferenceBaseConfig`: Calls `SettingsHandlerAdapter.updateInferenceBaseConfig`.

**Language Management:**
11. `addLanguage`: Calls `SettingsHandlerAdapter.addLanguage`.
12. `removeLanguage`: Calls `SettingsHandlerAdapter.removeLanguage`.
13. `setDefaultInputLanguage`: Calls `SettingsHandlerAdapter.setDefaultInputLanguage`.
14. `setDefaultOutputLanguage`: Calls `SettingsHandlerAdapter.setDefaultOutputLanguage`.

**Verification / Utility (Do NOT update Redux state with these results):**
15. `getModelsListForProvider`: Calls `SettingsHandlerAdapter.getModelsListForProvider`. *Note: This is used by the Form for testing.*
16. `getCompletionResponseForProvider`: Calls `SettingsHandlerAdapter.getCompletionResponseForProvider`. *Note: This is used by the Form for testing connectivity.*

---

## 3. Actions Slice Specification

**Path:** `frontend/src/v2/logic/store/actions/`

### 3.1. Types & State
**File:** `types.ts`
```typescript
import { Prompts } from '../../../adapter/models';

export interface ActionsState {
  promptGroups: Prompts | null; // Structure for buttons/tabs
  availableModels: string[];    // List of models for current provider
  loading: boolean;             // True while processing LLM prompt
  error: string | null;
}
```

### 3.2. Reducers
**File:** `slice.ts`
*   No synchronous reducers needed.

### 3.3. Extra Reducers
**File:** `slice.ts`

1.  **`getPromptGroups`**:
    *   `fulfilled`: Set `state.promptGroups` = payload.
2.  **`getModelsList`**:
    *   `fulfilled`: Set `state.availableModels` = payload.
3.  **`processPrompt`**:
    *   `pending`: Set `state.loading = true`.
    *   `fulfilled`: Set `state.loading = false`. **Do NOT store result here** (it goes to Editor).
    *   `rejected`: Set `state.loading = false`.

### 3.4. Thunks
**File:** `thunks.ts`

1.  `getPromptGroups`: Calls `ActionHandlerAdapter.getPromptGroups`.
2.  `getModelsList`: Calls `ActionHandlerAdapter.getModelsList` (Uses current backend config).
3.  `processPrompt`:
    *   **Input:** `PromptActionRequest`.
    *   **Logic:** Calls `ActionHandlerAdapter.processPrompt`.
    *   **Side Effect:** On success, the UI component listening to this result must dispatch `setOutputContent` to the `EditorSlice`.

---

## 4. Editor Slice Specification

**Path:** `frontend/src/v2/logic/store/editor/`

### 4.1. Types & State
**File:** `types.ts`
```typescript
export interface EditorState {
  inputContent: string;
  outputContent: string;
}
```

### 4.2. Reducers
**File:** `slice.ts`
Implement synchronous reducers for:
1.  `setInputContent(payload: string)`
2.  `setOutputContent(payload: string)`
3.  `useOutputAsInput()`: Moves `outputContent` to `inputContent` and clears `output`.
4.  `clearAll()`: Clears both.
5.  `clearInput()`: Clears input.
6.  `clearOutput()`: Clears output.

### 4.3. Thunks
*   **None.** All updates are synchronous.

---

## 5. UI Slice Specification

**Path:** `frontend/src/v2/logic/store/ui/`

### 5.1. Types & State
**File:** `types.ts`
```typescript
export type MainView = 'main' | 'settings';

export interface UIState {
  view: MainView;
  activeSettingsTab: number;  // 0 to 4
  activeActionsTab: string;    // ID of the prompt group
  isAppBusy: boolean;          // Global overlay for long operations
}
```

### 5.2. Reducers
**File:** `slice.ts`
Implement synchronous reducers for:
1.  `toggleSettingsView()`: Switches between 'main' and 'settings'.
2.  `setActiveSettingsTab(index: number)`
3.  `setActiveActionsTab(groupId: string)`
4.  `setAppBusy(isBusy: boolean)`

### 5.3. Thunks
*   **None.**

---

## 6. Notifications Slice Specification

**Path:** `frontend/src/v2/logic/store/notifications/`

### 6.1. Types & State
**File:** `types.ts`
```typescript
export type Severity = 'success' | 'error' | 'info' | 'warning';

export interface Notification {
  id: string;
  message: string;
  severity: Severity;
}

export interface NotificationsState {
  queue: Notification[];
}
```

### 6.2. Reducers
**File:** `slice.ts`
1.  `enqueueNotification(payload: Omit<Notification, 'id'>)`: Generates a UUID and adds to queue.
2.  `removeNotification(payload: string)`: Removes by ID.
3.  `clearQueue()`: Removes all.

### 6.3. Thunks
*   **None.** Components will dispatch `enqueueNotification`.

---

## 7. Clipboard Slice Specification

**Path:** `frontend/src/v2/logic/store/clipboard/`

### 7.1. Types & State
**File:** `types.ts`
```typescript
export interface ClipboardState {
  loading: boolean;
  lastActionSuccess: boolean | null; // true = copy success, false = fail
  error: string | null;
}
```

### 7.2. Extra Reducers
**File:** `slice.ts`
1.  **`setText.fulfilled`**: Set `state.lastActionSuccess = true`.
2.  **`setText.rejected`**: Set `state.lastActionSuccess = false`.

### 7.3. Thunks
**File:** `thunks.ts`
1.  `getClipboardText`: Calls `ClipboardServiceAdapter.getText`. Returns string.
2.  `setClipboardText`: Calls `ClipboardServiceAdapter.setText`. Returns boolean.

---

## 8. Integration & Selector Guidelines

### 8.1. Selectors
Create selector files in each folder (`selectors.ts`) for clean data access.

**Examples:**
*   `selectCurrentProvider`: `(state: RootState) => state.settings.allSettings?.currentProviderConfig`
*   `selectInputLanguage`: `(state: RootState) => state.settings.allSettings?.languageConfig.defaultInputLanguage`
*   `selectPromptGroups`: `(state: RootState) => state.actions.promptGroups`

### 8.2. Cross-Slice Logic (The "Process Prompt" Workflow)
The AI Agent should not put complex orchestration logic inside `processPrompt`. The orchestration happens in the UI Component.

**Example Usage in Component:**
```typescript
const dispatch = useAppDispatch();
const inputText = useAppSelector(selectInputContent);
const settings = useAppSelector(selectAllSettings);

const handleProcess = async () => {
  dispatch(setAppBusy(true));
  try {
    // 1. Build Request
    const request: PromptActionRequest = {
      id: 'some_action_id',
      inputText: inputText,
      inputLanguageId: settings.languageConfig.defaultInputLanguage,
      // ...
    };

    // 2. Execute LLM
    await dispatch(processPrompt(request)).unwrap();

    // 3. Assuming processPrompt doesn't automatically store result (based on spec),
    // we handle the response here or in a listener. 
    // *Correction based on Spec*: Spec says "Thunks... processPrompt... returns string". 
    // The Component should handle the result dispatch if the thunk doesn't.
    
  } catch (e) {
    dispatch(enqueueNotification({ message: 'Error processing', severity: 'error' }));
  } finally {
    dispatch(setAppBusy(false));
  }
};
```

**Optimization Note:** For better UX, modify `processPrompt` thunk in `ActionsSlice`:
*   Add `extraReducer`: `processPrompt.fulfilled`.
*   In that reducer, dispatch a *local* action or accept a callback? No, simpler:
*   The `processPrompt` thunk should internally dispatch `setOutputContent` upon success to keep the component clean.

**Updated Spec for Actions Slice Thunk:**
`processPrompt` should:
1.  Call API.
2.  On success, internally dispatch `editor/setOutputContent(response)`.
3.  Return response.

---

## 9. AI Agent Implementation Checklist

1.  [ ] Create folder structure: `store/{settings, actions, editor, ui, notifications, clipboard}`.
2.  [ ] Implement `slice.ts` for each with defined `initialState` and `reducers`.
3.  [ ] Implement `thunks.ts` for `settings`, `actions`, and `clipboard`.
4.  [ ] Implement `types.ts` for all slices.
5.  [ ] Implement `selectors.ts` for `settings` and `actions` (crucial for performance).
6.  [ ] Update `store/index.ts` to combine all reducers.
7.  [ ] Ensure `extraReducers` handle the "Patch" logic strictly as per Section 2.3.
8.  [ ] Ensure `getModelsListForProvider` and `getCompletionResponseForProvider` are present in `settings/thunks.ts` for the Provider Form "Test" functionality.
9.  [ ] Verify no redundant getters (like `getModelConfig`) exist; only use the main `getSettings`.

End of Specification.