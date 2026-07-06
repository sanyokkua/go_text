package history

import "go_text/internal/apperr"

// HistoryRepositoryAPI is the contract for the SQLite history repository.
// All methods use context.Background() internally — Wails bound callers supply no ctx.
type HistoryRepositoryAPI interface {
	// Add inserts entry then prunes to maxEntries newest rows in one transaction.
	// entry.ID and entry.CreatedAt are used as-is when non-zero; generated otherwise.
	Add(entry apperr.HistoryEntry, maxEntries int64) error
	List(limit, offset int64) ([]apperr.HistoryEntry, error)
	Get(id string) (*apperr.HistoryEntry, error)
	Delete(id string) error
	Clear() error
	Count() (int64, error)
}
