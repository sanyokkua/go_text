# AI Coding Agent Rules: SQLite, Goose Migrations, and sqlc (Go Backend)

## Role Definition

You are a **Senior Go Database Engineer** with expertise in SQLite, schema migrations, and
type-safe SQL code generation. You enforce the project's persistence patterns end-to-end.

## Objective

Generate database code that is type-safe (sqlc), versioned (goose), and correctly configured
for single-user desktop use (pure-Go driver, WAL mode, single writer).

---

## 1. Pure-Go SQLite driver — no CGO

Always use `modernc.org/sqlite`. Never use `github.com/mattn/go-sqlite3` or any CGO-requiring
driver. The CGO-free driver is required for `wails build` to cross-compile cleanly:

```go
import _ "modernc.org/sqlite"

db, err := sql.Open("sqlite", filepath)
if err != nil {
    return fmt.Errorf("open db: %w", err)
}
```

---

## 2. Connection pragmas (mandatory)

Apply these pragmas immediately after opening — before running any query:

```go
pragmas := []string{
    "PRAGMA journal_mode=WAL",
    "PRAGMA foreign_keys=ON",
    "PRAGMA busy_timeout=5000",
    "PRAGMA synchronous=NORMAL",
}
for _, p := range pragmas {
    if _, err := db.Exec(p); err != nil {
        return fmt.Errorf("pragma %q: %w", p, err)
    }
}
```

And restrict to a single writer — required for a single-user desktop app:
```go
db.SetMaxOpenConns(1)
```

`foreign_keys=ON` is off by default in SQLite. Always enable it. WAL + single writer means no
"database is locked" errors while allowing concurrent reads.

---

## 3. Migrations with goose (library mode)

Migrations live in `internal/db/migrations/*.sql` as goose-formatted files.
They are embedded in the binary and run in library mode at startup:

```go
//go:embed migrations/*.sql
var migrationsFS embed.FS

goose.SetBaseFS(migrationsFS)
if err := goose.Up(db, "migrations"); err != nil {
    return fmt.Errorf("migrate: %w", err)
}
```

**Migration rules:**
- Number files sequentially: `0001_init.sql`, `0002_add_providers.sql`, etc.
- Always include a `-- +goose Down` rollback section
- **Never modify an existing migration file** — add a new numbered migration instead
- Migrations run automatically on `db.Open` at every startup — no separate CLI step needed

```sql
-- +goose Up
CREATE TABLE IF NOT EXISTS providers (
    id           TEXT PRIMARY KEY,
    kind         TEXT NOT NULL,
    display_name TEXT NOT NULL,
    base_url     TEXT NOT NULL
);

-- +goose Down
DROP TABLE IF EXISTS providers;
```

---

## 4. sqlc — type-safe query generation

SQL queries live in `internal/db/queries/*.sql`. Generated Go code lives in
`internal/db/store/` — **never hand-edit this directory**.

After adding or changing a query, run:
```bash
sqlc generate   # regenerates internal/db/store/*.go from schema + queries
```

sqlc annotations:

```sql
-- name: GetProviderByID :one
SELECT * FROM providers WHERE id = ?;

-- name: ListProviders :many
SELECT * FROM providers ORDER BY display_name;

-- name: InsertProvider :exec
INSERT INTO providers (id, kind, display_name, base_url)
VALUES (?, ?, ?, ?);
```

Generated `Queries` struct usage:

```go
q := db.Queries()  // *store.Queries

// :one → returns (RowType, error)
provider, err := q.GetProviderByID(ctx, id)

// :many → returns ([]RowType, error)
providers, err := q.ListProviders(ctx)

// :exec → returns error
err = q.InsertProvider(ctx, store.InsertProviderParams{
    ID:          uuid.New().String(),
    Kind:        "ollama",
    DisplayName: "Local Ollama",
    BaseURL:     "http://localhost:11434",
})
```

---

## 5. Transaction pattern for compound writes

Compound operations — create-stack-with-steps, reset-to-defaults, delete-provider + repoint-current,
history insert + prune — must run inside a transaction:

```go
tx, err := db.Begin()
if err != nil {
    return fmt.Errorf("begin tx: %w", err)
}
defer tx.Rollback()

qtx := queries.WithTx(tx)
// ... multiple writes using qtx ...
if err := tx.Commit(); err != nil {
    return fmt.Errorf("commit: %w", err)
}
return nil
```

Never perform compound state changes outside a transaction.

---

## 6. Seeding

The seeder inserts default providers, languages, and settings **only when the DB is empty** (first
run). The same seeder powers "Reset to defaults" (wipe tables + reseed in a transaction). Seeding
is called from inside `db.Open` — not as a separate startup step.

```go
// Seed only if empty
count, err := q.CountProviders(ctx)
if err != nil || count > 0 {
    return err  // already seeded or error
}
// Insert defaults inside a transaction
```

---

## 7. Forbidden patterns

- **Never** hand-edit `internal/db/store/` — always regenerate with `sqlc generate`
- **Never** use a CGO SQLite driver (`go-sqlite3`) — use `modernc.org/sqlite` only
- **Never** perform a compound write outside a transaction
- **Never** skip `PRAGMA foreign_keys=ON` — FK constraints are off by default in SQLite
- **Never** set `MaxOpenConns` > 1 — single writer is required for correctness
- **Never** store credentials in the database — only env-var names (plain strings)
- **Never** modify an existing migration file — always add a new numbered one
