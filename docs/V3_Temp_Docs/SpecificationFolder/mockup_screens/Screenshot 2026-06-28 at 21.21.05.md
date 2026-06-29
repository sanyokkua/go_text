Here is the detailed UI specification for the "GoText" application in Dark Mode, based on the provided screenshot.

### 1. Theme and Color Palette
*   **Overall Theme:** Dark mode, high contrast, modern.
*   **Primary Accent Color:** Teal / Muted Green (approx. `#4A8B8C` or `#5C9E9E`). Used for active states, primary buttons, and selected borders.
*   **Background Colors:**
    *   Main App Background: Very dark gray/almost black (approx. `#111827` or `#0F172A`).
    *   Panels/Cards (Sidebar items, Input/Output boxes, Dropdowns): Slightly lighter dark gray (approx. `#1F2937` or `#1E293B`).
    *   Selected/Active Button Backgrounds: Darker teal-tinted gray or pure dark gray with teal borders.
*   **Text Colors:**
    *   Primary Text: White or very light gray (approx. `#F9FAFB`).
    *   Secondary/Muted Text: Medium gray (approx. `#9CA3AF`).
    *   Accent Text: Teal (matches primary accent).
*   **Typography:** Sans-serif for UI elements, Monospace for the Input text area.

---

### 2. Layout Structure
The application maintains the same desktop window layout:
1.  **Window Title Bar** (macOS native).
2.  **Top Toolbar (Appbar)** containing global controls.
3.  **Left Sidebar** for navigation and settings.
4.  **Main Content Area** split into two columns (Input and Output).
5.  **Bottom Action Bar** for execution controls.

---

### 3. Component Details

#### A. Top Toolbar (Appbar)
*   **Background:** Dark gray, separated from the main content by a subtle bottom border.
*   **Row 1 (Main Controls):**
    *   **Icon Button:** Hamburger menu (three horizontal lines). Teal border, dark background.
    *   **Brand Logo:** Teal square with a white "G", followed by bold white text "GoText".
    *   **Dropdown Button:** "PROVIDER Ollama". Teal border, teal text, dark background, dropdown arrow.
    *   **Dropdown Button:** "MODEL llama3.1:8b". Dark gray background, white text, dropdown arrow.
    *   **Dropdown Button:** "LANG EN → UK". Dark gray background, white text, dropdown arrow.
    *   **Label:** "FORMAT" (gray, uppercase, small).
    *   **Toggle Buttons:** "Plain" (white text) and "MD" (teal text, dark background).
    *   **Label:** "VIEW" (gray, uppercase, small).
    *   **Segmented Control:** "Preview" (Selected: teal text, dark background), "Source" (Unselected: white text), "Diff" (Unselected: white text).
    *   **Icon Buttons:** Grid icon (teal, dark background), List icon (white), Clock icon (white), Settings gear icon (white).
*   **Row 2:** (Removed in this version; settings moved to the top right).

#### B. Left Sidebar
*   **Background:** Dark gray, separated by a vertical border.
*   **Search Input:** Rounded rectangle, dark gray background. Placeholder text: "search..." with a magnifying glass icon (gray text).
*   **Section Header:** "MY STACKS" (gray, uppercase) and "MANAGE ›" (teal, uppercase, clickable link).
*   **Stack List Items (Cards):**
    *   **Item 1:** Envelope icon, bold white text "Message for Manager". Dark gray background, rounded corners, subtle border.
*   **Section Header:** "ACTIONS · TONE · 8" (gray, uppercase).
*   **Action List Items:**
    *   **Item 1 (Selected):** "✓ Professional". Teal text, teal border, dark background, rounded rectangle.
    *   **Item 2:** "Friendly". Gray text, transparent background.
    *   **Item 3:** "Direct". Gray text, transparent background.

#### C. Main Content Area (Split View)
*   **Background:** Very dark gray.
*   **Left Panel (INPUT):**
    *   **Header:** "INPUT" (gray, uppercase).
    *   **Header Actions:** Copy icon button (clipboard), Close icon button (X). Both dark gray background, white icons.
    *   **Text Area:** Large dark gray rounded rectangle with a subtle border. Contains monospace white text: "hey the caching work is more or less done, had some invalidation issues but theyre sorted..."
*   **Right Panel (OUTPUT):**
    *   **Header:** "OUTPUT" (gray, uppercase).
    *   **Header Actions:** Copy icon button, Refresh icon button, Close icon button (X). All dark gray background, white icons.
    *   **Text Area:** Large dark gray rounded rectangle with a subtle border. Contains rendered sans-serif white text: "The caching work is essentially complete. We encountered a few invalidation issues, which have now been resolved."

#### D. Bottom Action Bar
*   **Background:** Dark gray, separated by a top border.
*   **Left Side:**
    *   **Pill Button:** "✓ Professional". Teal border, teal text, rounded pill shape, dark background.
    *   **Label:** "· 1 inference" (gray text).
    *   **Pill Button:** "+ Build a stack". Gray border, white text, rounded pill shape, dark background.
*   **Right Side:**
    *   **Primary Pill Button:** "▶ Run". Teal background, white text, rounded pill shape.