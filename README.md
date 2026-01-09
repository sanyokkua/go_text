# Text Processing Suite

## Overview

Text Processing Suite is a native desktop application for text processing that uses Large Language Models (LLMs). It provides features for proofreading, style rewriting, formatting, translation, and summarization.

Unlike its [predecessor](https://github.com/sanyokkua/llmedit), which focused on local LLMs, this application is designed to work with any LLM provider that supports an OpenAI-compatible API. That includes local servers such as Ollama and LM Studio, as well as cloud services like OpenRouter.

The application uses Go for the backend and React for the frontend, and is packaged with the Wails framework to deliver a native desktop experience. This architecture aims for efficient performance and a smaller distribution footprint.

![appUiExample](docs/screens/01.AppUIExample.png)

## Key Features

* **Text Processing**

    * Proofreading and grammar correction.
    * Style transformation (for example: formal, casual, friendly, direct).
    * Text formatting for different contexts (emails, chat messages, social media posts, wiki markdown, etc.).
* **Translation**

    * Bidirectional translation between supported languages.
    * Dictionary-style translations.
* **Summarization**

    * Generate concise summaries of input text.
    * Extract a list of key points.
    * Generate relevant hashtags.

> **Note:** The list of supported languages in this app is chosen based on the languages most commonly supported by open-source LLMs. Translation quality depends on the selected model.

### Formatting Example

![formattingExample](docs/screens/02.FormattingExample.png)

### Translation Example

![translationExample](docs/screens/03.TranslationExample.png)

### Summary Example

![summaryExample](docs/screens/04.SummaryExample.png)

## Configuration

The application's behavior is controlled via a settings file. Core settings determine how the application connects to an LLM provider.

### Settings Structure

The `Settings` struct defines the configurable parameters used by the application:

* `baseUrl` — The root URL of the LLM provider's API (for example, `http://localhost:11434` for Ollama or a cloud provider endpoint).
* `modelsEndpoint` — The relative path used to fetch the list of available models (for example, `/v1/models`).
* `completionEndpoint` — The relative path to send chat completion requests (for example, `/v1/chat/completions`).
* `headers` — A map of key/value pairs for HTTP headers; used for authentication/authorization (for example, API keys).
* `modelName` — The ID of the specific LLM to use for processing.
* `temperature` — A value between 0 and 1 that controls the randomness of the model's output.
* `defaultInputLanguage` / `defaultOutputLanguage` — Default languages used for translation tasks.
* `languages` — A list of supported languages from which to choose default languages.
* `useMarkdownForOutput` — A boolean flag that indicates whether the output should be formatted as Markdown. Treat this as a recommendation for the LLM; there is no guarantee the model will use Markdown — that depends on the chosen model.

Some parameters can be validated when changed. If the configured models are not available but were configured earlier, the app will indicate that those models cannot be used. With certain providers it can be tricky to set everything up properly, but in general the current approach works.

### Settings File Location

The application follows platform-specific conventions for storing its configuration file:

* **Unix/Linux (including macOS)**: Uses the `$XDG_CONFIG_HOME` environment variable if it is set and non-empty. If not set, it defaults to `$HOME/.config`. The settings file path is either `$XDG_CONFIG_HOME/GoTextProcessing/settings.json` or `$HOME/.config/GoTextProcessing/settings.json`.
* **macOS (Darwin)**: If XDG directories are not used, it falls back to `$HOME/Library/Application Support/GoTextProcessing/settings.json`.
* **Windows**: Uses the `%AppData%` environment variable, resulting in a path like `%AppData%\GoTextProcessing\settings.json`.
* **Fallback**: If the preferred directory is inaccessible, the application will attempt to use the user's home directory (`$HOME` on Unix/macOS, `%USERPROFILE%` on Windows).

## Building Locally

### Prerequisites

* **Go**: Version 1.25.0 or higher.
* **Node.js & npm**: Required for building the frontend.
* **Wails CLI**: Version 2.10.2 or compatible. Install with:

```shell
go install github.com/wailsapp/wails/v2/cmd/wails@latest
```

You also need Git to clone the repository. In short: install Git, Go, Node.js, and Wails to build the project.

### Build Steps

1. **Clone the repository**

```shell
git clone https://github.com/sanyokkua/go_text.git
```

2. **Install frontend dependencies**

Navigate into the frontend directory and install the required packages listed in `package.json`:

```shell
cd frontend
npm install
cd ..
go get ./...
```

3. **Build the application**

Run `wails build` from the project root. This process will:

* Build the React frontend using Vite (`npm run build`).
* Compile the Go backend.
* Bundle everything into a native executable for your current platform.

Commands you can use during development and for a release build:

```shell
cd frontend
npm run build
cd ..

wails dev   # Build and run locally (development)
wails build # Build a production executable for the current OS
```

4. The final executable will be placed in the project directory or a designated `build` folder.

> Note: Windows and Linux builds were not tested. The binaries can be built, but the application work state is not verified.

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

* **Backend**: Go 1.25.0
* **Frontend**: React 19, Vite, Redux Toolkit
* **Framework**: Wails v2.10.2 (for creating the desktop application)
* **HTTP Client**: `resty.dev/v3` (for making API requests to LLM providers)
* **Testing**: `github.com/stretchr/testify`

## Settings UI

The application includes a graphical Settings panel (built with React) that lets users configure their LLM provider connection. The Settings UI allows users to:

* Set the `baseUrl`, `modelsEndpoint`, and `completionEndpoint`.
* Add, edit, and remove custom HTTP headers.
* Test the connection to the Models and Completion endpoints.
* Refresh and select from a list of available models (fetched from the provider).
* Configure the model `temperature`.
* Set default input and output languages for translation.
* Toggle Markdown output formatting.
* Save the configuration or reset it to default values (defaults are configured for a local Ollama instance).

![settingsExample1](docs/screens/05.SettingsExample_1.png)
![settingsExample2](docs/screens/05.SettingsExample_2.png)
![settingsExample3](docs/screens/05.SettingsExample_3.png)
![settingsExample4](docs/screens/05.SettingsExample_4.png)

This UI communicates with the Go backend via Wails bindings to persist settings and validate the connection.

---

## Installation on macOS from GitHub Releases

If you install the app from the [GitHub Releases Page](https://github.com/sanyokkua/go_text/releases), macOS may block the app because it is not signed by Apple. This is expected for unsigned binaries. You can verify the source by building from source or by reviewing this repository.

If you prefer to download a release rather than build locally, follow these steps:

1. Download the archive from the releases page.
   ![release1](docs/screens/06.Release_1.png)
2. Extract the app (you will get `TextProcessingSuite.app`).
   ![release2](docs/screens/06.Release_2.png)
3. If you try to run the app, macOS may show an error or block launch.
   ![release3](docs/screens/06.Release_3.png)
4. Remove the quarantine flag via Terminal:

```shell
xattr -rd com.apple.quarantine TextProcessingSuite.app
```

![release4](docs/screens/06.Release_4.png)

5. Run the app. If macOS still blocks it, open **System Preferences → Security & Privacy → General** and allow the app to run.

## Some Providers Information (examples)

### Ollama

[Ollama Local Provider](https://ollama.com/)

* **BaseUrl**: `http://localhost:11434` (default)
* **modelsEndpoint**: `/v1/models` (default)
* **completionEndpoint**: `/v1/chat/completions` (default)
* **headers**: No headers required

### LM Studio

[LM Studio Local Provider](https://lmstudio.ai/)

* **BaseUrl**: `http://localhost:1234` (enable the server option in LM Studio before use)
* **modelsEndpoint**: `/v1/models` (default)
* **completionEndpoint**: `/v1/chat/completions` (default)
* **headers**: No headers required

### Open Router

[Open Router Cloud Provider](https://openrouter.ai/)

* **BaseUrl**: `https://openrouter.ai/api` (you must acquire your API key before use)
* **modelsEndpoint**: `/v1/models` (default)
* **completionEndpoint**: `/v1/chat/completions` (default)
* **headers**:

    * `Authorization: Bearer <OPENROUTER_API_KEY>`
    * For example: `Authorization: Bearer cFgvJbewhrifu2f234uf2huy312e`

> Open Router also provides "free" models that can be used with this application. For example, `openai/gpt-oss-120b` — which can sometimes produce results close to `gpt-5-nano`.

### Other providers

Other providers may use different `modelsEndpoint`, `completionEndpoint`, or authentication headers. Check the provider's API specification and configure the appropriate endpoints. The only requirement is that the provider supports OpenAI-compatible requests and responses.

## Request / Response Notes

The app uses HTTP REST endpoints to perform inference with AI models. As a result, during such calls the app can become temporarily unresponsive — this is expected. Each request has a timeout of 1 minute. If the internet connection is poor or the model takes too long to respond, the app will stop processing the current task after one minute and you can try again.

Different models have different context limits, so do not attempt to translate or proofread entire books or very large documents. Most everyday texts are handled fine, but very large inputs can fail.

![LoadingExample](docs/screens/07.LoadingExample.png)

## Notes

This is the first version of the app. It was developed to solve the author’s everyday tasks but can be used by anyone. Core functionality is covered by tests, though not the entire application.

The author is not a professional UX designer or dedicated frontend developer, so some inconsistencies and bugs are expected. Improvements are planned, but there is not enough time for full-time development at the moment.
