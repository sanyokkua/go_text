Here is a detailed UI specification for the "GoText" application based on the provided screenshot.

### 1. Theme and Color Palette
*   **Overall Theme:** Light mode, clean, modern, and minimalist.
*   **Primary Accent Color:** Teal / Muted Green (approx. `#4A8B8C` or `#5C9E9E`). Used for primary buttons, selected states, and active links.
*   **Background Colors:**
    *   Main App Background: Very light gray (approx. `#F3F4F6`).
    *   Panels/Cards (Sidebar items, Input/Output boxes): White (`#FFFFFF`) with subtle borders/shadows.
    *   Inactive Buttons/Inputs: Light gray (approx. `#F3F4F6` or `#E5E7EB`).
*   **Text Colors:**
    *   Primary Text: Dark gray/Black (approx. `#111827`).
    *   Secondary/Muted Text: Medium gray (approx. `#6B7280`).
    *   Accent Text: Teal (matches primary accent).
*   **Typography:** Sans-serif for UI elements (Inter or system font), Monospace for the Input/Output text areas.

---

### 2. Layout Structure
The application is a standard desktop window layout consisting of:
1.  **Window Title Bar** (macOS native).
2.  **Top Toolbar (Appbar)** containing global controls.
3.  **Left Sidebar** for navigation and settings.
4.  **Main Content Area** split into two columns (Input and Output).
5.  **Bottom Action Bar** for execution controls.

---

### 3. Component Details

#### A. Top Toolbar (Appbar)
*   **Background:** White, separated from the main content by a subtle bottom border.
*   **Row 1 (Main Controls):**
    *   **Icon Button:** Hamburger menu (three horizontal lines), gray.
    *   **Brand Logo:** Green square with a white "G", followed by bold black text "GoText".
    *   **Dropdown Button:** "PROVIDER Ollama". Light teal background, teal text, dropdown arrow.
    *   **Dropdown Button:** "MODEL llama3.1:8b". Light gray background, dark text, dropdown arrow.
    *   **Icon Button:** Refresh/Reload (circular arrow), gray.
    *   **Dropdown Button:** "LANG EN → UK". Light gray background, dark text, dropdown arrow.
    *   **Label:** "FORMAT" (gray, uppercase, small).
    *   **Toggle Buttons:** "Plain" and "MD". White background, gray border. "MD" appears slightly bolder.
    *   **Label:** "VIEW" (gray, uppercase, small).
    *   **Segmented Control:** "Preview" (Selected: light teal background, teal text), "Source" (Unselected: white background), "Diff" (Unselected: white background).
    *   **Icon Buttons:** Grid icon, List icon, "⌘K" shortcut icon, Clock icon. All gray.
*   **Row 2 (Secondary Controls - Left aligned below Row 1):**
    *   **Icon Button:** Info "i" inside a circle. Light gray background.
    *   **Icon Button:** Settings gear. Light gray background.

#### B. Left Sidebar
*   **Background:** White, separated by a vertical border.
*   **Search Input:** Rounded rectangle, light gray background. Placeholder text: "search actions & stacks..." with a magnifying glass icon.
*   **Section Header:** "MY STACKS" (gray, uppercase) and "MANAGE ›" (teal, uppercase, clickable link).
*   **Stack List Items (Cards):**
    *   **Item 1:** Envelope icon, bold text "Message for Manager", badge "3" (gray, right-aligned). White background, rounded corners.
    *   **Item 2:** Document icon, bold text "Article for Confluence", badge "4" (gray, right-aligned). White background, rounded corners.
*   **Section Header:** "ACTIONS · PROOFREADING" (gray, uppercase).
*   **Action List Items:**
    *   **Item 1 (Selected):** "✓ Basic proofreading". Teal text, light teal background, rounded rectangle.
    *   **Item 2:** "Enhanced proofreading". Gray text, transparent background.
*   **Section Header:** "TONE · 8" (gray, uppercase).
*   **Tone List Items:** "Professional" and "Friendly" (gray text, transparent background).

#### C. Main Content Area (Split View)
*   **Background:** Light gray.
*   **Left Panel (INPUT):**
    *   **Header:** "INPUT · 1,840 words" (gray, uppercase).
    *   **Header Actions:** Copy icon button (clipboard), Close icon button (X). Both light gray background.
    *   **Text Area:** Large white rounded rectangle. Contains monospace text: "we shipped the new caching layer this week. there were a few isues with invalidation but its handled. also added retry logic..."
*   **Right Panel (OUTPUT):**
    *   **Header:** "OUTPUT · rendered" (gray, uppercase).
    *   **Header Actions:** Copy icon button, Refresh icon button, Close icon button (X). All light gray background.
    *   **Text Area:** Large white rounded rectangle. Contains rendered text: "We shipped the new caching layer this week. A few invalidation issues came up but they're handled. We also added `retry` logic."
    *   *Note:* The word "retry" is styled as inline code (light gray background, monospace font, rounded corners).

#### D. Bottom Action Bar
*   **Background:** White, separated by a top border.
*   **Left Side:**
    *   **Pill Button:** "✓ Basic proofreading". Light teal background, teal text, rounded pill shape.
    *   **Label:** "· 1 inference" (gray text).
    *   **Pill Button:** "+ Build a stack". White background, gray border, gray text, rounded pill shape.
*   **Right Side:**
    *   **Primary Pill Button:** "▶ Run". Teal background, white text, rounded pill shape.