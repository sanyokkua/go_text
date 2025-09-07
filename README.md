# Text Processing Suite

## Overview

This is a desktop application for text processing using Large Language Models (LLMs). It provides functionalities for proofreading, style rewriting, formatting, translation, and summarization. Unlike its predecessor, which was focused on local LLMs, this application is designed to work with any LLM provider that offers an OpenAI-compatible API. This includes local servers like Ollama and LM Studio, as well as cloud-based services like OpenRouter.

The application is built with Go for the backend and React for the frontend, using the Wails framework to create a native desktop experience. This architecture aims to provide efficient performance and a smaller distribution footprint.

## Key Features

*   **Text Processing**
    *   Proofreading and grammar correction.
    *   Style transformation (e.g., formal, casual, friendly, direct).
    *   Text formatting for various contexts (emails, chat messages, social media posts, wiki markdown, etc.).
*   **Translation**
    *   Bidirectional translation between supported languages.
    *   Dictionary-style translations.
*   **Summarization**
    *   Generate a concise summary of the input text.
    *   Extract a list of key points.
    *   Generate relevant hashtags.

## Configuration

The application's behavior is controlled through a settings file. The core settings define how the application connects to an LLM provider.

### Settings Structure

The `Settings` struct defines the configurable parameters:

*   `baseUrl`: The root URL of the LLM provider's API (e.g., `http://localhost:11434` for Ollama, or a cloud provider's endpoint).
*   `modelsEndpoint`: The relative path to fetch the list of available models (e.g., `/v1/models`).
*   `completionEndpoint`: The relative path to send chat completion requests (e.g., `/v1/chat/completions`).
*   `headers`: A map of key-value pairs for HTTP headers, used for authentication/authorization (e.g., API keys).
*   `modelName`: The ID of the specific LLM to use for processing.
*   `temperature`: A value between 0 and 1 controlling the randomness of the model's output.
*   `defaultInputLanguage` / `defaultOutputLanguage`: The default languages for translation tasks.
*   `languages`: A list of supported languages for the UI.
*   `useMarkdownForOutput`: A boolean flag to determine if the output should be formatted as Markdown.

The application includes a built-in validator (`IsSettingsValid`) to ensure settings are correctly formatted before use (e.g., URLs must have `http://` or `https://` prefixes, endpoints must start with `/`).

### Settings File Location

The application follows platform-specific conventions for storing its configuration file:

*   **Unix/Linux (including macOS)**: Uses the `$XDG_CONFIG_HOME` environment variable if set and non-empty. If not, it defaults to `$HOME/.config`. The specific file path would be `$XDG_CONFIG_HOME/GoTextProcessing/settings.json` or `$HOME/.config/GoTextProcessing/settings.json`.
*   **macOS (Darwin)**: If XDG directories are not applicable, it falls back to `$HOME/Library/Application Support/GoTextProcessing/settings.json`.
*   **Windows**: Uses the `%AppData%` environment variable, resulting in a path like `%AppData%\GoTextProcessing\settings.json`.
*   **Fallback**: If the preferred directory is inaccessible, the application will attempt to use the user's home directory (`$HOME` on Unix/macOS, `%USERPROFILE%` on Windows).

## Building Locally

### Prerequisites

*   **Go**: Version 1.23.0 or higher.
*   **Node.js & npm**: For building the frontend.
*   **Wails CLI**: Version 2.10.2 or compatible. Install via `go install github.com/wailsapp/wails/v2/cmd/wails@latest`.

### Build Steps

1.  **Clone the Repository**: Download the project source code.
2.  **Install Frontend Dependencies**: Navigate to the project root and run `npm install` in the terminal. This installs the required React and Vite dependencies listed in `package.json`.
3.  **Build the Application**: Run `wails build` from the project root. This command will:
    *   Compile the Go backend.
    *   Build the React frontend using Vite (`npm run build`).
    *   Bundle everything into a native executable for your current platform.
4.  The final executable will be placed in the project directory or a designated `build` folder.

## Project Structure

```
.
├── README.md
├── app.go                  # Main Wails application setup
├── build/                  # Build assets (icons, platform-specific configs)
├── frontend/               # React frontend source code
│   ├── src/                # React components, store, utilities
│   ├── package.json        # Frontend dependencies and scripts
│   └── ...                 # Other frontend config files (Vite, ESLint, etc.)
├── go.mod                  # Go module dependencies
├── go.sum                  # Go dependency checksums
├── internal/               # Internal Go packages (backend logic, models)
│   └── backend/            # Core application logic, API clients, settings management
├── main.go                 # Application entry point
└── wails.json              # Wails project configuration
```

## Technology Stack

*   **Backend**: Go 1.23.0
*   **Frontend**: React 19, Vite, Redux Toolkit
*   **Framework**: Wails v2.10.2 (for creating the desktop application)
*   **HTTP Client**: `resty.dev/v3` (for making API requests to LLM providers)
*   **Testing**: `github.com/stretchr/testify`

## Settings UI

The application provides a graphical Settings panel for users to configure their LLM provider connection. This panel, built with React, allows users to:

*   Set the `baseUrl`, `modelsEndpoint`, and `completionEndpoint`.
*   Add, edit, and remove custom HTTP headers.
*   Test the connection to the Models and Completion endpoints.
*   Refresh and select from a list of available models (fetched from the provider).
*   Configure the model `temperature`.
*   Set default input and output languages for translation.
*   Toggle Markdown output formatting.
*   Save the configuration or reset it to default values (configured for a local Ollama instance).

This UI communicates with the Go backend via Wails bindings to persist settings and validate the connection.

---

This project is the successor to [LLM Edit](https://github.com/sanyokkua/llmedit) and was previously known as "Go Text" during development.