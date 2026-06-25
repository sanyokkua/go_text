package history

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"go_text/internal/apperr"
	"go_text/internal/db"
	"go_text/internal/db/store"
)

// SqliteHistoryRepository is the SQLite-backed implementation of HistoryRepositoryAPI.
type SqliteHistoryRepository struct {
	database *db.Database
}

// NewSqliteHistoryRepository constructs a history repository backed by database.
func NewSqliteHistoryRepository(database *db.Database) *SqliteHistoryRepository {
	if database == nil {
		panic("SqliteHistoryRepository: database cannot be nil")
	}
	return &SqliteHistoryRepository{database: database}
}

func (r *SqliteHistoryRepository) bg() context.Context { return context.Background() }

func marshalApplied(actions []apperr.AppliedAction) (string, error) {
	if len(actions) == 0 {
		return "[]", nil
	}
	b, err := json.Marshal(actions)
	if err != nil {
		return "", fmt.Errorf("marshal applied actions: %w", err)
	}
	return string(b), nil
}

func unmarshalApplied(s string) ([]apperr.AppliedAction, error) {
	if s == "" || s == "[]" {
		return []apperr.AppliedAction{}, nil
	}
	var out []apperr.AppliedAction
	if err := json.Unmarshal([]byte(s), &out); err != nil {
		return nil, fmt.Errorf("unmarshal applied actions: %w", err)
	}
	return out, nil
}

func rowToHistoryEntry(row store.History) (apperr.HistoryEntry, error) {
	applied, err := unmarshalApplied(row.Applied)
	if err != nil {
		return apperr.HistoryEntry{}, err
	}
	return apperr.HistoryEntry{
		ID:           row.ID,
		CreatedAt:    row.CreatedAt,
		Kind:         row.Kind,
		Title:        row.Title,
		InputText:    row.InputText,
		OutputText:   row.OutputText,
		Applied:      applied,
		ProviderName: row.ProviderName,
		Model:        row.Model,
		InputLang:    row.InputLang,
		OutputLang:   row.OutputLang,
		Format:       row.Format,
		DurationMs:   row.DurationMs,
		Inferences:   int(row.Inferences),
		Status:       row.Status,
		ErrorCode:    row.ErrorCode,
		FailedIndex:  int(row.FailedIndex),
	}, nil
}

// Add inserts entry then prunes history to maxEntries newest rows in one transaction.
func (r *SqliteHistoryRepository) Add(entry apperr.HistoryEntry, maxEntries int64) error {
	const op = "SqliteHistoryRepository.Add"
	ctx := r.bg()

	applied, err := marshalApplied(entry.Applied)
	if err != nil {
		return fmt.Errorf("%s: %w", op, err)
	}

	id := entry.ID
	if id == "" {
		id = uuid.NewString()
	}
	createdAt := entry.CreatedAt
	if createdAt == 0 {
		createdAt = time.Now().Unix()
	}

	tx, err := r.database.DB.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("%s: begin tx: %w", op, err)
	}
	defer func() { _ = tx.Rollback() }()

	q := r.database.Queries.WithTx(tx)
	if err := q.AddHistory(ctx, store.AddHistoryParams{
		ID:           id,
		CreatedAt:    createdAt,
		Kind:         entry.Kind,
		Title:        entry.Title,
		InputText:    entry.InputText,
		OutputText:   entry.OutputText,
		Applied:      applied,
		ProviderName: entry.ProviderName,
		Model:        entry.Model,
		InputLang:    entry.InputLang,
		OutputLang:   entry.OutputLang,
		Format:       entry.Format,
		DurationMs:   entry.DurationMs,
		Inferences:   int64(entry.Inferences),
		Status:       entry.Status,
		ErrorCode:    entry.ErrorCode,
		FailedIndex:  int64(entry.FailedIndex),
	}); err != nil {
		return fmt.Errorf("%s: insert: %w", op, err)
	}

	if maxEntries > 0 {
		if err := q.PruneHistory(ctx, maxEntries); err != nil {
			return fmt.Errorf("%s: prune: %w", op, err)
		}
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("%s: commit: %w", op, err)
	}
	return nil
}

// List returns up to limit entries starting at offset, ordered newest first.
func (r *SqliteHistoryRepository) List(limit, offset int64) ([]apperr.HistoryEntry, error) {
	const op = "SqliteHistoryRepository.List"
	rows, err := r.database.Queries.ListHistory(r.bg(), store.ListHistoryParams{
		Limit:  limit,
		Offset: offset,
	})
	if err != nil {
		return nil, fmt.Errorf("%s: %w", op, err)
	}
	entries := make([]apperr.HistoryEntry, 0, len(rows))
	for _, row := range rows {
		e, err := rowToHistoryEntry(row)
		if err != nil {
			return nil, fmt.Errorf("%s: %w", op, err)
		}
		entries = append(entries, e)
	}
	return entries, nil
}

// Get returns the history entry with the given id.
func (r *SqliteHistoryRepository) Get(id string) (*apperr.HistoryEntry, error) {
	const op = "SqliteHistoryRepository.Get"
	row, err := r.database.Queries.GetHistory(r.bg(), id)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("%s: entry %q not found", op, id)
		}
		return nil, fmt.Errorf("%s: %w", op, err)
	}
	e, err := rowToHistoryEntry(row)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", op, err)
	}
	return &e, nil
}

// Delete removes the history entry with the given id.
func (r *SqliteHistoryRepository) Delete(id string) error {
	const op = "SqliteHistoryRepository.Delete"
	if err := r.database.Queries.DeleteHistory(r.bg(), id); err != nil {
		return fmt.Errorf("%s: %w", op, err)
	}
	return nil
}

// Clear removes all history entries.
func (r *SqliteHistoryRepository) Clear() error {
	const op = "SqliteHistoryRepository.Clear"
	if err := r.database.Queries.ClearHistory(r.bg()); err != nil {
		return fmt.Errorf("%s: %w", op, err)
	}
	return nil
}

// Count returns the total number of history entries.
func (r *SqliteHistoryRepository) Count() (int64, error) {
	const op = "SqliteHistoryRepository.Count"
	n, err := r.database.Queries.CountHistory(r.bg())
	if err != nil {
		return 0, fmt.Errorf("%s: %w", op, err)
	}
	return n, nil
}
