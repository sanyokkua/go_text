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

`.github/workflows/main.yml` runs two jobs on every PR: `build` (compiles for Linux, Windows,
and macOS ARM64 — a build failure on any platform fails CI) and `test` (the gate list below,
all on `ubuntu-latest`). The workflow file itself is the source of truth; this table mirrors it.

| Gate | Command | Blocks on |
|---|---|---|
| Go format | `gofmt -l .` | Unformatted Go files |
| Go vet | `go vet ./...` | Vet warnings |
| Go tests | `go test -race ./...` | Test failure or data race |
| FE format | `npm run format:check` | Unformatted TS/CSS files |
| FE lint | `npm run lint` | ESLint errors |
| FE type-check | `npx tsc --noEmit` | Type errors |
| FE unit tests | `npm run test:coverage` | Test failure |
| No MUI/emotion | `grep -r "@mui\|@emotion" src/` (must find nothing) | Reintroduced MUI/emotion import anywhere in `frontend/src` |
| UI gates (Target A) | `npm run verify:ui` | Playwright failure against the mocked-bridge dev server |
| Smoke flows (Target A) | `npm run verify:smoke` | Playwright smoke-flow failure |
| Go vulnerability scan | `govulncheck ./...` | Known-vulnerable Go dependency |
| FE dependency audit | `npm audit --audit-level=high` | High/critical npm advisory |
| Wails doctor | `wails doctor` | Missing/misconfigured Wails toolchain |
| sqlc drift | `sqlc diff` | Hand-edited or stale `internal/db/store/` vs `queries/*.sql` |
| Bindings drift | `wails generate module && git diff --exit-code frontend/wailsjs/` | Uncommitted or stale generated bindings |

Any failing gate blocks merge — there is no "pre-existing failure" exception.

---

## 5. Key dependencies

### Go modules

| Module | Role |
|---|---|
| `github.com/wailsapp/wails/v2` | Desktop framework |
| `resty.dev/v3` | HTTP client for LLM provider calls |
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

### Settings Database (per OS)

Settings are persisted entirely in SQLite — no JSON settings file exists or is used by the
running application.

| Platform | Path |
|---|---|
| macOS | `~/Library/Application Support/GoTextApp/gotext.db` |
| Linux | `~/.config/GoTextApp/gotext.db` |
| Windows | `%APPDATA%\GoTextApp\gotext.db` |

### Logs

Logs share the same base directory as settings and the database (`os.UserConfigDir()` +
`GoTextApp`), not the OS's generic log directory:

| Platform | Path |
|---|---|
| macOS | `~/Library/Application Support/GoTextApp/logs/` |
| Linux | `~/.config/GoTextApp/logs/` |
| Windows | `%APPDATA%\GoTextApp\logs\` |

### Dev builds use an isolated settings/DB/logs folder

`wails dev` never touches the paths above. `internal/file/service.go`'s `FileUtilsService` resolves
every path (settings folder, `gotext.db`, `logs/`) through a single `appDirName()` helper that
returns `internal/file/constants.go`'s `AppNameDev = "GoTextApp-Dev"` instead of `AppName` when the
service was constructed with `isDev=true`. `isDev` is `bootstrap.IsDevBuild` — the same
compile-time `dev`/`!dev` build tag described in `02-backend-architecture.md` §2, which Wails' own
CLI sets automatically for `wails dev` and never sets for `wails build`/`go build`/`go test`. So a
`wails dev` session reads/writes:

| Platform | Path |
|---|---|
| macOS | `~/Library/Application Support/GoTextApp-Dev/{gotext.db, logs/}` |
| Linux | `~/.config/GoTextApp-Dev/{gotext.db, logs/}` |
| Windows | `%APPDATA%\GoTextApp-Dev\{gotext.db, logs\}` |

completely independent of a production install's `GoTextApp` folder — local development and testing
can never corrupt or mix with real user data, and (as a side effect) a `wails dev` instance and a
packaged production build can run at the same time without tripping the single-instance flock
(`gotext.db.lock`, next to `gotext.db`), since the two lock files now live in different folders.
Settings → About in the running app always reflects the folder actually in use, since
`AppSettingsMetadata.SettingsFolder`/`DatabaseFile`/`LogsFolder` are computed from the same
`FileUtilsService` calls.

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
  "name": "GoText",
  "outputfilename": "GoText",
  "frontend:install": "npm install",
  "frontend:build": "npm run build",
  "frontend:dev:watcher": "npm run dev -- --mode wails",
  "frontend:dev:serverUrl": "auto",
  "author": { "name": "Oleksandr Kostenko", "email": "sanyokkua@gmail.com" },
  "version": "dev",
  "info": {
    "companyName": "Oleksandr Kostenko",
    "productName": "GoText",
    "productVersion": "dev",
    "copyright": "Copyright © Oleksandr Kostenko",
    "comments": "AI-powered text transformation"
  }
}
```

`version`/`info.productVersion` stay at the placeholder `"dev"` in the repo. The release
workflow patches both fields with the real version in the CI runner's checkout only (never
committed back), and separately injects the same version into the Go binary via `-ldflags`
(see §9, Release process).

The `frontend/wailsjs/` directory is the output of `wails generate module` —
never edit files there.

---

## 9. Release process

Releases are built and published by the same `.github/workflows/main.yml` file, in two jobs
that run after `build`/`test` pass: `build` (per-platform binaries) and `create-release`
(publishes them). There are two ways to trigger a release:

1. **Tag push (recommended):** `git tag v1.0.0 && git push origin v1.0.0`. Any tag matching
   `v*.*.*` triggers the workflow; the version is taken from the tag.
2. **Manual dispatch:** Actions → "Build and Release Wails App" → Run workflow, entering a
   version (no leading `v`) and whether to create a GitHub release. Useful for producing
   unreleased test builds — set "Create release" to false and the artifacts are still uploaded
   (7-day retention) but no release is published.

For each trigger, the workflow:
1. Computes the version once (`determine-version` job) and shares it with the other jobs.
2. Builds three platform binaries in parallel: `linux/amd64` (Ubuntu 24.04, `webkit2_41` build
   tag), `windows/amd64`, and `darwin/arm64` (macOS Apple Silicon only — no Intel build).
   Each build patches `wails.json`'s `version`/`info.productVersion` with the release version
   (via `jq`, in that job's checkout only) and passes
   `-ldflags "-X go_text/internal/settings.AppVersion=<version>"` to `wails build`, which is
   the value the running app reports as its own version.
3. Runs the full `test` job gate set (§4) — a release is not published if any gate fails.
4. `create-release` downloads all platform artifacts, renames them with the version embedded
   (e.g. `GoText-1.0.0-linux-amd64`), re-zips the macOS `.app` bundle (GitHub Actions flattens
   its internal structure during upload/download, so the workflow restores it and re-applies
   the execute bit before zipping), generates a `SHA256SUMS.txt` checksum file, and publishes a
   GitHub Release with all of it attached. A version containing a hyphen (e.g. `1.0.0-beta`) is
   automatically marked as a pre-release.

There is no macOS Intel (`darwin/amd64`) build and no code-signing/notarization step — both are
current release-process limitations, not omissions from this document.
