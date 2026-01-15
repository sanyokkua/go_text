# Text Processing Suite - Architecture Documentation

## Table of Contents

1. [Overview](#overview)
2. [Technology Stack](#technology-stack)
3. [Architecture Overview](#architecture-overview)
4. [Directory Structure](#directory-structure)
5. [Backend Architecture](#backend-architecture)
6. [Frontend Architecture](#frontend-architecture)
7. [Data Flow](#data-flow)
8. [How to Add New Features](#how-to-add-new-features)
9. [Configuration Management](#configuration-management)
10. [Testing](#testing)

---

## Overview

Text Processing Suite is a native desktop application built with **Wails v2** that combines a **Go backend** with a **React frontend**. The
application processes text using Large Language Models (LLMs) through OpenAI-compatible APIs, supporting operations like proofreading, formatting,
translation, summarization, and transforming.

The application supports **5 main text processing categories**:

- **Proofreading**: Proofread, rewrite, and adjust tone (8 prompts)
- **Formatting**: Format text for different contexts like emails, chat, social media (7 prompts)
- **Translation**: Translate between languages with dictionary support (2 prompts)
- **Summarization**: Summarize, extract key points, generate hashtags, explain text (4 prompts)
- **Transforming**: Convert text into structured formats like user stories (1 prompt)

### Key Characteristics

- **Native Desktop App**: Built with Wails v2, delivering a native desktop experience
- **Cross-Platform**: Go + React stack ensures compatibility across macOS, Windows, and Linux
- **LLM-Agnostic**: Works with any OpenAI-compatible API (Ollama, LM Studio, OpenRouter, etc.)
- **Statically Compiled**: All prompts and categories are compiled into the binary
- **Settings-Driven**: User configuration stored in platform-specific locations

---

## Technology Stack

### Backend (Go)

- **Go**: 1.25+
- **Wails**: v2.11.0 - Framework for building desktop apps
- **Resty**: v3 - HTTP client for API requests
- **Testify**: Testing framework

### Frontend (React)

- **React**: 19+ - UI framework
- **Redux Toolkit**: State management
- **TypeScript**: Type-safe development
- **Vite**: Build tool and dev server
- **SCSS**: Styling

### Build & Development

- **Wails CLI**: Application bundling and development
- **Node.js & npm**: Frontend dependency management

---

## Architecture Overview

The application follows a **layered architecture** pattern:

```
┌─────────────────────────────────────────────────┐
│              React Frontend (UI)                │
│  ┌───────────────────────────────────────────┐  │
│  │  Components (widgets/)                    │  │
│  │  Redux Store (state management)           │  │
│  │  Wails bindings (Go ↔ JS bridge)         │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
                       ↕ Wails Runtime
┌─────────────────────────────────────────────────┐
│              Go Backend (API Layer)             │
│  ┌───────────────────────────────────────────┐  │
│  │  UI APIs (ActionApi, StateApi,           │  │
│  │           SettingsApi)                    │  │
│  └───────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────┐  │
│  │  Core Services                            │  │
│  │  - PromptService                          │  │
│  │  - SettingsService                        │  │
│  │  - LLMService                             │  │
│  │  - HTTPClient                             │  │
│  │  - UtilsService                           │  │
│  └───────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────┐  │
│  │  Data & Constants                         │  │
│  │  - Models (structs)                       │  │
│  │  - Prompts (constants)                    │  │
│  │  - Categories                             │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
                       ↕ HTTP
┌─────────────────────────────────────────────────┐
│          External LLM Provider APIs             │
│  (Ollama, LM Studio, OpenRouter, etc.)          │
└─────────────────────────────────────────────────┘
```

---

## Directory Structure

```
go_text/
├── main.go                      # Application entry point
├── app.go                       # Wails app initialization
├── wails.json                   # Wails configuration
├── go.mod                       # Go dependencies
│
├── internal/                    # Backend code (private)
│   ├── app_context.go          # Dependency injection container
│   └── backend/
│       ├── constants/          # Constants and prompts
│       │   ├── constatns.go    # Category constants, defaults
│       │   ├── prompts.go      # Prompt access functions
│       │   └── private.go      # ALL prompt definitions (system & user)
│       ├── models/             # Data structures
│       │   └── models.go       # All model definitions
│       └── core/               # Core business logic
│           ├── prompt/         # Prompt management service
│           │   └── prompt.go
│           ├── settings/       # Settings management service
│           │   └── ...
│           ├── llm_client/     # LLM communication service
│           │   └── ...
│           ├── http_client/    # HTTP client wrapper
│           │   └── ...
│           ├── utils/          # Utility functions
│           │   ├── file_utils/ # Settings file I/O
│           │   ├── http_utils/ # HTTP helpers
│           │   └── ...
│           └── ui/             # UI-facing APIs (Wails bindings)
│               ├── action_api.go    # ProcessAction
│               ├── state_api.go     # Get prompts, languages, models
│               └── settings_api.go  # Settings CRUD + validation
│
└── build/                       # Build assets (icons, configs)
```

---

## Backend Architecture

### Core Services

The backend is organized into **services** following a **separation of concerns** pattern:

#### 1. **PromptService** (`internal/backend/core/prompt/`)

**Responsibility**: Manage access to prompt templates

**Key Methods**:

- `GetUserPromptsForCategory(category string)` - Returns all user prompts for a category
- `GetPrompt(promptId string)` - Returns a specific prompt by ID
- `GetSystemPrompt(category string)` - Returns the system prompt for a category

**Data Source**: Reads from constants defined in `internal/backend/constants/private.go`

**Prompt System Details**:

The application uses a sophisticated prompt management system:

- **Categories**: 5 main categories
    1. **Proofreading** - Proofread, rewrite, and adjust tone (formal, casual, friendly, direct, indirect)
    2. **Formatting** - Format text for emails, chat messages, social media, wikis, documents
    3. **Translation** - Translate between languages, create dictionary-style translations
    4. **Summarization** - Summarize text, extract key points, generate hashtags, explain complex text
    5. **Transforming** - Transform text into structured formats (e.g., user stories for development)
- **Prompt Types**: System prompts (one per category) and User prompts (multiple per category)
- **Storage**: All prompts defined as Go constants in `internal/backend/constants/private.go`
- **Template System**: Placeholders like `{{user_text}}`, `{{user_format}}`, `{{input_language}}`, `{{output_language}}`
- **Organization**:
    - `systemPromptByCategory` map - maps categories to system prompts (5 entries)
    - `userPrompts` map - maps prompt IDs to prompt definitions (22 prompts total)
    - `userPromptsByCategory` map - maps categories to lists of user prompts

#### 2. **SettingsService** (`internal/backend/core/settings/`)

**Responsibility**: Manage application settings (load, save, validate)

**Key Methods**:

- `GetCurrentSettings()` - Returns current settings from file
- `SetSettings(settings)` - Saves settings to file
- `GetDefaultSettings()` - Returns default settings
- `GetModelName()`, `GetLanguages()`, etc.

**Storage**: Platform-specific JSON file

- macOS: `~/Library/Application Support/GoTextProcessing/settings.json`
- Linux: `~/.config/GoTextProcessing/settings.json`
- Windows: `%AppData%\GoTextProcessing\settings.json`

#### 3. **LLMService** (`internal/backend/core/llm_client/`)

**Responsibility**: Communicate with LLM providers

**Key Methods**:

- `GetModelsList()` - Fetches available models from provider
- `GetCompletionResponse(request)` - Sends completion request to LLM

**Dependencies**: Uses HTTPClient to make requests

#### 4. **HTTPClient** (`internal/backend/core/http_client/`)

**Responsibility**: Abstraction over HTTP requests to LLM APIs

**Features**:

- Configurable base URL, headers, timeouts
- Retry logic
- Request/response logging

#### 5. **UtilsService** (`internal/backend/core/utils/`)

**Responsibility**: Shared utility functions

**Key Functions**:

- `BuildPrompt()` - Replace template placeholders in prompts
- `SanitizeReasoningBlock()` - Clean LLM responses
- `IsSettingsValid()` - Validate settings structure
- `MakeLLMModelListRequest()` - Direct HTTP call helper
- `MakeLLMCompletionRequest()` - Direct HTTP call helper

### UI APIs (Wails Bindings)

These are the **only** backend functions accessible from the frontend:

#### 1. **ActionApi** (`internal/backend/core/ui/action_api.go`)

**Purpose**: Process text transformations

**Method**: `ProcessAction(action AppActionObjWrapper) (string, error)`

**Flow**:

1. Validate action ID
2. Fetch prompt definition and system prompt
3. Load settings
4. Validate model availability
5. Build user prompt (replace placeholders)
6. Send request to LLM
7. Sanitize and return response

#### 2. **StateApi** (`internal/backend/core/ui/state_api.go`)

**Purpose**: Provide UI with available options

**Methods**:

- `GetProofreadingItems()` → List of proofreading prompts (8 items)
- `GetFormattingItems()` → List of formatting prompts (7 items)
- `GetTranslatingItems()` → List of translation prompts (2 items)
- `GetSummarizationItems()` → List of summarization prompts (4 items)
- `GetTransformingItems()` → List of transforming prompts (1 item)
- `GetInputLanguages()` → Available input languages
- `GetOutputLanguages()` → Available output languages
- `GetDefaultInputLanguage()` → Default input language
- `GetDefaultOutputLanguage()` → Default output language
- `GetModelsList()` → Available LLM models
- `GetCurrentModel()` → Currently selected model

#### 3. **SettingsApi** (`internal/backend/core/ui/settings_api.go`)

**Purpose**: Manage settings from UI

**Methods**:

- `LoadSettings()` - Load current settings
- `SaveSettings(settings)` - Save settings (with validation)
- `ResetToDefaultSettings()` - Restore defaults
- `ValidateModelsRequest(baseUrl, endpoint, headers)` - Test models endpoint
- `ValidateCompletionRequest(baseUrl, endpoint, modelName, headers)` - Test completion endpoint

### Application Context (Dependency Injection)

`internal/app_context.go` is the **dependency injection container**:

```go
func NewApplicationContext() *ApplicationContext {
    // 1. Create core services
    settingsService := settings.NewSettingsService()
    promptService := prompt.NewPromptService()
    utilsService := utils.NewUtilsService()
    restyClient := http_utils.NewRestyClient()

    // 2. Create composed services
    appHttpClient := http_client.NewAppHttpClient(utilsService, settingsService, restyClient)
    appLlmService := llm_client.NewAppLLMService(appHttpClient, utilsService)

    // 3. Create UI APIs
    actionApi := ui.NewAppUIActionApi(promptService, settingsService, appLlmService, utilsService)
    settingsApi := ui.NewAppUISettingsApi(settingsService, restyClient, utilsService)
    stateApi := ui.NewAppUIStateApi(settingsService, promptService, appLlmService, utilsService)

    // 4. Return context with UI APIs
    return &ApplicationContext{
        ActionApi:   actionApi,
        SettingsApi: settingsApi,
        StateApi:    stateApi,
    }
}
```

This is wired up in `main.go`:

```go
apiContext := internal.NewApplicationContext()
wails.Run(&options.App{
    Bind: []interface{}{
        app,
        apiContext.ActionApi,
        apiContext.SettingsApi,
        apiContext.StateApi,
    },
})
```

---

## Frontend Architecture

### React + Redux Stack

The frontend uses **React 19** with **Redux Toolkit** for state management.

#### Store Structure (`frontend/src/store/`)

```
store/
├── store.ts              # Root store configuration
├── hooks.ts              # Typed Redux hooks
├── app/                  # App state slice
│   ├── appSlice.ts
│   └── appThunks.ts
└── settings/             # Settings state slice
    ├── settingsSlice.ts
    └── settingsThunks.ts
```

**Key State Slices**:

1. **App Slice**: Manages application state
    - Available prompts by category
    - Available languages
    - Available models
    - Current selections
    - Input/output text

2. **Settings Slice**: Manages settings state
    - Current settings
    - Validation status
    - Loading states

#### Component Structure (`frontend/src/widgets/`)

```
widgets/
├── AppMainController.tsx       # Root component
├── base/                       # Reusable base components
│   ├── Button.tsx
│   ├── Select.tsx
│   ├── TextArea.tsx
│   └── ...
├── tabs/                       # Tab navigation
│   └── TabButtons.tsx
├── text/                       # Text processing widgets
│   ├── InputWidget.tsx
│   ├── OutputWidget.tsx
│   └── ...
└── views/                      # Main view components
    ├── ProofreadingView.tsx
    ├── FormattingView.tsx
    ├── TranslationView.tsx
    ├── SummarizationView.tsx
    ├── SettingsView.tsx
    └── ...
```

### Wails Bindings

The frontend calls Go backend methods through **Wails-generated bindings**:

```typescript
// Auto-generated bindings in frontend/wailsjs/
import { ProcessAction } from '../wailsjs/go/ui/AppUIActionApi';
import { GetProofreadingItems } from '../wailsjs/go/ui/AppUIStateApi';
import { LoadSettings } from '../wailsjs/go/ui/AppUISettingsApi';

// Example usage in Redux thunk
export const processText = createAsyncThunk(
    'app/processText',
    async (action: AppActionObjWrapper) => {
        const result = await ProcessAction(action);
        return result;
    }
);
```

---

## Data Flow

### 1. Application Startup

```
User launches app
    ↓
main.go initializes Wails
    ↓
app.startup() called
    ↓
InitDefaultSettingsIfAbsent() creates settings file if missing
    ↓
ApplicationContext created with all services and UI APIs
    ↓
Frontend renders with React/Redux
    ↓
Frontend loads initial state (prompts, languages, settings)
    ↓
User sees initial UI
```

### 2. Text Processing Flow

```
User enters text and selects action (e.g., "Proofread")
    ↓
Frontend calls ActionApi.ProcessAction(action)
    ↓
Backend: ActionApi.ProcessAction()
    ├─ Get prompt definition by ID
    ├─ Get system prompt for category
    ├─ Load current settings
    ├─ Validate model availability
    ├─ Build user prompt (replace {{user_text}}, {{user_format}}, etc.)
    ├─ Create ChatCompletionRequest
    ├─ Call LLMService.GetCompletionResponse()
    │   ├─ HTTPClient makes request to LLM provider
    │   └─ Returns response
    ├─ Sanitize response (remove reasoning blocks, markdown wrappers)
    └─ Return result to frontend
    ↓
Frontend displays processed text
```

### 3. Settings Update Flow

```
User changes settings in UI
    ↓
Frontend calls SettingsApi.SaveSettings(newSettings)
    ↓
Backend: SettingsApi.SaveSettings()
    ├─ Normalize settings (trim, add slashes, etc.)
    ├─ Validate settings structure
    ├─ Validate connection to LLM provider
    ├─ Call SettingsService.SetSettings()
    │   └─ Write settings.json to disk
    └─ Return success/error
    ↓
Frontend reloads settings and updates UI
```

---

## How to Add New Features

### Adding a New Prompt to an Existing Category

**Example**: Add a "Rewrite for Technical Audience" prompt to Proofreading category

#### Step 1: Define the prompt constant

Edit `internal/backend/constants/private.go`:

```go
// Add the prompt text constant (around line 300-800)
const userRewritingTechnicalStyle string = `
Task: Technical Style Rewriting

Task Instructions:
- Produce a technical, precise rewrite using domain-specific terminology.
- Use formal language and avoid colloquialisms.
- Preserve all technical accuracy, data, and figures.
- ...

Text to process:
<<<UserText Start>>>
{{user_text}}
<<<UserText End>>>

Format: {{user_format}}
- Return ONLY the rewritten text in {{user_format}}.
`

// Add the prompt variable (around line 1140-1170)
var rewriteTechnical = models.Prompt{
    ID:       "rewriteTechnical",
    Name:     "Technical Style",
    Type:     PromptTypeUser,
    Category: PromptCategoryProofread,
    Value:    userRewritingTechnicalStyle,
}
```

#### Step 2: Register the prompt

Still in `private.go`:

```go
// Add to userPrompts map (around line 1181)
var userPrompts = map[string]models.Prompt{
    // ... existing prompts ...
    "rewriteTechnical": rewriteTechnical,  // ADD THIS LINE
}

// Add to proofreadingPrompts slice (around line 1205)
var proofreadingPrompts = []models.Prompt{
    // ... existing prompts ...
    rewriteTechnical,  // ADD THIS LINE
}
```

#### Step 3: Rebuild and test

```bash
# Rebuild the application
wails build

# Or run in development mode
wails dev
```

The new prompt will now appear in the Proofreading dropdown in the UI.

---

### Adding a New Category

**Example**: Add a "Code Review" category

#### Step 1: Define the category constant

Edit `internal/backend/constants/constatns.go`:

```go
const (
    // ... existing categories ...
    PromptCategoryCodeReview = "CodeReview"  // ADD THIS
)
```

#### Step 2: Create system and user prompts

Edit `internal/backend/constants/private.go`:

```go
// Add system prompt constant
const systemPromptCodeReview string = `
Your Role: Code Review Engine — expert software engineer reviewing code...
...
`

// Add user prompt constants
const userCodeReviewGeneral string = `
Task: Code Review

Task Instructions:
- Review the provided code for bugs, security issues, performance...
...

Text to process:
<<<UserText Start>>>
{{user_text}}
<<<UserText End>>>

Format: {{user_format}}
`

// Add prompt variables
var systemCodeReview = models.Prompt{
    ID:       "systemCodeReview",
    Name:     "System Code Review",
    Type:     PromptTypeSystem,
    Category: PromptCategoryCodeReview,
    Value:    systemPromptCodeReview,
}

var codeReviewGeneral = models.Prompt{
    ID:       "codeReviewGeneral",
    Name:     "General Code Review",
    Type:     PromptTypeUser,
    Category: PromptCategoryCodeReview,
    Value:    userCodeReviewGeneral,
}
```

#### Step 3: Register the category and prompts

Still in `private.go`:

```go
// Add to systemPromptByCategory (around line 1174)
var systemPromptByCategory = map[string]models.Prompt{
    // ... existing ...
    PromptCategoryCodeReview: systemCodeReview,  // ADD THIS
}

// Add to userPrompts (around line 1181)
var userPrompts = map[string]models.Prompt{
    // ... existing ...
    "codeReviewGeneral": codeReviewGeneral,  // ADD THIS
}

// Create category-specific slice
var codeReviewPrompts = []models.Prompt{
    codeReviewGeneral,
}

// Add to userPromptsByCategory (around line 1238)
var userPromptsByCategory = map[string][]models.Prompt{
    // ... existing ...
    PromptCategoryCodeReview: codeReviewPrompts,  // ADD THIS
}
```

#### Step 4: Add StateApi method

Edit `internal/backend/core/ui/state_api.go`:

```go
// Add interface method
type AppUIStateApi interface {
    // ... existing methods ...
    GetCodeReviewItems() ([]models.AppActionItem, error)  // ADD THIS
}

// Add implementation
func (a *appUIStateApiStruct) GetCodeReviewItems() ([]models.AppActionItem, error) {
    return a.getItems(constants.PromptCategoryCodeReview)
}
```

#### Step 5: Add frontend support

1. **Add Redux action** in `frontend/src/store/app/appThunks.ts`:

```typescript
export const loadCodeReviewItems = createAsyncThunk(
    'app/loadCodeReviewItems',
    async () => {
        const items = await GetCodeReviewItems();
        return items;
    }
);
```

2. **Add reducer case** in `frontend/src/store/app/appSlice.ts`:

```typescript
extraReducers: (builder) => {
    builder.addCase(loadCodeReviewItems.fulfilled, (state, action) => {
        state.codeReviewItems = action.payload;
    });
}
```

3. **Create view component** `frontend/src/widgets/views/CodeReviewView.tsx`:

```typescript
import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { loadCodeReviewItems } from '../../store/app/appThunks';

export const CodeReviewView: React.FC = () => {
    const dispatch = useAppDispatch();
    const items = useAppSelector(state => state.app.codeReviewItems);

    useEffect(() => {
        dispatch(loadCodeReviewItems());
    }, [dispatch]);

    return (
        <div>
            {/* Your UI here */}
        </div>
    );
};
```

4. **Add tab** to main controller

#### Step 6: Rebuild

```bash
wails build
```

---

### Modifying Existing Prompts

**Location**: `internal/backend/constants/private.go`

1. Find the prompt constant (e.g., `userProofreadingBase`)
2. Edit the prompt text
3. Rebuild the application

**Important**: Prompt changes require a full rebuild since they're compiled into the binary.

---

## Configuration Management

### Settings Structure

```go
type Settings struct {
    BaseUrl               string            // LLM provider base URL
    ModelsEndpoint        string            // Endpoint to fetch models
    CompletionEndpoint    string            // Endpoint for completions
    Headers               map[string]string // HTTP headers (e.g., API key)
    ModelName             string            // Selected model ID
    Temperature           float64           // LLM temperature (0-1)
    DefaultInputLanguage  string            // Default input language
    DefaultOutputLanguage string            // Default output language
    Languages             []string          // Available languages
    UseMarkdownForOutput  bool              // Format output as Markdown
}
```

### Default Settings

Defined in `internal/backend/constants/constatns.go`:

```go
var DefaultSetting = models.Settings{
    BaseUrl:               "http://localhost:11434",  // Ollama default
    ModelsEndpoint:        "/v1/models",
    CompletionEndpoint:    "/v1/chat/completions",
    Headers:               map[string]string{},
    ModelName:             "",
    Temperature:           0.5,
    DefaultInputLanguage:  "English",
    DefaultOutputLanguage: "Ukrainian",
    Languages:             languages[:],
    UseMarkdownForOutput:  false,
}
```

### Supported Languages

Defined in `internal/backend/constants/constatns.go`:

```go
var languages = [15]string{
    "Chinese", "Croatian", "Czech", "English", "French",
    "German", "Hindi", "Italian", "Korean", "Polish",
    "Portuguese", "Russian", "Serbian", "Spanish", "Ukrainian",
}
```

To add a new language, simply add it to this array.

---

## Template Placeholders

Prompts use the following placeholders that are replaced at runtime:

| Placeholder           | Replaced With                         | Used In             |
|-----------------------|---------------------------------------|---------------------|
| `{{user_text}}`       | User input text                       | All prompts         |
| `{{user_format}}`     | Output format (PlainText or Markdown) | All prompts         |
| `{{input_language}}`  | Input language name                   | Translation prompts |
| `{{output_language}}` | Output language name                  | Translation prompts |

Replacement logic is in `internal/backend/core/utils/` (BuildPrompt function).

---

## Testing

### Backend Tests

Tests are written using `testify` and located alongside the code being tested.

**Run tests**:

```bash
go test ./...
```

### Frontend Tests

The project uses the standard React testing setup (details depend on implementation).

**Run tests**:

```bash
cd frontend
npm test
```

### Manual Testing

1. **Development mode** (hot reload):

```bash
wails dev
```

2. **Production build**:

```bash
wails build
```

3. Test different LLM providers by changing settings in the UI.

---

## Common Development Tasks

### Changing Default Settings

Edit `internal/backend/constants/constatns.go`:

```go
var DefaultSetting = models.Settings{
    BaseUrl: "http://localhost:1234",  // Change to LM Studio
    // ... other settings ...
}
```

### Adding a New Language

Edit `internal/backend/constants/constatns.go`:

```go
var languages = [16]string{  // Increase size
    // ... existing languages ...
    "Japanese",  // Add new language
}
```

### Changing App Metadata

Edit `wails.json`:

```json
{
  "name": "TextProcessingSuite",
  "outputfilename": "TextProcessingSuite",
  "author": {
    "name": "Your Name",
    "email": "your@email.com"
  }
}
```

Edit `main.go`:

```go
wails.Run(&options.App{
    Title:  "Your New Title",
    Width:  900,  // Change dimensions
    Height: 600,
    // ...
})
```

### Building for Different Platforms

```bash
# Build for current platform
wails build

# Build for specific platform (cross-compilation may have limitations)
wails build -platform darwin/universal   # macOS universal binary
wails build -platform windows/amd64      # Windows 64-bit
wails build -platform linux/amd64        # Linux 64-bit
```

---

## Best Practices

### 1. Prompt Design

- **Be Specific**: Clearly define what the LLM should do
- **Use Markers**: Use `<<<UserText Start>>>` and `<<<UserText End>>>` to separate user input
- **Template Placeholders**: Always use `{{user_text}}`, `{{user_format}}`, etc.
- **Safety Instructions**: Include instructions to ignore prompt injection
- **Output Format**: Specify exactly what the output should look like

### 2. Error Handling

- Always check `err != nil` in Go
- Return meaningful error messages
- Validate user input before processing

### 3. Settings Validation

- Validate settings before saving
- Test LLM connection before allowing save
- Provide clear error messages to users

### 4. Frontend State Management

- Use Redux for shared state
- Use component state for local UI state
- Dispatch thunks for async operations

---

## Troubleshooting

### Issue: Prompts not updating after edit

**Cause**: Prompts are compiled into the binary

**Solution**: Rebuild the application with `wails build` or restart `wails dev`

### Issue: Settings not persisting

**Cause**: Settings file path may be incorrect or permissions issue

**Solution**: Check the settings file location (see Configuration Management section) and ensure write permissions

### Issue: LLM connection fails

**Cause**: Incorrect base URL, endpoint, or headers

**Solution**:

- Verify the LLM provider is running
- Use the "Test Connection" buttons in the Settings UI
- Check headers for API key if required

### Issue: Model not found

**Cause**: Selected model is not available in the provider

**Solution**: Use the "Refresh Models" button in Settings to reload the available models list

---

## Conclusion

This architecture documentation provides a comprehensive guide to understanding and modifying the Text Processing Suite application. The key
takeaways:

1. **Wails v2** bridges Go backend and React frontend
2. **Prompts** are stored as constants in `private.go`
3. **Categories** are defined by constants and mapped to prompts
4. **UI APIs** (ActionApi, StateApi, SettingsApi) are the only frontend-accessible backend methods
5. **Settings** are stored in platform-specific JSON files
6. **Adding features** requires editing prompts, registering them, and potentially adding UI components

For questions or contributions, refer to the main README.md or contact the maintainer.
