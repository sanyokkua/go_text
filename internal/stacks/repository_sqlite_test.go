package stacks

import (
	"context"
	"path/filepath"
	"testing"

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

func newStackRepo(t *testing.T) *SqliteStackRepository {
	t.Helper()
	return NewSqliteStackRepository(openTestDB(t))
}

func TestSqliteStackRepository_CreateAndGet(t *testing.T) {
	repo := newStackRepo(t)

	in := apperr.SavedStack{
		Name:           "My Test Stack",
		Icon:           "star",
		Steps:          []string{"basicProofreading", "conciseRewrite"},
		DefaultFormat:  "markdown",
		DefaultInLang:  "English",
		DefaultOutLang: "Ukrainian",
	}

	got, err := repo.Create(in)
	if err != nil {
		t.Fatalf("Create: %v", err)
	}
	if got.ID == "" {
		t.Error("Create: ID should be set")
	}
	if got.CreatedAt == 0 {
		t.Error("Create: CreatedAt should be set")
	}
	if got.UpdatedAt == 0 {
		t.Error("Create: UpdatedAt should be set")
	}
	if got.Name != in.Name {
		t.Errorf("Create: Name = %q, want %q", got.Name, in.Name)
	}
	if got.Icon != in.Icon {
		t.Errorf("Create: Icon = %q, want %q", got.Icon, in.Icon)
	}

	fetched, err := repo.Get(got.ID)
	if err != nil {
		t.Fatalf("Get: %v", err)
	}
	if fetched.Name != got.Name {
		t.Errorf("Get: Name = %q, want %q", fetched.Name, got.Name)
	}
	if len(fetched.Steps) != 2 || fetched.Steps[0] != "basicProofreading" || fetched.Steps[1] != "conciseRewrite" {
		t.Errorf("Get: Steps = %v, want [basicProofreading conciseRewrite]", fetched.Steps)
	}
}

func TestSqliteStackRepository_StepsOrderedByPosition(t *testing.T) {
	repo := newStackRepo(t)

	steps := []string{"actionC", "actionA", "actionB"}
	got, err := repo.Create(apperr.SavedStack{Name: "Ordering Test", Icon: "list", Steps: steps})
	if err != nil {
		t.Fatalf("Create: %v", err)
	}

	fetched, err := repo.Get(got.ID)
	if err != nil {
		t.Fatalf("Get: %v", err)
	}
	for i, want := range steps {
		if i >= len(fetched.Steps) || fetched.Steps[i] != want {
			t.Errorf("Steps[%d] = %q, want %q", i, fetched.Steps[i], want)
		}
	}
}

func TestSqliteStackRepository_ListAlphabetical(t *testing.T) {
	repo := newStackRepo(t)

	for _, name := range []string{"Zebra Stack", "Apple Stack", "Middle Stack"} {
		if _, err := repo.Create(apperr.SavedStack{Name: name, Icon: "box", Steps: []string{"basicProofreading"}}); err != nil {
			t.Fatalf("Create %q: %v", name, err)
		}
	}

	all, err := repo.List()
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	for i := 1; i < len(all); i++ {
		if all[i].Name < all[i-1].Name {
			t.Errorf("List not alphabetical at [%d]: %q before %q", i, all[i-1].Name, all[i].Name)
		}
	}
}

func TestSqliteStackRepository_UpdateReplacesStepsTransactionally(t *testing.T) {
	repo := newStackRepo(t)

	original, err := repo.Create(apperr.SavedStack{
		Name:  "Update Test Stack",
		Icon:  "edit",
		Steps: []string{"basicProofreading", "professional"},
	})
	if err != nil {
		t.Fatalf("Create: %v", err)
	}

	updated, err := repo.Update(apperr.SavedStack{
		ID:        original.ID,
		Name:      "Update Test Stack",
		Icon:      "edit-2",
		Steps:     []string{"conciseRewrite", "formal", "diplomatic"},
		CreatedAt: original.CreatedAt,
	})
	if err != nil {
		t.Fatalf("Update: %v", err)
	}
	if updated.Icon != "edit-2" {
		t.Errorf("Update: Icon = %q, want edit-2", updated.Icon)
	}
	if len(updated.Steps) != 3 {
		t.Errorf("Update: Steps = %v, want 3 steps", updated.Steps)
	}

	fetched, err := repo.Get(original.ID)
	if err != nil {
		t.Fatalf("Get after Update: %v", err)
	}
	if len(fetched.Steps) != 3 || fetched.Steps[0] != "conciseRewrite" {
		t.Errorf("Get after Update: Steps = %v, want [conciseRewrite formal diplomatic]", fetched.Steps)
	}
}

func TestSqliteStackRepository_DeleteCascadesSteps(t *testing.T) {
	repo := newStackRepo(t)

	created, err := repo.Create(apperr.SavedStack{
		Name:  "Delete Cascade Test",
		Icon:  "trash",
		Steps: []string{"basicProofreading", "professional"},
	})
	if err != nil {
		t.Fatalf("Create: %v", err)
	}

	if err := repo.Delete(created.ID); err != nil {
		t.Fatalf("Delete: %v", err)
	}

	if _, err := repo.Get(created.ID); err == nil {
		t.Error("Get after Delete: expected error, got nil")
	}

	steps, err := repo.database.Queries.GetStackSteps(context.Background(), created.ID)
	if err != nil {
		t.Fatalf("GetStackSteps after Delete: %v", err)
	}
	if len(steps) != 0 {
		t.Errorf("Steps after cascade Delete: got %d, want 0", len(steps))
	}
}

func TestSqliteStackRepository_DuplicateNameValidation(t *testing.T) {
	repo := newStackRepo(t)

	if _, err := repo.Create(apperr.SavedStack{Name: "Unique Stack", Icon: "x", Steps: []string{"basicProofreading"}}); err != nil {
		t.Fatalf("Create: %v", err)
	}

	if _, err := repo.Create(apperr.SavedStack{Name: "Unique Stack", Icon: "x", Steps: []string{"basicProofreading"}}); err == nil {
		t.Error("Create with duplicate name: expected error, got nil")
	}
}

func TestSqliteStackRepository_Duplicate(t *testing.T) {
	repo := newStackRepo(t)

	original, err := repo.Create(apperr.SavedStack{
		Name:           "Original Stack",
		Icon:           "copy",
		Steps:          []string{"basicProofreading", "professional"},
		DefaultFormat:  "plain",
		DefaultInLang:  "English",
		DefaultOutLang: "Spanish",
	})
	if err != nil {
		t.Fatalf("Create: %v", err)
	}

	dup, err := repo.Duplicate(original.ID)
	if err != nil {
		t.Fatalf("Duplicate: %v", err)
	}
	if dup.ID == original.ID {
		t.Error("Duplicate: ID must differ from original")
	}
	if dup.Name == original.Name {
		t.Error("Duplicate: Name must differ from original")
	}
	if dup.Icon != original.Icon {
		t.Errorf("Duplicate: Icon = %q, want %q", dup.Icon, original.Icon)
	}
	if len(dup.Steps) != len(original.Steps) {
		t.Fatalf("Duplicate: Steps count = %d, want %d", len(dup.Steps), len(original.Steps))
	}
	for i := range original.Steps {
		if dup.Steps[i] != original.Steps[i] {
			t.Errorf("Duplicate: Steps[%d] = %q, want %q", i, dup.Steps[i], original.Steps[i])
		}
	}
	if dup.DefaultFormat != original.DefaultFormat {
		t.Errorf("Duplicate: DefaultFormat = %q, want %q", dup.DefaultFormat, original.DefaultFormat)
	}
}
