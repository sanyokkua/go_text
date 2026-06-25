package stacks

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"go_text/internal/apperr"
	"go_text/internal/db"
	"go_text/internal/db/store"
)

// SqliteStackRepository is the SQLite-backed implementation of StackRepositoryAPI.
type SqliteStackRepository struct {
	database *db.Database
}

// NewSqliteStackRepository constructs a stack repository backed by database.
func NewSqliteStackRepository(database *db.Database) *SqliteStackRepository {
	if database == nil {
		panic("SqliteStackRepository: database cannot be nil")
	}
	return &SqliteStackRepository{database: database}
}

func (r *SqliteStackRepository) bg() context.Context { return context.Background() }

func isUniqueViolation(err error) bool {
	return err != nil && strings.Contains(err.Error(), "UNIQUE constraint failed")
}

func rowToSavedStack(row store.Stack, steps []string) apperr.SavedStack {
	if steps == nil {
		steps = []string{}
	}
	return apperr.SavedStack{
		ID:             row.ID,
		Name:           row.Name,
		Icon:           row.Icon,
		Steps:          steps,
		DefaultFormat:  row.DefaultFormat,
		DefaultInLang:  row.DefaultInLang,
		DefaultOutLang: row.DefaultOutLang,
		CreatedAt:      row.CreatedAt,
		UpdatedAt:      row.UpdatedAt,
	}
}

func (r *SqliteStackRepository) loadWithSteps(ctx context.Context, q *store.Queries, row store.Stack) (apperr.SavedStack, error) {
	steps, err := q.GetStackSteps(ctx, row.ID)
	if err != nil {
		return apperr.SavedStack{}, fmt.Errorf("get steps for stack %s: %w", row.ID, err)
	}
	return rowToSavedStack(row, steps), nil
}

func (r *SqliteStackRepository) insertSteps(ctx context.Context, q *store.Queries, stackID string, steps []string) error {
	for pos, actionID := range steps {
		if err := q.InsertStackStep(ctx, store.InsertStackStepParams{
			StackID:  stackID,
			Position: int64(pos),
			ActionID: actionID,
		}); err != nil {
			return fmt.Errorf("insert step[%d]: %w", pos, err)
		}
	}
	return nil
}

// List returns all saved stacks ordered alphabetically by name, each with steps.
func (r *SqliteStackRepository) List() ([]apperr.SavedStack, error) {
	const op = "SqliteStackRepository.List"
	ctx := r.bg()
	rows, err := r.database.Queries.ListStacks(ctx)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", op, err)
	}
	stacks := make([]apperr.SavedStack, 0, len(rows))
	for _, row := range rows {
		s, err := r.loadWithSteps(ctx, r.database.Queries, row)
		if err != nil {
			return nil, fmt.Errorf("%s: %w", op, err)
		}
		stacks = append(stacks, s)
	}
	return stacks, nil
}

// Get returns the stack identified by id, including its ordered steps.
func (r *SqliteStackRepository) Get(id string) (*apperr.SavedStack, error) {
	const op = "SqliteStackRepository.Get"
	ctx := r.bg()
	row, err := r.database.Queries.GetStack(ctx, id)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("%s: stack %q not found", op, id)
		}
		return nil, fmt.Errorf("%s: %w", op, err)
	}
	s, err := r.loadWithSteps(ctx, r.database.Queries, row)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", op, err)
	}
	return &s, nil
}

// Create inserts a new stack and its steps in one transaction.
// Returns an error containing "already exists" when the name is not unique.
func (r *SqliteStackRepository) Create(stack apperr.SavedStack) (*apperr.SavedStack, error) {
	const op = "SqliteStackRepository.Create"
	ctx := r.bg()
	now := time.Now().Unix()
	id := uuid.NewString()

	tx, err := r.database.DB.BeginTx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("%s: begin tx: %w", op, err)
	}
	defer func() { _ = tx.Rollback() }()

	q := r.database.Queries.WithTx(tx)
	if err := q.InsertStack(ctx, store.InsertStackParams{
		ID:             id,
		Name:           stack.Name,
		Icon:           stack.Icon,
		DefaultFormat:  stack.DefaultFormat,
		DefaultInLang:  stack.DefaultInLang,
		DefaultOutLang: stack.DefaultOutLang,
		CreatedAt:      now,
		UpdatedAt:      now,
	}); err != nil {
		if isUniqueViolation(err) {
			return nil, fmt.Errorf("%s: stack name %q already exists", op, stack.Name)
		}
		return nil, fmt.Errorf("%s: insert stack: %w", op, err)
	}

	if err := r.insertSteps(ctx, q, id, stack.Steps); err != nil {
		return nil, fmt.Errorf("%s: %w", op, err)
	}

	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("%s: commit: %w", op, err)
	}

	steps := stack.Steps
	if steps == nil {
		steps = []string{}
	}
	return &apperr.SavedStack{
		ID:             id,
		Name:           stack.Name,
		Icon:           stack.Icon,
		Steps:          steps,
		DefaultFormat:  stack.DefaultFormat,
		DefaultInLang:  stack.DefaultInLang,
		DefaultOutLang: stack.DefaultOutLang,
		CreatedAt:      now,
		UpdatedAt:      now,
	}, nil
}

// Update replaces stack metadata and all steps in one transaction.
// Returns an error containing "already exists" when the new name conflicts.
func (r *SqliteStackRepository) Update(stack apperr.SavedStack) (*apperr.SavedStack, error) {
	const op = "SqliteStackRepository.Update"
	ctx := r.bg()
	now := time.Now().Unix()

	tx, err := r.database.DB.BeginTx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("%s: begin tx: %w", op, err)
	}
	defer func() { _ = tx.Rollback() }()

	q := r.database.Queries.WithTx(tx)
	if err := q.UpdateStack(ctx, store.UpdateStackParams{
		ID:             stack.ID,
		Name:           stack.Name,
		Icon:           stack.Icon,
		DefaultFormat:  stack.DefaultFormat,
		DefaultInLang:  stack.DefaultInLang,
		DefaultOutLang: stack.DefaultOutLang,
		UpdatedAt:      now,
	}); err != nil {
		if isUniqueViolation(err) {
			return nil, fmt.Errorf("%s: stack name %q already exists", op, stack.Name)
		}
		return nil, fmt.Errorf("%s: update stack: %w", op, err)
	}

	if err := q.DeleteAllStackSteps(ctx, stack.ID); err != nil {
		return nil, fmt.Errorf("%s: delete steps: %w", op, err)
	}

	if err := r.insertSteps(ctx, q, stack.ID, stack.Steps); err != nil {
		return nil, fmt.Errorf("%s: %w", op, err)
	}

	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("%s: commit: %w", op, err)
	}

	steps := stack.Steps
	if steps == nil {
		steps = []string{}
	}
	return &apperr.SavedStack{
		ID:             stack.ID,
		Name:           stack.Name,
		Icon:           stack.Icon,
		Steps:          steps,
		DefaultFormat:  stack.DefaultFormat,
		DefaultInLang:  stack.DefaultInLang,
		DefaultOutLang: stack.DefaultOutLang,
		CreatedAt:      stack.CreatedAt,
		UpdatedAt:      now,
	}, nil
}

// Delete removes the stack and its steps (ON DELETE CASCADE).
func (r *SqliteStackRepository) Delete(id string) error {
	const op = "SqliteStackRepository.Delete"
	if err := r.database.Queries.DeleteStack(r.bg(), id); err != nil {
		return fmt.Errorf("%s: %w", op, err)
	}
	return nil
}

// Duplicate copies the stack identified by id, appending " (copy)" to the name.
// Returns an error if the copy name conflicts with an existing stack.
func (r *SqliteStackRepository) Duplicate(id string) (*apperr.SavedStack, error) {
	const op = "SqliteStackRepository.Duplicate"
	original, err := r.Get(id)
	if err != nil {
		return nil, fmt.Errorf("%s: get original: %w", op, err)
	}
	result, err := r.Create(apperr.SavedStack{
		Name:           original.Name + " (copy)",
		Icon:           original.Icon,
		Steps:          original.Steps,
		DefaultFormat:  original.DefaultFormat,
		DefaultInLang:  original.DefaultInLang,
		DefaultOutLang: original.DefaultOutLang,
	})
	if err != nil {
		return nil, fmt.Errorf("%s: %w", op, err)
	}
	return result, nil
}
