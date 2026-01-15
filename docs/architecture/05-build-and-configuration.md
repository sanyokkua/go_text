# Build & Configuration

> Build processes, development workflow, configuration management, and dependency overview.

---

## Table of Contents

- [Development Workflow](#development-workflow)
- [Build Process](#build-process)
    - [Development Build](#development-build)
    - [Production Build](#production-build)
    - [Platform-Specific Builds](#platform-specific-builds)
- [Configuration Management](#configuration-management)
    - [Wails Configuration](#wails-configuration)
    - [Application Settings](#application-settings)
    - [Environment Variables](#environment-variables)
- [Dependencies](#dependencies)
    - [Go Dependencies](#go-dependencies)
    - [NPM Dependencies](#npm-dependencies)
- [Build Directory Structure](#build-directory-structure)

---

## Development Workflow

### Prerequisites

| Tool      | Version | Purpose                        |
|-----------|---------|--------------------------------|
| Go        | 1.25+   | Backend compilation            |
| Node.js   | 20+     | Frontend build tools           |
| Wails CLI | 2.x     | Development and build commands |
| npm       | 10+     | Package management             |

### Installing Wails CLI

```bash
go install github.com/wailsapp/wails/v2/cmd/wails@latest
```

### Development Mode

Run the application in development mode with hot-reload:

```bash
# From project root
wails dev
```

This command:

1. Starts the Vite dev server for frontend hot-reload
2. Compiles and runs the Go backend
3. Opens the application window
4. Watches for file changes in both frontend and backend
5. Auto-reloads when changes are detected

**Frontend Dev Server**: Runs on auto-detected port (typically 34115)

### Frontend-Only Development

For faster frontend iteration without backend:

```bash
cd frontend
npm run dev
```

> [!NOTE]
> This runs the frontend in isolation. Wails bindings will not work; mock data or stubs are required.

### Running Tests

```bash
# Go tests
go test ./... -v

# Frontend tests
cd frontend
npm test

# With coverage
npm run test:coverage
```

---

## Build Process

### Development Build

```bash
wails dev
```

**What happens:**

1. **Frontend**: Vite compiles TypeScript/React in development mode
2. **Backend**: Go compiles with `-tags dev` for development features
3. **Bindings**: Wails regenerates TypeScript bindings when Go signatures change
4. **Hot reload**: Both frontend and backend support live reload

### Production Build

```bash
wails build
```

**What happens:**

1. **Frontend**:
    - TypeScript compilation (`tsc`)
    - Vite production build (minification, tree-shaking)
    - Assets embedded in Go binary
2. **Backend**:
    - Go compiles with production optimizations
    - Debug logging disabled
    - Assets embedded via `//go:embed`
3. **Output**: Single executable in `build/bin/`

### Platform-Specific Builds

#### macOS (Darwin)

```bash
# Build for current macOS
wails build

# Cross-compile for macOS arm64 (Apple Silicon)
wails build -platform darwin/arm64

# Cross-compile for macOS amd64 (Intel)
wails build -platform darwin/amd64

# Universal binary (both architectures)
wails build -platform darwin/universal
```

**Output**: `build/bin/TextProcessingSuite.app`

**macOS-specific configuration** in `build/darwin/`:

- `Info.plist` - Application metadata and permissions
- `Info.dev.plist` - Development-specific settings

#### Windows

```bash
# Cross-compile for Windows (from macOS/Linux)
wails build -platform windows/amd64

# Or on Windows
wails build
```

**Output**: `build/bin/TextProcessingSuite.exe`

**Windows-specific configuration** in `build/windows/`:

- `icon.ico` - Application icon
- `wails.exe.manifest` - Windows manifest
- `info.json` - Application metadata (version, copyright)
- `installer/` - NSIS installer scripts

#### Linux

```bash
wails build -platform linux/amd64
```

### Build Flags

| Flag        | Purpose                           |
|-------------|-----------------------------------|
| `-clean`    | Clean build cache before building |
| `-debug`    | Keep debug info in binary         |
| `-devtools` | Include Chrome DevTools           |
| `-upx`      | Compress binary with UPX          |
| `-ldflags`  | Pass flags to Go linker           |
| `-tags`     | Build tags to include             |
| `-o`        | Output filename                   |

**Example with flags:**

```bash
wails build -clean -ldflags="-s -w" -upx
```

---

## Configuration Management

### Wails Configuration

**File**: `wails.json`

```json
{
    "$schema": "https://wails.io/schemas/config.v2.json",
    "name": "TextProcessingSuite",
    "outputfilename": "TextProcessingSuite",
    "frontend:install": "npm install",
    "frontend:build": "npm run build",
    "frontend:dev:watcher": "npm run dev",
    "frontend:dev:serverUrl": "auto",
    "author": {
        "name": "Oleksandr Kostenko",
        "email": "sanyokkua@gmail.com"
    }
}
```

| Field                    | Purpose                                  |
|--------------------------|------------------------------------------|
| `name`                   | Application name                         |
| `outputfilename`         | Binary output name                       |
| `frontend:install`       | Command to install frontend dependencies |
| `frontend:build`         | Command to build frontend for production |
| `frontend:dev:watcher`   | Command to run frontend dev server       |
| `frontend:dev:serverUrl` | Dev server URL (`auto` = auto-detect)    |

### Application Settings

**Storage Location:**

| Platform | Path                                                              |
|----------|-------------------------------------------------------------------|
| macOS    | `~/Library/Application Support/TextProcessingSuite/settings.json` |
| Windows  | `%APPDATA%\TextProcessingSuite\settings.json`                     |
| Linux    | `~/.config/TextProcessingSuite/settings.json`                     |

**Settings Structure:**

```json
{
    "availableProviderConfigs": [
        {
            "providerId": "uuid-here",
            "providerName": "Ollama",
            "providerType": "ollama",
            "baseUrl": "http://127.0.0.1:11434/",
            "modelsEndpoint": "v1/models",
            "completionEndpoint": "v1/chat/completions",
            "authType": "none",
            "authToken": "",
            "useAuthTokenFromEnv": false,
            "envVarTokenName": "",
            "useCustomHeaders": false,
            "headers": {},
            "useCustomModels": false,
            "customModels": []
        }
    ],
    "currentProviderConfig": {
        /* Same structure */
    },
    "inferenceBaseConfig": {
        "timeout": 60,
        "maxRetries": 3,
        "useMarkdownForOutput": false
    },
    "modelConfig": {
        "name": "",
        "useTemperature": true,
        "temperature": 0.5
    },
    "languageConfig": {
        "languages": [
            "English",
            "Ukrainian",
            "..."
        ],
        "defaultInputLanguage": "English",
        "defaultOutputLanguage": "Ukrainian"
    }
}
```

### Default Providers

The application ships with preconfigured providers:

| Provider   | Base URL                     | Type              | Auth         |
|------------|------------------------------|-------------------|--------------|
| Ollama     | `http://127.0.0.1:11434/`    | Ollama            | None         |
| LM Studio  | `http://127.0.0.1:1234/`     | OpenAI-compatible | None         |
| Llama.cpp  | `http://127.0.0.1:8080/`     | OpenAI-compatible | None         |
| OpenRouter | `https://openrouter.ai/api/` | OpenAI-compatible | Bearer (env) |
| OpenAI     | `https://api.openai.com/`    | OpenAI-compatible | Bearer (env) |

### Environment Variables

The application supports loading API tokens from environment variables:

| Variable             | Provider      | Purpose            |
|----------------------|---------------|--------------------|
| `OPENROUTER_API_KEY` | OpenRouter.ai | API authentication |
| `OPENAI_API_KEY`     | OpenAI        | API authentication |

**How it works:**

```go
// llms/service.go
func (s *LLMService) getAuthToken(provider *settings.ProviderConfig) string {
if provider.UseAuthTokenFromEnv && provider.EnvVarTokenName != "" {
if envToken := os.Getenv(provider.EnvVarTokenName); envToken != "" {
return envToken
}
}
return provider.AuthToken
}
```

> [!CAUTION]
> Never commit API tokens to version control. Use environment variables for sensitive credentials.

---

## Dependencies

### Go Dependencies

**Core Dependencies** (`go.mod`):

| Module                         | Version       | Purpose                          |
|--------------------------------|---------------|----------------------------------|
| `github.com/wailsapp/wails/v2` | v2.11.0       | Desktop framework                |
| `resty.dev/v3`                 | v3.0.0-beta.4 | HTTP client for LLM APIs         |
| `github.com/rs/zerolog`        | v1.34.0       | Structured logging               |
| `github.com/google/uuid`       | v1.6.0        | UUID generation for provider IDs |
| `github.com/stretchr/testify`  | v1.11.1       | Test assertions                  |

**Why these choices:**

- **Wails v2**: Modern, well-maintained Go + Web bridge. Alternatives (Electron, Tauri) were considered but Wails provides native Go experience.
- **Resty v3**: Feature-rich HTTP client with retry, timeout, and request/response hooks. Better ergonomics than `net/http` for API clients.
- **zerolog**: Zero-allocation JSON logger. Chosen for performance and structured output.
- **UUID**: Standard Go UUID library for generating unique provider IDs.

**Indirect Dependencies** (notable):

| Module                         | Purpose             |
|--------------------------------|---------------------|
| `github.com/gorilla/websocket` | WebSocket support   |
| `github.com/labstack/echo/v4`  | Internal dev server |
| `github.com/samber/lo`         | Utility library     |

### NPM Dependencies

**Production Dependencies** (`package.json`):

| Package               | Version | Purpose                    |
|-----------------------|---------|----------------------------|
| `react`               | 19.2.3  | UI library                 |
| `react-dom`           | 19.2.3  | React DOM rendering        |
| `@reduxjs/toolkit`    | 2.11.2  | State management           |
| `react-redux`         | 9.2.0   | React Redux bindings       |
| `@mui/material`       | 7.3.6   | Material Design components |
| `@mui/icons-material` | 7.3.6   | Material icons             |
| `@emotion/react`      | 11.14.0 | CSS-in-JS (MUI peer dep)   |
| `@emotion/styled`     | 11.14.1 | Styled components (MUI)    |
| `@fontsource/roboto`  | 5.2.9   | Roboto font                |
| `uuid`                | 13.0.0  | Frontend UUID generation   |

**Why these choices:**

- **React 19**: Latest React with concurrent features, improved suspense
- **Redux Toolkit**: Standard Redux with less boilerplate, RTK Query capabilities
- **Material-UI 7**: Comprehensive component library with TypeScript support
- **Emotion**: Required by MUI, provides excellent CSS-in-JS performance

**Development Dependencies:**

| Package                | Version | Purpose                     |
|------------------------|---------|-----------------------------|
| `typescript`           | 5.9.3   | Type checking               |
| `vite`                 | 7.3.0   | Build tool                  |
| `@vitejs/plugin-react` | 5.1.2   | React support for Vite      |
| `jest`                 | 30.2.0  | Testing framework           |
| `ts-jest`              | 29.4.6  | TypeScript Jest transformer |
| `eslint`               | 9.39.2  | Code linting                |
| `prettier`             | 3.7.4   | Code formatting             |

---

## Build Directory Structure

```
build/
├── README.md           # Build documentation
├── appicon.png         # Application icon source
│
├── bin/                # Build output directory
│   └── TextProcessingSuite     # (or .app/.exe)
│
├── darwin/             # macOS-specific files
│   ├── Info.plist      # Production app metadata
│   └── Info.dev.plist  # Development app metadata
│
└── windows/            # Windows-specific files
    ├── icon.ico        # Windows icon
    ├── wails.exe.manifest   # Windows manifest
    ├── info.json       # Version info
    └── installer/      # NSIS installer files
```

### macOS Info.plist

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "...">
<plist version="1.0">
    <dict>
        <key>CFBundleName</key>
        <string>TextProcessingSuite</string>
        <key>CFBundleIdentifier</key>
        <string>com.wails.textprocessingsuite</string>
        ...
    </dict>
</plist>
```

### Windows info.json

```json
{
    "fixed": {
        "file_version": "1.0.0.0"
    },
    "info": {
        "CompanyName": "Oleksandr Kostenko",
        "ProductName": "TextProcessingSuite",
        "FileDescription": "Text Processing Suite Application",
        "ProductVersion": "1.0.0",
        ...
    }
}
```

---

## NPM Scripts

| Script          | Command             | Purpose                  |
|-----------------|---------------------|--------------------------|
| `dev`           | `vite`              | Start dev server         |
| `build`         | `tsc && vite build` | Production build         |
| `preview`       | `vite preview`      | Preview production build |
| `test`          | `jest`              | Run tests                |
| `test:watch`    | `jest --watch`      | Tests in watch mode      |
| `test:coverage` | `jest --coverage`   | Tests with coverage      |

---

## Quick Reference

### Development Commands

```bash
# Start development
wails dev

# Run tests
go test ./... -v
cd frontend && npm test

# Check linting
cd frontend && npx eslint src/

# Format code
cd frontend && npx prettier --write src/
```

### Build Commands

```bash
# Production build (current platform)
wails build

# macOS universal
wails build -platform darwin/universal

# Windows (from macOS)
wails build -platform windows/amd64

# Clean and build
wails build -clean
```

### Regenerate Bindings

Bindings are auto-generated when Go handler signatures change. To force regeneration:

```bash
wails generate module
```

---

*Previous: [Data Flow & Communication](./04-data-flow-and-communication.md)*
