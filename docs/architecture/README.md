# Architecture Documentation

Welcome to the **Text Processing Suite** architecture documentation. This documentation is designed for developers joining the project and provides a
comprehensive understanding of the system's design, implementation, and operational aspects.

---

## Documentation Index

| Document                                                              | Description                                                                     |
|-----------------------------------------------------------------------|---------------------------------------------------------------------------------|
| [01 - System Overview](./01-system-overview.md)                       | High-level summary, tech stack, project structure, and architecture diagram     |
| [02 - Backend Architecture](./02-backend-architecture.md)             | Go packages, interfaces, dependency injection, data models                      |
| [03 - Frontend Architecture](./03-frontend-architecture.md)           | React structure, Redux state management, component hierarchy, Wails integration |
| [04 - Data Flow & Communication](./04-data-flow-and-communication.md) | Request lifecycles, error handling, type mapping                                |
| [05 - Build & Configuration](./05-build-and-configuration.md)         | Development workflow, build process, settings management, dependencies          |

---

## Quick Start

### Prerequisites

- Go 1.25+
- Node.js 20+
- Wails CLI (`go install github.com/wailsapp/wails/v2/cmd/wails@latest`)

### Development

```bash
# Install dependencies
cd frontend && npm install && cd ..

# Start development mode (hot-reload)
wails dev
```

### Build

```bash
# Production build
wails build

# Platform-specific
wails build -platform darwin/universal   # macOS
wails build -platform windows/amd64      # Windows
```

---

## Architecture at a Glance

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Text Processing Suite                           │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                     React Frontend (MUI)                        │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │    │
│  │  │ Components  │  │   Redux     │  │     Adapter Layer       │  │    │
│  │  │  (Views)    │  │   Store     │  │   (Services + Models)   │  │    │
│  │  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘  │    │
│  └─────────┼────────────────┼─────────────────────┼────────────────┘    │
│            │                │                     │                     │
│  ┌─────────┴────────────────┴─────────────────────┴────────────────┐    │
│  │                    Wails v2 Runtime (Bridge)                    │    │
│  │                 Auto-generated TypeScript Bindings              │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                   │                                     │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                      Go Backend (internal/)                     │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │    │
│  │  │ Handlers │→ │ Services │→ │  Repos   │→ │ File/LLM/Prompts │ │    │
│  │  │  (API)   │  │ (Logic)  │  │  (Data)  │  │   (Utilities)    │ │    │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘ │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
                                   ↓
                    ┌──────────────────────────────┐
                    │       External Systems       │
                    │  • LLM Providers (HTTP APIs) │
                    │  • File System (Settings)    │
                    └──────────────────────────────┘
```

---

## Key Concepts

- **Wails v2**: Desktop framework bridging Go (backend) and React (frontend)
- **Handler-Service-Repository**: Layered architecture with clear separation
- **Redux Toolkit**: Centralized state management with TypeScript
- **Interface-driven**: All components use interfaces for testability
- **Multiple LLM Providers**: Supports Ollama, OpenAI, OpenRouter, and custom endpoints

---

*Last updated: January 2026*
