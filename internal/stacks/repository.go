package stacks

import "go_text/internal/apperr"

// StackRepositoryAPI is the contract for the SQLite stacks repository.
// All methods use context.Background() internally — Wails bound callers supply no ctx.
type StackRepositoryAPI interface {
	List() ([]apperr.SavedStack, error)
	Get(id string) (*apperr.SavedStack, error)
	Create(stack apperr.SavedStack) (*apperr.SavedStack, error)
	Update(stack apperr.SavedStack) (*apperr.SavedStack, error)
	Delete(id string) error
	Duplicate(id string) (*apperr.SavedStack, error)
}
