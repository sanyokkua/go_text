# GoText — Build & Configuration

> **Version:** v3 · Module: `go_text`

---

## 1. Prerequisites

| Requirement | Version |
|---|---|
| Go | 1.25+ |
| Node.js | 20+ |
| npm | 10+ |
| Wails CLI | 2.x (`go install github.com/wailsapp/wails/v2/cmd/wails@latest`) |

**Platform extras:**

| Platform | Requirement |
|---|---|
| macOS | Xcode Command Line Tools |
| Linux | `sudo apt-get install build-essential libgtk-3-dev libwebkit2gtk-4.1-dev` |
| Windows | C++ Build Tools + WebView2 Runtime |

> **No SQLite system library needed.** GoText uses `modernc.org/sqlite` — a pure-Go driver with
> no CGO dependency. `wails build` cross-compiles cleanly without any native SQLite installation.

---

## 2. Development commands

```bash
wails dev                           # start Wails dev server: hot-reload backend + frontend
                                    # frontend available at http://localhost:34115

cd frontend && npm run dev          # frontend-only Vite dev server with bridge mock
                                    # UI runs without a Go backend — ideal for rapid UI iteration

wails build                         # production build → build/bin/<AppName>
wails doctor                        # verify all Wails prerequisites are installed
wails generate module               # regenerate frontend/wailsjs/ after any Go signature change
```

`wails generate module` must be run whenever a bound handler method signature or a bound struct
changes. The generated files in `frontend/wailsjs/` are never hand-edited.

---

## 3. Test commands

```bash
# Backend
go test -race ./...                               # all Go tests with race detector (always use -race)
go test ./internal/...                            # backend unit + integration tests
go test -run TestName ./internal/actions/         # single named test

# Frontend
cd frontend && npm run test                       # Jest (all tests)
cd frontend && npm run test:coverage              # Jest with coverage report
cd frontend && npm run verify:ui                  # Playwright/Chromium UI tests
```

The integration tests in `internal/llms/` use `net/http/httptest` to mock LLM providers — no
external LLM is needed to run the test suite.

---

## 4. CI guards

These checks must pass on every PR:

```bash
# 1. Go build is clean
go build ./...

# 2. Wails bindings are in sync (run generate, then check for a clean diff)
wails generate module
git diff --exit-code frontend/wailsjs/

# 3. No MUI or @emotion re-introduced in the frontend
! grep -rq "@mui\|@emotion" frontend/src && \
! grep -q "@mui\|@emotion" frontend/package.json

# 4. Race-free Go tests
go test -race ./...
```

---

## 5. Key dependencies

### Go modules

| Module | Role |
|---|---|
| `github.com/wailsapp/wails/v2` | Desktop framework |
| `github.com/go-resty/resty/v2` | HTTP client for LLM provider calls |
| `github.com/rs/zerolog` | Structured logging |
| `gopkg.in/natefinch/lumberjack.v2` | Log rotation |
| `modernc.org/sqlite` | Pure-Go SQLite driver (no CGO) |
| `github.com/pressly/goose/v3` | Schema migration runner |

`sqlc` is a dev tool (not a module dependency) — run `sqlc generate` after changing query files.

### Frontend (npm)

| Package | Role |
|---|---|
| `react`, `react-dom` (19) | UI rendering |
| `@reduxjs/toolkit`, `react-redux` | State management |
| `radix-ui` | Behavior + accessibility primitives |
| `cmdk` | Command palette and searchable pickers |
| `react-markdown`, `remark-gfm`, `remark-math` | Markdown rendering |
| `rehype-katex`, `rehype-highlight`, `highlight.js`, `mermaid` | Markdown extensions |
| `lucide-react` | Tree-shakable SVG icons |
| `typescript`, `vite` | Compiler and build tool |
| `jest`, `@testing-library/react`, `@testing-library/user-event`, `jest-axe` | Tests |
| `playwright` | Browser UI tests |

**Removed in v3 (must not reappear):** `@mui/material`, `@mui/icons-material`, `@emotion/react`,
`@emotion/styled`.

---

## 6. Settings and data persistence

### Settings JSON (per OS)

| Platform | Path |
|---|---|
| macOS | `~/Library/Application Support/TextProcessingSuite/SettingsV2.json` |
| Linux | `~/.config/TextProcessingSuite/SettingsV2.json` |
| Windows | `%APPDATA%\TextProcessingSuite\SettingsV2.json` |

### SQLite database

| Platform | Path |
|---|---|
| macOS | `~/Library/Application Support/TextProcessingSuite/gotext.db` |
| Linux | `~/.config/TextProcessingSuite/gotext.db` |
| Windows | `%APPDATA%\TextProcessingSuite\gotext.db` |

### Logs

| Platform | Path |
|---|---|
| macOS | `~/Library/Logs/TextProcessingSuite/` |
| Linux | `~/.local/state/TextProcessingSuite/` |
| Windows | `%APPDATA%\TextProcessingSuite\logs\` |

---

## 7. Working with the database

### Adding a migration

1. Create `internal/db/migrations/NNNN_description.sql` (goose format):
   ```sql
   -- +goose Up
   ALTER TABLE providers ADD COLUMN display_name TEXT;

   -- +goose Down
   -- SQLite does not support DROP COLUMN in older versions; document the reverse procedure
   ```
2. The migration runs automatically on the next `db.Open` (app startup).
3. Never modify an existing migration — always add a new numbered file.

### Adding or changing a query

1. Edit `internal/db/queries/*.sql`
2. Run `sqlc generate` to regenerate `internal/db/store/*.go`
3. Never edit `internal/db/store/` manually — it is always overwritten by sqlc

---

## 8. Wails configuration

`wails.json` at the repo root controls the Wails build:

```json
{
  "name": "TextProcessingSuite",
  "outputfilename": "TextProcessingSuite",
  "frontend:install": "npm install",
  "frontend:build": "npm run build",
  "frontend:dev:watcher": "npm run dev",
  "frontend:dev:serverUrl": "http://localhost:5173",
  "wailsjsdir": "./frontend/wailsjs",
  "assetdir": "./frontend/dist"
}
```

The `wailsjsdir` (`frontend/wailsjs/`) is the output directory for `wails generate module` —
never edit files there.
