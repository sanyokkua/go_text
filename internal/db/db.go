package db

import (
	"context"
	"database/sql"
	"embed"
	"fmt"
	"io/fs"
	"time"

	"github.com/pressly/goose/v3"
	_ "modernc.org/sqlite"

	"go_text/internal/db/store"
)

//go:embed migrations/*.sql
var migrationsFS embed.FS

// Database holds the open connection and the sqlc query interface.
// Both fields are exported so repositories can begin transactions
// (DB.BeginTx) and use the generated query layer (Queries.WithTx).
type Database struct {
	DB       *sql.DB
	Queries  *store.Queries
	provider *goose.Provider
}

// Open opens gotext.db at dbPath, applies all pending migrations, and
// seeds default data when the database is new (providers table empty).
// Returns an error if open, migrate, or seed fails — the caller should
// treat any error as fatal (never run half-initialized).
func Open(dbPath string) (*Database, error) {
	const op = "db.Open"

	sqlDB, err := openWithPragmas(dbPath)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", op, err)
	}

	d := &Database{
		DB:      sqlDB,
		Queries: store.New(sqlDB),
	}

	if err := d.migrate(); err != nil {
		_ = sqlDB.Close()
		return nil, fmt.Errorf("%s: migrate: %w", op, err)
	}

	if err := d.seedIfEmpty(); err != nil {
		_ = sqlDB.Close()
		return nil, fmt.Errorf("%s: seed: %w", op, err)
	}

	return d, nil
}

// Close releases the underlying database connection.
func (d *Database) Close() error {
	return d.DB.Close()
}

// openWithPragmas opens the SQLite file at path with the required WAL
// pragmas and restricts the connection pool to a single writer.
func openWithPragmas(path string) (*sql.DB, error) {
	dsn := fmt.Sprintf(
		"file:%s?_pragma=busy_timeout(5000)&_pragma=journal_mode(WAL)&_pragma=foreign_keys(ON)&_pragma=synchronous(NORMAL)",
		path,
	)

	db, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, fmt.Errorf("open sqlite: %w", err)
	}

	// Single writer: avoids "database is locked" for single-user desktop use.
	db.SetMaxOpenConns(1)
	db.SetConnMaxIdleTime(5 * time.Minute)

	if err := db.Ping(); err != nil {
		_ = db.Close()
		return nil, fmt.Errorf("ping sqlite: %w", err)
	}

	return db, nil
}

// migrate applies all pending goose Up migrations from the embedded FS.
func (d *Database) migrate() error {
	fsys, err := fs.Sub(migrationsFS, "migrations")
	if err != nil {
		return fmt.Errorf("sub migrations fs: %w", err)
	}

	provider, err := goose.NewProvider(goose.DialectSQLite3, d.DB, fsys)
	if err != nil {
		return fmt.Errorf("create goose provider: %w", err)
	}
	d.provider = provider

	results, err := provider.Up(context.Background())
	if err != nil {
		return fmt.Errorf("apply migrations: %w", err)
	}

	for _, r := range results {
		if r.Error != nil {
			return fmt.Errorf("migration %s: %w", r.Source.Path, r.Error)
		}
	}

	return nil
}

// Seed wipes and reseeds all default data in a single transaction.
// Called by factory-reset handlers (T06+). Full implementation in Task 5.
func (d *Database) Seed(ctx context.Context) error { return d.seedIfEmpty() }

// seedIfEmpty is a temporary stub. Task 5 will replace this with real seeding logic.
func (d *Database) seedIfEmpty() error { return nil }
