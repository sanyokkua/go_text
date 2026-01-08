# Frontend Implementation Specification: Logic & Store Connection

**Objective:** Connect the existing UI components (`frontend/src/v2/ui/`) to the Redux store (`frontend/src/v2/logic/store/`), implement the logic
defined in the requirements, and handle global states (loading, notifications).

**Prerequisites:**

1. Redux Slices (`settings`, `actions`, `editor`, `ui`, `notifications`, `clipboard`) are implemented.
2. UI Components exist in `frontend/src/v2/ui/`.

---

## 1. Global Integration & Helper Components

### 1.1. App Initialization

**File:** `frontend/src/v2/ui/AppMainView.tsx` (or `AppLayout.tsx`)

1. **Effect:** On component mount, dispatch `initializeSettingsState`.
2. **Effect:** Fetch Prompt Groups on mount.
    * Dispatch `getPromptGroups`.
    * If successful, set the first group as the active tab using `setActiveActionsTab`.

### 1.2. Global Loading Overlay

**Requirement:** During any backend operation, UI must be blurred, disabled, and show a spinner.
**Implementation:** Create a component `GlobalLoadingOverlay.tsx` inside `widgets/base/`.

* **Selector:** Use `useAppSelector(state => state.ui.isAppBusy)`.
* **Render:** If `isAppBusy` is true, render a full-screen fixed `Box` (z-index high) with a blurred background (`backdrop-filter: blur(4px)`), a
  CircularProgress from MUI, and a "Processing..." label.
* **Placement:** Import and place `<GlobalLoadingOverlay />` at the top level of `AppLayout.tsx`.

### 1.3. Notification System (Snackbar)

**Requirement:** Show Snackbar for Success/Error/Warning (except successful Prompt Processing).
**Implementation:** Create `NotificationContainer.tsx`.

* **Selector:** Use `useAppSelector(state => state.notifications.queue)`.
* **Render:** Use MUI `Snackbar` and `Alert`. Map through the queue.
* **Logic:**
    * Display the oldest notification.
    * On `autoHideDuration` or Close click, dispatch `removeNotification(id)`.
* **Placement:** Import and place `<NotificationContainer />` at the top level of `AppLayout.tsx`.

---

## 2. Main View Logic (`MainContentWidget`)

### 2.1. Editor Container (Input & Output Panels)

**Selectors:**

* `inputContent`: `state.editor.inputContent`
* `outputContent`: `state.editor.outputContent`
* `isAppBusy`: `state.ui.isAppBusy` (To disable inputs)

**Actions:**

* **Input Text Area:** Use `onChange` to dispatch `setInputContent`.
* **Output Text Area:** Read-only. Display `outputContent`.
* **Input - Clear Button:** Dispatch `clearInput`.
* **Input - Paste Button:**
    1. Dispatch `getClipboardText`.
    2. In `unwrap()` or promise chain:
        * If result is empty string: Do nothing (or show info toast "Clipboard empty").
        * Else: Dispatch `setInputContent(result)`.
* **Output - Clear Button:** Dispatch `clearOutput`.
* **Output - Copy Button:**
    1. Get `outputContent`.
    2. Dispatch `setClipboardText(outputContent)`.
    3. **Notification:** On success, dispatch `enqueueNotification({ message: "Copied to clipboard", severity: "success" })`.
    4. **Notification:** On failure, dispatch `enqueueNotification({ message: "Failed to copy", severity: "error" })`.
* **Output - Use as Input Button:**
    1. **Disabled if:** `outputContent` is empty OR `isAppBusy` is true.
    2. On click: Dispatch `useOutputAsInput`.

### 2.2. Actions Panel (Prompt Groups & Buttons)

**Selectors:**

* `promptGroups`: `state.actions.promptGroups`
* `activeTab`: `state.ui.activeActionsTab`
* `currentLanguages`: `state.settings.allSettings?.languageConfig` (To populate language dropdowns if required by prompts).

**Logic:**

1. **Tabs:** Iterate keys of `promptGroups`.
2. **Active Tab Display:** Find the group matching `activeTab`. Map its `prompts` to buttons.
3. **Button Click:**
    * Prevent click if `isAppBusy` OR `inputContent` is empty.
    * **UI Update:** Immediately set Status Bar "Task" to the Prompt Name. (See Section 2.3).
    * **Dispatch `setAppBusy(true)`:** Lock the UI.
    * **Prepare Request:**
        * Construct `PromptActionRequest`:
            * `id`: Prompt ID.
            * `inputText`: `state.editor.inputContent`.
            * `inputLanguageId`: `state.settings.allSettings?.languageConfig.defaultInputLanguage`.
            * `outputLanguageId`: `state.settings.allSettings?.languageConfig.defaultOutputLanguage`.
    * **Dispatch `processPrompt(request)`:**
    * **On Success:**
        * Result is automatically written to `editor.outputContent` via the Slice's internal logic (if implemented) OR you handle it here.
        * **Crucial:** Dispatch `setAppBusy(false)`.
        * **Crucial:** Set Status Bar "Task" to "N/A".
        * **Note:** Do NOT show a success notification here (as per requirements).
    * **On Error:**
        * Dispatch `setAppBusy(false)`.
        * Dispatch `enqueueNotification({ message: error, severity: 'error' })`.
        * Set Status Bar "Task" to "N/A".

### 2.3. Status Bar

**Selectors:**

* `providerName`: `state.settings.allSettings?.currentProviderConfig.providerName`
* `modelName`: `state.settings.allSettings?.modelConfig.name`
* `currentTask`: (New UI State needed - see Note below)

**Implementation Detail:**

* The "Task" field is transient. Add a property `currentTask: string` to `UIState` in the store.
* Add a reducer `setCurrentTask(task: string)` in `uiSlice.ts`.
* **Logic:**
    * When Action Button clicked -> Dispatch `setCurrentTask(promptName)`.
    * When `processPrompt` finishes (Success/Error) -> Dispatch `setCurrentTask('N/A')`.
    * If no action, display "N/A".

---

## 3. Settings View Logic (`SettingsView`)

### 3.1. View Navigation

* **Selectors:**
    * `activeTab`: `state.ui.activeSettingsTab`
    * `isAppBusy`: `state.ui.isAppBusy`
* **Global Controls:**
    * **Close Button:** Dispatch `toggleSettingsView()`.
    * **Reset Button:**
        1. Dispatch `setAppBusy(true)`.
        2. Dispatch `resetSettingsToDefault`.
        3. On success/error -> Dispatch `setAppBusy(false)`.
        4. Show success/error notification.

### 3.2. Metadata Tab

* **Selector:** `state.settings.metadata`.
* **Copy Buttons:**
    * Click -> Dispatch `setClipboardText(path)`.
    * On success -> Show "Path copied" notification.

### 3.3. Provider Config Tab

**Selector:** `state.settings.allSettings`.

**Logic:**

1. **Current Provider Display:** Show data from `allSettings.currentProviderConfig`.
2. **Provider List:** Map `allSettings.availableProviderConfigs`.
    * **Edit:** Populates form.
    * **Set Current:** Dispatch `setAsCurrentProviderConfig(id)`. Show notification on success.
    * **Delete:** Dispatch `deleteProviderConfig(id)`. Show notification.
3. **Provider Form (Create/Edit):**
    * Use local state (`formData`) to manage inputs (as per existing code).
    * **Verification Logic (The "Test" Feature):**
        * **"Test Models" Button:**
            1. Dispatch `getModelsListForProvider(formData)`.
            2. Store the returned list in a local state variable (e.g., `testResults`).
            3. If successful, display a list/dropdown of models found below the button.
        * **"Test Inference" Button:**
            1. User must provide a Model ID (Input field). Ideally, allow selecting from `testResults`.
            2. Create `ChatCompletionRequest`:
                * `model`: user input ID.
                * `messages`: `[{role: 'user', content: 'Hello'}]`.
                * `stream`: false.
            3. Dispatch `getCompletionResponseForProvider({ providerConfig: formData, chatCompletionRequest })`.
            4. **Notifications:**
                * Success: "Connection successful!" (Severity: success).
                * Error: "Connection failed." (Severity: error).
    * **Save Button:**
        1. Validation (as currently implemented).
        2. If creating: Dispatch `createProviderConfig(formData)`.
        3. If editing: Dispatch `updateProviderConfig(formData)`.
        4. Dispatch `setAppBusy(true)` before API call, `false` after.

### 3.4. Model Config Tab

**Selector:** `state.settings.allSettings`.

**Logic:**

1. **Fetch Models:**
    * On tab mount, check `state.actions.availableModels`.
    * If empty, dispatch `getModelsList()`.
2. **Model Dropdown:**
    * Display `state.actions.availableModels`.
    * **Filtering:** Add a `TextField` for filtering. Filter the list locally using `String.includes()` (case-insensitive).
3. **Temperature:** Toggle and Slider (range 0-2).
4. **Save Button:**
    * Dispatch `updateModelConfig({ name, useTemperature, temperature })`.
    * Show notification on success/error.

### 3.5. Inference Config Tab

**Selector:** `state.settings.allSettings`.

**Logic:**

1. **Inputs:**
    * Timeout (Input type number, validate 1-600).
    * Retries (Input type number, validate 0-10).
    * Use Markdown (Checkbox).
2. **Save Button:**
    * Dispatch `updateInferenceBaseConfig({ timeout, maxRetries, useMarkdownForOutput })`.
    * Show notification on success/error.

### 3.6. Language Config Tab

**Selector:** `state.settings.allSettings`.

**Logic:**

1. **List Display:** Show `allSettings.languageConfig.languages`.
2. **Default Selection:** Two dropdowns for Input/Output defaults.
    * onChange -> Dispatch `setDefaultInputLanguage(lang)` / `setDefaultOutputLanguage(lang)`.
3. **Add Language:**
    * Input field + "Add" button.
    * Click -> Dispatch `addLanguage(newLang)`.
4. **Remove Language:**
    * "X" button next to language in list.
    * Click -> Dispatch `removeLanguage(lang)`.
    * *Note:* Backend should reject removing defaults; handle rejection error with notification.

---

## 4. UI Slice Extension (Required Update)

**File:** `frontend/src/v2/logic/store/ui/types.ts` and `slice.ts`

You need to extend the `UIState` to support the Status Bar "Task" requirement.

**Update Types:**

```typescript
export interface UIState {
    // ... existing properties
    currentTask: string; // New: Stores the name of the currently running action
}
```

**Update Reducers:**

```typescript
export const uiSlice = createSlice({
    // ... existing config
    reducers: {
        // ... existing reducers
        setCurrentTask: (state, action: PayloadAction<string>) => {
            state.currentTask = action.payload;
        }
    }
    // ...
});
```

**Update Initial State:**
`currentTask: 'N/A'`

---

## 5. Implementation Checklist for Agent

1. **Refactor AppMainView:** Connect `initializeSettingsState` and `getPromptGroups` on mount.
2. **Create GlobalOverlay:** Implement blur + spinner based on `state.ui.isAppBusy`.
3. **Create NotificationContainer:** Implement Snackbar based on `state.notifications.queue`.
4. **Refactor Editor:**
    * Remove local state `inputContent`/`outputContent`.
    * Connect to Redux `editor` slice.
    * Connect Paste/Copy/Use-as-Input to thunks + notifications.
5. **Refactor Actions Panel:**
    * Read `promptGroups` from Redux.
    * Connect button click to `processPrompt`.
    * Manage `currentTask` state in Redux (Start -> Set Name -> End -> Set 'N/A').
6. **Refactor StatusBar:**
    * Read Provider/Model from Redux.
    * Read `currentTask` from Redux.
7. **Refactor Settings View:**
    * Connect Global Close/Reset.
    * Connect all individual tabs to their respective thunks.
    * **CRITICAL:** Implement the "Test" buttons logic in `ProviderForm` using the `ForProvider` thunks.
    * Implement Model Filtering logic locally.

# Base Path for v2

All the components and logic are related only to frontend/src/v2

# Clean Code rules

Clean Code rules can be found here - docs/CleanCodeRules.md

Use Strict Typing for Typescript, avoid using 'any' type.

Additional best practices described here: docs/FrontendRules.md

## Use the mui-mcp server to answer any MUI questions --

-
    1. call the "useMuiDocs" tool to fetch the docs of the package relevant in the question
-
    2. call the "fetchDocs" tool to fetch any additional docs if needed using ONLY the URLs present in the returned content.
-
    3. repeat steps 1-2 until you have fetched all relevant docs for the given question
-
    4. use the fetched content to answer the question
