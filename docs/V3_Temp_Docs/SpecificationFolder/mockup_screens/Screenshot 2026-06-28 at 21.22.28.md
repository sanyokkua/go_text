Here is the detailed UI specification for the "GoText" application Settings view (Light Mode), based on the provided screenshot.

### 1. Theme and Color Palette
*   **Overall Theme:** Light mode, clean, minimalist, technical.
*   **Primary Accent Color:** Teal / Muted Green (approx. `#4A8B8C` or `#5C9E9E`). Used for active states, primary buttons, selected borders, and success indicators.
*   **Background Colors:**
    *   Main App Background: Very light gray (approx. `#F3F4F6`).
    *   Panels/Cards (Sidebar items, Input boxes): White (`#FFFFFF`) or very light gray (`#F9FAFB`).
    *   Selected/Active Button Backgrounds: Light teal-tinted gray.
*   **Text Colors:**
    *   Primary Text: Dark gray/Black (approx. `#111827`).
    *   Secondary/Muted Text: Medium gray (approx. `#6B7280`).
    *   Accent Text: Teal.
    *   Status Colors: Green for success/active, Purple for tags (Azure).
*   **Typography:** Sans-serif for UI elements.

---

### 2. Layout Structure
The application uses a three-column layout for settings:
1.  **Window Title Bar** (macOS native, title: "GoText — Settings · Providers").
2.  **Top Navigation Bar** for returning to the editor.
3.  **Left Sidebar (Settings Navigation):** List of settings categories.
4.  **Middle Sidebar (Providers List):** List of configured providers.
5.  **Main Content Area (Provider Configuration):** Detailed form for the selected provider.

---

### 3. Component Details

#### A. Top Navigation Bar
*   **Background:** White, separated by a subtle bottom border.
*   **Left Side:**
    *   **Button:** "< Editor" (gray text, white background, rounded).
    *   **Title:** "Settings" (black, bold).

#### B. Left Sidebar (Settings Navigation)
*   **Background:** Very light gray.
*   **List Items:**
    *   **Item 1 (Selected):** "🔌 Providers" (Teal text, light teal background, rounded rectangle).
    *   **Item 2:** "⚙ Model" (gray text).
    *   **Item 3:** "✍ Generation" (gray text).
    *   **Item 4:** "🌐 Languages" (gray text).
    *   **Item 5:** "📋 Logging" (gray text).
    *   **Item 6:** " About & data" (gray text).
    *   **Item 7:** "🎨 Appearance" (gray text).

#### C. Middle Sidebar (Providers List)
*   **Background:** White, separated by a vertical border.
*   **Header:** "PROVIDERS" (gray, uppercase).
*   **List Items:**
    *   **Item 1:** "○ Ollama" (gray text, white background).
    *   **Item 2:** "○ LM Studio" (gray text, white background).
    *   **Item 3:** "○ Llama.cpp" (gray text, white background).
    *   **Item 4:** "○ OpenRouter" (gray text, white background).
    *   **Item 5 (Selected):** "● Azure OpenAI" (black text, light gray background, rounded rectangle).
        *   **Badge:** "CURRENT" (green text, light green background, rounded rectangle, right-aligned below text).
*   **Bottom Button:** "+ New provider" (gray text, white background, border, rounded rectangle).

#### D. Main Content Area (Provider Configuration - Azure OpenAI)
*   **Background:** White.
*   **Header:**
    *   **Title:** "Azure OpenAI" (black, bold).
    *   **Badge 1:** "CURRENT" (green text, light green background).
    *   **Badge 2:** "Azure" (purple text, light purple background).
*   **Row 1: KIND & AUTH**
    *   **Label:** "KIND" (gray, uppercase).
    *   **Dropdown:** "KIND Azure ▾" (teal border, light teal background).
    *   **Label:** "AUTH" (gray, uppercase).
    *   **Segmented Control:** "None", "Bearer", "Api-Key" (Selected: teal border, white background).
*   **Info Box:**
    *   **Style:** Light teal background, rounded rectangle.
    *   **Content:** "🔑 API key — environment variable AZURE_OPENAI_API_KEY — the app reads the key from this variable at run time and **never stores it**." (Teal text, bold "never stores it").
*   **Row 2: BASE URL**
    *   **Label:** "BASE URL" (gray, uppercase).
    *   **Input:** "https://my-resource.openai.azure.com/" (white background, gray border).
*   **Row 3: ENDPOINTS**
    *   **Left Column:**
        *   **Label:** "MODELS ENDPOINT" (gray, uppercase).
        *   **Input:** "openai/deployments?api-version=2024-10-21" (white background, gray border).
    *   **Right Column:**
        *   **Label:** "COMPLETION ENDPOINT" (gray, uppercase).
        *   **Input:** "openai/deployments/{deployment}/chat/completions" (white background, gray border).
*   **Row 4: VERSION & MODEL**
    *   **Left Column:**
        *   **Label:** "API VERSION (Azure; optional)" (gray, uppercase).
        *   **Input:** "2024-10-21" (white background, gray border).
    *   **Right Column:**
        *   **Label:** "DEPLOYMENT / SELECTED MODEL" (gray, uppercase).
        *   **Dropdown:** "gpt-4o" with refresh and dropdown arrows (light gray background).
*   **Row 5: Custom Headers**
    *   **Toggle:** "Use custom headers" (Teal toggle switch, ON).
    *   **Table/Grid:**
        *   **Row 1:** Input "OpenAI-Organization", Input "org-xxxx", Icon "X" (remove).
        *   **Row 2:** Input "Header name" (placeholder), Input "Value" (placeholder), Icon "+" (add).
*   **Row 6: Custom Models**
    *   **Toggle:** "Use custom models" (Teal toggle switch, ON).
    *   **Helper Text:** "— type a name + ↵ to add; used when discovery is off/unreachable" (gray text).
    *   **Tags Input:**
        *   **Tag 1:** "gpt-4o ×" (teal border, light teal background).
        *   **Tag 2:** "gpt-4o-mini ×" (teal border, light teal background).
        *   **Tag 3:** "o3-mini ×" (teal border, light teal background).
        *   **Input:** "add a model name & press ↵..." (placeholder).
*   **Section: VERIFY PROVIDER**
    *   **Header:** "VERIFY PROVIDER" (gray, uppercase).
    *   **Buttons:**
        *   "🔌 Test connection" (white background, gray border).
        *   "📋 Test models" (white background, gray border).
        *   "💬 Test inference" (white background, gray border).
    *   **Status:** "running checks..." with a spinner icon (gray text).
    *   **Results List:**
        *   **Item 1:** Green check icon, "Connection & auth" (bold), "Reachable, key accepted", "128 ms" (right aligned).
        *   **Item 2:** Green check icon, "Model discovery" (bold), "14 chat models found", "96 ms" (right aligned).
        *   **Item 3:** Green check icon, "Test inference" (bold), "round-trip OK — 'Hello! ...'", "842 ms" (right aligned).
    *   **Footer Text:** "Test inference sends a tiny throw-away completion ('Say hi') to the **selected model** to confirm the whole path works. A failed check shows a typed reason (auth · not found · timeout) instead of ✓." (gray text, small).
*   **Bottom Action Bar:**
    *   **Left:** "Set as current" button (white background, gray border).
    *   **Right:** "Delete..." button (gray text, transparent), "Save" button (Teal background, white text, rounded).