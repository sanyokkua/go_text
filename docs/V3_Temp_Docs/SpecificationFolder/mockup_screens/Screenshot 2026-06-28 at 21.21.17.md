Here is the detailed UI specification for the "GoText" application in the History view (Light Mode), based on the provided screenshot.

### 1. Theme and Color Palette
*   **Overall Theme:** Light mode, clean, minimalist (consistent with the first screenshot).
*   **Primary Accent Color:** Teal / Muted Green (approx. `#4A8B8C`). Used for active states, primary borders, and success indicators.
*   **Background Colors:**
    *   Main App Background: Very light gray (approx. `#F3F4F6`).
    *   Panels/Cards (Input/Output boxes, History items): White (`#FFFFFF`) or very light gray (`#F9FAFB`) with subtle borders.
*   **Text Colors:**
    *   Primary Text: Dark gray/Black (approx. `#111827`).
    *   Secondary/Muted Text: Medium gray (approx. `#6B7280`).
    *   Status Colors: Green for success/active, Red/Pink for errors/partial.
*   **Typography:** Sans-serif for UI elements, Monospace for the Input text area.

---

### 2. Layout Structure
The layout has shifted from the previous views. The left navigation sidebar is hidden. The application now consists of:
1.  **Window Title Bar** (macOS native, title: "GoText — history").
2.  **Top Toolbar (Appbar)** containing global controls.
3.  **Main Content Area** split into three columns: Input (left), Output (center), and History Sidebar (right).

---

### 3. Component Details

#### A. Top Toolbar (Appbar)
*   **Background:** White, separated from the main content by a subtle bottom border.
*   **Left Side Controls:**
    *   **Icon Button:** Hamburger menu (three horizontal lines). Teal border, light teal background.
    *   **Brand Logo:** Teal square with a white "G", followed by bold black text "GoText".
    *   **Dropdown Button:** "PROVIDER Ollama". Teal border, light teal background, teal text, dropdown arrow.
    *   **Dropdown Button:** "MODEL llama3.1:8b". Light gray background, dark text, dropdown arrow.
*   **Right Side Controls:**
    *   **Label:** "VIEW" (gray, uppercase, small).
    *   **Segmented Control:** "Preview" (Selected: teal text, white background), "Source" (Unselected: dark text), "Diff" (Unselected: dark text).
    *   **Icon Button:** Clock icon. Teal border, white background.
    *   **Icon Button:** Settings gear. Light gray border, white background.

#### B. Main Content Area (Three-Column Layout)
*   **Background:** Very light gray.

**Column 1: INPUT**
*   **Header:** "INPUT" (gray, uppercase, bold).
*   **Text Area:** Large light gray rounded rectangle. Contains monospace text: "we shipped the new caching layer this week. there were a few isues..."

**Column 2: OUTPUT**
*   **Header:** "OUTPUT · restored" (gray, uppercase, bold).
*   **Text Area:** Large light gray rounded rectangle. Contains rendered sans-serif text: "We shipped the new caching layer this week. A few invalidation issues came up but they're handled."

#### C. Right Sidebar (History Panel)
*   **Background:** White, separated by a vertical border.
*   **Header Row:**
    *   **Title:** "History" (black, bold).
    *   **Badge:** "100 MAX" (gray text, light gray rounded rectangle background).
    *   **Action Link:** "Clear" (gray text, right-aligned).
*   **History List (Cards):**
    *   **Item 1 (Active/Restored):**
        *   **Style:** Teal border, light teal background (`#F0FDF4` approx).
        *   **Title Row:** "✓ Basic proofreading" (black, bold).
        *   **Badge:** "1 INF" (green text, light green background, rounded rectangle).
        *   **Preview Text:** "we shipped the new caching... → We shipped the new..." (gray text).
        *   **Footer:** "2m ago · success · ↺ restore · 🗑" (gray text and icons).
    *   **Item 2 (Inactive):**
        *   **Style:** White background, light gray border.
        *   **Title Row:** "📨 Message for Manager" (black, bold).
        *   **Badge:** "2 INF" (gray text, light gray background, rounded rectangle).
        *   **Preview Text:** "hey team the caching... → Hi team — the caching..." (gray text).
        *   **Footer:** "14m ago · stack · success" (gray text).
    *   **Item 3 (Inactive/Error):**
        *   **Style:** White background, light gray border.
        *   **Title Row:** "Translate" (black, bold).
        *   **Badge:** "PARTIAL" (red text, light red/pink background, rounded rectangle).
        *   **Preview Text:** "EN→UK · step 1 failed (429)" (gray text).
        *   **Footer:** "1h ago · partial · ↺ restore" (gray text).