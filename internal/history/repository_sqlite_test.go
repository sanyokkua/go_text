package history

import (
	"fmt"
	"path/filepath"
	"testing"
	"time"

	"go_text/internal/apperr"
	"go_text/internal/db"
)

func openTestDB(t *testing.T) *db.Database {
	t.Helper()
	d, err := db.Open(filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatalf("open test database: %v", err)
	}
	t.Cleanup(func() { _ = d.Close() })
	return d
}

func newHistoryRepo(t *testing.T) *SqliteHistoryRepository {
	t.Helper()
	return NewSqliteHistoryRepository(openTestDB(t))
}

func makeEntry(id, kind, title string, createdAt int64) apperr.HistoryEntry {
	return apperr.HistoryEntry{
		ID:           id,
		CreatedAt:    createdAt,
		Kind:         kind,
		Title:        title,
		InputText:    "sample input",
		OutputText:   "sample output",
		Applied:      []apperr.AppliedAction{{ID: "act1", Name: "Proofread", Category: "rewrite"}},
		ProviderName: "Ollama",
		Model:        "llama3",
		InputLang:    "English",
		OutputLang:   "Ukrainian",
		Format:       "plain",
		DurationMs:   1500,
		Inferences:   1,
		Status:       "success",
		ErrorCode:    "",
		FailedIndex:  -1,
	}
}

func TestSqliteHistoryRepository_AddAndGet(t *testing.T) {
	repo := newHistoryRepo(t)

	entry := makeEntry("test-hist-1", "single", "Test Entry", time.Now().Unix())
	if err := repo.Add(entry, 100); err != nil {
		t.Fatalf("Add: %v", err)
	}

	got, err := repo.Get("test-hist-1")
	if err != nil {
		t.Fatalf("Get: %v", err)
	}
	if got.ID != entry.ID {
		t.Errorf("Get: ID = %q, want %q", got.ID, entry.ID)
	}
	if got.Kind != "single" {
		t.Errorf("Get: Kind = %q, want single", got.Kind)
	}
	if got.Title != "Test Entry" {
		t.Errorf("Get: Title = %q, want Test Entry", got.Title)
	}
	if got.FailedIndex != -1 {
		t.Errorf("Get: FailedIndex = %d, want -1", got.FailedIndex)
	}
	if len(got.Applied) != 1 || got.Applied[0].ID != "act1" {
		t.Errorf("Get: Applied = %+v", got.Applied)
	}
}

func TestSqliteHistoryRepository_ListNewestFirst(t *testing.T) {
	repo := newHistoryRepo(t)
	base := time.Now().Unix()

	ids := []string{"hist-oldest", "hist-middle", "hist-newest"}
	for i, id := range ids {
		if err := repo.Add(makeEntry(id, "single", fmt.Sprintf("Entry %d", i), base+int64(i)), 100); err != nil {
			t.Fatalf("Add %q: %v", id, err)
		}
	}

	list, err := repo.List(10, 0)
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	if len(list) != 3 {
		t.Fatalf("List: got %d entries, want 3", len(list))
	}
	if list[0].ID != "hist-newest" {
		t.Errorf("List[0]: ID = %q, want hist-newest", list[0].ID)
	}
	if list[2].ID != "hist-oldest" {
		t.Errorf("List[2]: ID = %q, want hist-oldest", list[2].ID)
	}
}

func TestSqliteHistoryRepository_PruneToExactlyN(t *testing.T) {
	repo := newHistoryRepo(t)
	const maxEntries = int64(3)
	base := time.Now().Unix()

	for i := 0; i < 5; i++ {
		id := fmt.Sprintf("prune-%d", i)
		if err := repo.Add(makeEntry(id, "single", fmt.Sprintf("Entry %d", i), base+int64(i)), maxEntries); err != nil {
			t.Fatalf("Add %d: %v", i, err)
		}
	}

	n, err := repo.Count()
	if err != nil {
		t.Fatalf("Count: %v", err)
	}
	if n != maxEntries {
		t.Errorf("Count after prune: got %d, want %d", n, maxEntries)
	}

	list, err := repo.List(10, 0)
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	if list[0].ID != "prune-4" {
		t.Errorf("Newest entry: ID = %q, want prune-4", list[0].ID)
	}
}

func TestSqliteHistoryRepository_PruneWhenMaxEntriesLowered(t *testing.T) {
	repo := newHistoryRepo(t)
	base := time.Now().Unix()

	for i := 0; i < 5; i++ {
		id := fmt.Sprintf("lower-%d", i)
		if err := repo.Add(makeEntry(id, "single", fmt.Sprintf("Entry %d", i), base+int64(i)), 10); err != nil {
			t.Fatalf("Add %d: %v", i, err)
		}
	}

	n0, _ := repo.Count()
	if n0 != 5 {
		t.Fatalf("Before lowering: Count = %d, want 5", n0)
	}

	if err := repo.Add(makeEntry("lower-final", "single", "Final", base+5), 3); err != nil {
		t.Fatalf("Add final: %v", err)
	}

	n, err := repo.Count()
	if err != nil {
		t.Fatalf("Count: %v", err)
	}
	if n != 3 {
		t.Errorf("Count after lowered maxEntries: got %d, want 3", n)
	}
}

func TestSqliteHistoryRepository_Delete(t *testing.T) {
	repo := newHistoryRepo(t)

	if err := repo.Add(makeEntry("del-hist", "single", "Delete Me", time.Now().Unix()), 100); err != nil {
		t.Fatalf("Add: %v", err)
	}

	if err := repo.Delete("del-hist"); err != nil {
		t.Fatalf("Delete: %v", err)
	}

	if _, err := repo.Get("del-hist"); err == nil {
		t.Error("Get after Delete: expected error, got nil")
	}

	n, _ := repo.Count()
	if n != 0 {
		t.Errorf("Count after Delete: got %d, want 0", n)
	}
}

func TestSqliteHistoryRepository_Clear(t *testing.T) {
	repo := newHistoryRepo(t)
	base := time.Now().Unix()

	for i := 0; i < 3; i++ {
		if err := repo.Add(makeEntry(fmt.Sprintf("clr-%d", i), "single", fmt.Sprintf("Clr %d", i), base+int64(i)), 100); err != nil {
			t.Fatalf("Add %d: %v", i, err)
		}
	}

	if err := repo.Clear(); err != nil {
		t.Fatalf("Clear: %v", err)
	}

	n, err := repo.Count()
	if err != nil {
		t.Fatalf("Count: %v", err)
	}
	if n != 0 {
		t.Errorf("Count after Clear: got %d, want 0", n)
	}
}

func TestSqliteHistoryRepository_Count(t *testing.T) {
	repo := newHistoryRepo(t)
	base := time.Now().Unix()

	n0, err := repo.Count()
	if err != nil {
		t.Fatalf("Count (initial): %v", err)
	}
	if n0 != 0 {
		t.Errorf("Count (initial): got %d, want 0", n0)
	}

	for i := 0; i < 4; i++ {
		if err := repo.Add(makeEntry(fmt.Sprintf("cnt-%d", i), "single", fmt.Sprintf("Count %d", i), base+int64(i)), 100); err != nil {
			t.Fatalf("Add %d: %v", i, err)
		}
	}

	n4, err := repo.Count()
	if err != nil {
		t.Fatalf("Count (4): %v", err)
	}
	if n4 != 4 {
		t.Errorf("Count (4): got %d, want 4", n4)
	}
}
