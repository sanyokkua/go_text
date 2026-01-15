# Developer Guide

> Practical guide for developing, building, and extending the Text Processing Suite.

---

## Table of Contents

- [Installation & Setup](#installation--setup)
    - [Prerequisites](#prerequisites)
    - [Installing Wails](#installing-wails)
    - [Platform-Specific Requirements](#platform-specific-requirements)
- [Running the Application](#running-the-application)
- [Development Workflow](#development-workflow)
- [Working with Prompts](#working-with-prompts)
    - [Adding a New Prompt](#adding-a-new-prompt-to-existing-category)
    - [Adding a New Prompt Group](#adding-a-new-prompt-group)
    - [Prompt Template Syntax](#prompt-template-syntax)
- [Working with Providers](#working-with-providers)
    - [Adding a New Provider](#adding-a-new-provider)
    - [Communication Flow](#communication-flow)
- [Dependency Injection](#dependency-injection-di)
- [Debugging & Troubleshooting](#debugging--troubleshooting)

---

## Installation & Setup

### Prerequisites

- **Go**: v1.25 or later
- **Node.js**: v20 or later (npm v10+)
- **Git**: For version control

### Installing Wails

Install the Wails CLI globally:

```bash
go install github.com/wailsapp/wails/v2/cmd/wails@latest
```

Verify installation:

```bash
wails doctor
```

### Platform-Specific Requirements

> [!NOTE]
> Detailed build steps can be found in `.github/workflows/main.yml`.

#### macOS

- Xcode Command Line Tools (`xcode-select --install`)
- No extra dependencies for standard build.

#### Linux (Debian/Ubuntu)

You need the GTK3 and WebKit2GTK development headers:

```bash
sudo apt-get update
sudo apt-get install build-essential libgtk-3-dev libwebkit2gtk-4.1-dev
```

#### Windows

- C++ Build Tools (via Visual Studio Installer)
- WebView2 Runtime (usually pre-installed on Windows 10/11)

---

## Running the Application

### Development Mode (Hot Reload)

This is the standard mode for coding. It rebuilds the backend on Go file changes and HMRs the frontend on JS/CSS changes.

```bash
# In project root
wails dev
```

- **Backend**: Compiles and runs.
- **Frontend**: Starts Vite dev server on a random port (e.g., `http://localhost:34115`).
- **Debugger**: Open web inspector by right-clicking inside the app window.

### Production Build

Produces a single optimized executable/bundle.

```bash
wails build
```

The output will be in `build/bin/`.

---

## Working with Prompts

The prompt system is the core of the application. Prompts are defined in Go code to ensure they are compiled into the binary (not loaded from external
files for security/integrity).

**Location**: `internal/prompts/`

### Adding a New Prompt to Existing Category

Let's say you want to add a "Pirate Speak" style to the **Rewriting (Tone)** category.

1. **Locate the Category File**
   Open `internal/prompts/categories/rewriting_tone.go`.

2. **Define the Constant**
   Add your prompt text constant. Use `{{user_text}}` and `{{user_format}}` placeholders.

   ```go
   const UserPromptPirateSpeak = `
   Task: Rewrite text like a pirate
   Instructions:
   - Use pirate slang (Ahoy, Matey, Yarr)
   - Be enthusiastic but intelligible

   Text:
   {{user_text}}

   Format: {{user_format}}
   `
   const UserPromptPirateSpeakDescription = "Rewrites text in a fun pirate voice"
   ```

3. **Add to Prompt Map**
   Find the `PromptGroupRewritingTone` map in `internal/prompts/constants.go` (or in the category file if refactored) and add the new entry:

   ```go
   // internal/prompts/constants.go

   // In PromptGroupRewritingTone...
   Prompts: map[string]Prompt{
       // ... existing prompts ...
       "pirate": {
           ID:          "pirate",
           Name:        "Pirate Speak",
           Type:        PromptTypeUser,
           Category:    categories.PromptGroupRewritingTone,
           Value:       categories.UserPromptPirateSpeak,
           Description: categories.UserPromptPirateSpeakDescription,
       },
   },
   ```

4. **Restart App**: Since this is compiled Go code, you must stop and restart `wails dev`.

### Adding a New Prompt Group

1. **Create Category File**
   Create `internal/prompts/categories/my_new_category.go`.

   Define your **System Prompt** and **Group Name** constants there.

2. **Register in `internal/prompts/constants.go`**
   Add a new entry to `ApplicationPrompts.PromptGroups`:

   ```go
   categories.MyNewCategoryName: {
       GroupID:      "v2_011", // Unique ID
       GroupName:    categories.MyNewCategoryName,
       SystemPrompt: Prompt{ ... },
       Prompts: map[string]Prompt{
            // Add your user prompts here
       },
   },
   ```

### Prompt Template Syntax

| Placeholder           | Replaced With                                              |
|-----------------------|------------------------------------------------------------|
| `{{user_text}}`       | The text selected/entered by the user                      |
| `{{user_format}}`     | Output format instructions (e.g. "Markdown", "Plain Text") |
| `{{input_language}}`  | Name of the detected/selected source language              |
| `{{output_language}}` | Name of the target language (for translation)              |

---

## Working with Providers

The app connects to LLMs via standard HTTP protocols (mostly OpenAI-compatible).

### Adding a New Provider

#### Built-in Defaults

To add a provider that ships with the app (e.g., adding "Claude" support):

1. **Edit `internal/settings/constants.go`**:
   Add a new `ProviderConfig` to `DefaultSettings`.

2. **Edit `internal/settings/settings.go`**:
   If specific validation logic is needed, update `ProviderType` enum.

#### User-Added Providers

Users can add compatible providers (e.g., a local vLLM server) directly via the **Settings UI**. No code changes are needed for standard
OpenAI-compatible endpoints.

### Communication Flow

1. **Frontend**: Calls `ActionHandler.ProcessPrompt`.
2. **ActionService**:
    - Retrieves Settings & Prompt.
    - Constructs the final prompt string.
    - Calls `LLMService`.
3. **LLMService**:
    - Creates a `resty` client request.
    - Sets headers (Authorization: Bearer ...).
    - Sends POST to `[BaseURL]/[CompletionEndpoint]`.
    - Returns raw text response.
4. **ActionService**: Sanitizes output (removes `<think>` blocks).
5. **Frontend**: Receives strings and updates Redux state.

---

## Dependency Injection (DI)

The app uses a manual Dependency Injection pattern centred around `ApplicationContextHolder`.

**File**: `internal/application/application.go`

### Structure

The `ApplicationContextHolder` struct holds references to all singleton services:

```go
type ApplicationContextHolder struct {
ctx             context.Context
SettingsHandler settings.SettingsHandlerAPI
ActionHandler   actions.ActionHandlerAPI
// ...
}
```

### Adding a Service

If you create a new package (e.g., `internal/history`):

1. **Define Interface**: Create `HistoryServiceAPI` in `internal/history/service.go`.
2. **Implement**: Create `HistoryService` struct.
3. **Update Context Holder**: Add `HistoryService HistoryServiceAPI` to `ApplicationContextHolder` struct.
4. **Wire it up**: In `NewApplicationContextHolder` (in `application.go`):

   ```go
   func NewApplicationContextHolder(...) *ApplicationContextHolder {
       // ... existing services
       historyService := history.NewHistoryService(logger)

       return &ApplicationContextHolder{
           HistoryService: historyService,
           // ...
       }
   }
   ```

---

## Debugging & Troubleshooting

### 1. View Logs

The app uses a custom logger wrapping `zerolog`.

- **Console**: In `wails dev`, backend logs appear in your terminal. Frontend logs appear in the Browser Console (Inspect Element).
- **Log Files**:
    - macOS: `~/Library/Logs/TextProcessingSuite/` (or similar, depending on OS config).

### 2. Provider Issues

If an LLM call fails:

- Check the **Network Tab** in the Web Inspector to see if the frontend sent the request to Wails.
- Check the **Terminal Output** for backend errors (e.g., "Connection refused", "401 Unauthorized").
- Use **Settings -> Test Connection** in the UI to isolate network issues.
- Verify `RESTY_DEBUG=true` environment variable can theoretically be used if enabled in `NewRestyClient` (check `main.go`).

### 3. Frontend State

The frontend uses **Redux Toolkit**.

- Install the **Redux DevTools** Chrome extension.
- Open the application window inspector.
- Go to the Redux tab to see every action (`actions/processPrompt/pending`, `settings/updateProviderConfig`, etc.) and the state change.

### 4. Wails Build Issues

- **"Bindings not generated"**: Run `wails generate module` manually.
- **"Context missing"**: Ensure `app.SetContext(ctx)` is called in `OnStartup` in `main.go`.
