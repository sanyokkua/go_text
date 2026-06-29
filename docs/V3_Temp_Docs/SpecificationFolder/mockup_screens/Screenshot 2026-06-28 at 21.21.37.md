Here is the detailed UI specification for the "GoText" application in the "stacked" view (Light Mode), based on the provided screenshot.

### 1. Theme and Color Palette
*   **Overall Theme:** Light mode, clean, minimalist (consistent with previous light mode screenshots).
*   **Primary Accent Color:** Teal / Muted Green (approx. `#4A8B8C` or `#5C9E9E`). Used for primary buttons, selected states, and active links.
*   **Background Colors:**
    *   Main App Background: Very light gray (approx. `#F3F4F6`).
    *   Panels/Cards (Sidebar items, Input/Output boxes): Light gray (approx. `#F9FAFB` or `#F3F4F6`) with subtle borders.
    *   Control Bar Background: White (`#FFFFFF`).
*   **Text Colors:**
    *   Primary Text: Dark gray/Black (approx. `#111827`).
    *   Secondary/Muted Text: Medium gray (approx. `#6B7280`).
    *   Accent Text: Teal.
*   **Typography:** Sans-serif for UI elements, Monospace for the Input text area.

---

### 2. Layout Structure
The application uses a layout with a left sidebar and a main content area where the Input and Output are stacked vertically.
1.  **Window Title Bar** (macOS native, title: "GoText — stacked").
2.  **Top Toolbar (Appbar)** containing global controls.
3.  **Left Sidebar** for navigation and settings.
4.  **Main Content Area** arranged vertically:
    *   Top: Input Panel.
    *   Middle: Control Bar (Stack actions and Run button).
    *   Bottom: Output Panel.

---

### 3. Component Details

#### A. Top Toolbar (Appbar)
*   **Background:** White, separated from the main content by a subtle bottom border.
*   **Row 1 (Main Controls):**
    *   **Icon Button:** Hamburger menu (three horizontal lines). Teal border, light teal background.
    *   **Brand Logo:** Teal square with a white "G", followed by bold black text "GoText".
    *   **Dropdown Button:** "PROVIDER Ollama". Teal border, light teal background, teal text, dropdown arrow.
    *   **Dropdown Button:** "MODEL llama3.1:8b". Light gray background, dark text, dropdown arrow.
    *   **Dropdown Button:** "LANG EN → UK". Light gray background, dark text, dropdown arrow.
    *   **Label:** "FORMAT" (gray, uppercase, small).
    *   **Toggle Buttons:** "Plain" (white text) and "MD" (teal text, white background, bold).
    *   **Label:** "VIEW" (gray, uppercase, small).
    *   **Segmented Control:** "Preview" (Selected: teal text, white background), "Source" (Unselected: dark text), "Diff" (Unselected: dark text).
    *   **Icon Buttons:** Grid icon, List icon (selected/active state implied by context, though visual is subtle), Clock icon, Settings gear icon. All gray/white background with borders.

#### B. Left Sidebar
*   **Background:** White/Light Gray, separated by a vertical border.
*   **Search Input:** Rounded rectangle, white background, gray border. Placeholder text: "search..." with a magnifying glass icon.
*   **Section Header:** "MY STACKS" (gray, uppercase) and "MANAGE ›" (teal, uppercase, clickable link).
*   **Stack List Items (Cards):**
    *   **Item 1:** Envelope icon, bold text "Message for Manager". White background, rounded corners, border.
    *   **Item 2:** Megaphone icon, bold text "Standup update". White background, rounded corners, border.
*   **Section Header:** "ACTIONS · PROOFREADING" (gray, uppercase).
*   **Action List Items:**
    *   **Item 1 (Selected):** "✓ Basic proofreading". Teal text, light teal background, rounded rectangle.
    *   **Item 2:** "Enhanced". Gray text, transparent background.

#### C. Main Content Area (Vertical Stack)

**1. Input Panel (Top)**
*   **Header:** "INPUT · 28 words" (gray, uppercase).
*   **Header Actions:** Copy icon button (clipboard), Close icon button (X). Both light gray background, rounded.
*   **Text Area:** Large light gray rounded rectangle. Contains monospace text: "hey team the caching thing is more or less done, lmk if u want to review b4 we ship tmrw".

**2. Control Bar (Middle)**
*   **Background:** White, spanning the width of the main content area.
*   **Left Side:**
    *   **Pill Button:** "✓ Basic proofreading". Teal border, teal text, rounded pill shape, white background.
    *   **Label:** "· 1 inference" (gray text).
    *   **Pill Button:** "+ Build a stack". Gray border, gray text, rounded pill shape, white background.
*   **Right Side:**
    *   **Primary Pill Button:** "▶ Run". Teal background, white text, rounded pill shape.

**3. Output Panel (Bottom)**
*   **Header:** "OUTPUT · rendered" (gray, uppercase).
*   **Header Actions:** Copy icon button, Refresh icon button, Close icon button (X). All light gray background, rounded.
*   **Text Area:** Large light gray rounded rectangle. Contains rendered sans-serif text: "Hi team — the caching work is more or less done. Let me know if you'd like to review before we ship tomorrow."