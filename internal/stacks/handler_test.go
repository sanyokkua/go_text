package stacks

import (
	"errors"
	"fmt"
	"reflect"
	"testing"

	"github.com/rs/zerolog"

	"go_text/internal/apperr"
)

// ─── Minimal catalog (enough to exercise planner rules) ─────────────────────

var testCatalog = []apperr.ActionMeta{
	{ID: "conciseRewrite", Family: "Rewrite", ExclusivityGroup: "rewrite-mode", OrderRank: 100, Mergeable: true},
	{ID: "formal", Family: "Rewrite", ExclusivityGroup: "tone", OrderRank: 200, Mergeable: true},
	{ID: "professional", Family: "Rewrite", ExclusivityGroup: "tone", OrderRank: 210, Mergeable: true},
	{ID: "keyPoints", Family: "Summarize", ExclusivityGroup: "summarize-mode", OrderRank: 300, Mergeable: false, Terminal: true},
	{ID: "documentStructuring", Family: "Structure", ExclusivityGroup: "structure-mode", OrderRank: 400, Mergeable: true},
}

// ─── Mock repository ─────────────────────────────────────────────────────────

type mockRepo struct {
	listData   []apperr.SavedStack
	listErr    error
	getData    *apperr.SavedStack
	getErr     error
	createData *apperr.SavedStack
	createErr  error
	updateData *apperr.SavedStack
	updateErr  error
	deleteErr  error
}

func (m *mockRepo) List() ([]apperr.SavedStack, error) { return m.listData, m.listErr }
func (m *mockRepo) Get(_ string) (*apperr.SavedStack, error) {
	return m.getData, m.getErr
}
func (m *mockRepo) Create(s apperr.SavedStack) (*apperr.SavedStack, error) {
	if m.createErr != nil {
		return nil, m.createErr
	}
	if m.createData != nil {
		return m.createData, nil
	}
	s.ID = "new-uuid"
	return &s, nil
}
func (m *mockRepo) Update(s apperr.SavedStack) (*apperr.SavedStack, error) {
	return m.updateData, m.updateErr
}
func (m *mockRepo) Delete(_ string) error { return m.deleteErr }
func (m *mockRepo) Duplicate(_ string) (*apperr.SavedStack, error) {
	return nil, errors.New("not used in handler")
}

func newTestHandler(repo StackRepositoryAPI) *StackHandler {
	return NewStackHandler(nil, zerolog.Nop(), repo, testCatalog, nil)
}

func newSuggestionsHandler(recipes []SuggestedStackRecipe) *StackHandler {
	return NewStackHandler(nil, zerolog.Nop(), &mockRepo{}, testCatalog, recipes)
}

// ─── ListStacks ──────────────────────────────────────────────────────────────

func TestStackHandler_ListStacks_Success(t *testing.T) {
	t.Parallel()
	data := []apperr.SavedStack{
		{ID: "1", Name: "A", Steps: []string{"conciseRewrite"}},
	}
	h := newTestHandler(&mockRepo{listData: data})

	res := h.ListStacks()

	if res.Error != nil {
		t.Fatalf("expected no error, got %v", res.Error)
	}
	if len(res.Data) != 1 {
		t.Fatalf("expected 1 stack, got %d", len(res.Data))
	}
}

func TestStackHandler_ListStacks_FiltersUnknownActionIDs(t *testing.T) {
	t.Parallel()
	data := []apperr.SavedStack{
		{ID: "1", Name: "A", Steps: []string{"conciseRewrite", "unknownAction", "formal"}},
	}
	h := newTestHandler(&mockRepo{listData: data})

	res := h.ListStacks()

	if res.Error != nil {
		t.Fatalf("expected no error, got %v", res.Error)
	}
	got := res.Data[0].Steps
	if len(got) != 2 {
		t.Fatalf("expected 2 steps after filtering, got %d: %v", len(got), got)
	}
	if got[0] != "conciseRewrite" || got[1] != "formal" {
		t.Errorf("unexpected steps: %v", got)
	}
}

func TestStackHandler_ListStacks_RepoError(t *testing.T) {
	t.Parallel()
	h := newTestHandler(&mockRepo{listErr: errors.New("db failure")})

	res := h.ListStacks()

	if res.Error == nil {
		t.Fatal("expected error, got nil")
	}
	if res.Error.Code != apperr.CodeInternal {
		t.Errorf("expected internal error, got %s", res.Error.Code)
	}
}

func TestStackHandler_ListStacks_EmptyIsNonNilSlice(t *testing.T) {
	t.Parallel()
	h := newTestHandler(&mockRepo{listData: nil})

	res := h.ListStacks()

	if res.Error != nil {
		t.Fatalf("unexpected error: %v", res.Error)
	}
	if res.Data == nil {
		t.Error("expected non-nil empty slice, got nil")
	}
}

// ─── SuggestedStacks ─────────────────────────────────────────────────────────

// suggestCatalog carries display names so ID→Name resolution can be asserted.
var suggestCatalog = []apperr.ActionMeta{
	{ID: "conciseRewrite", Name: "Make Concise", Family: "Rewrite", ExclusivityGroup: "rewrite-mode", OrderRank: 100, Mergeable: true},
	{ID: "formal", Name: "Formal Tone", Family: "Rewrite", ExclusivityGroup: "tone", OrderRank: 200, Mergeable: true},
	{ID: "keyPoints", Name: "Key Points", Family: "Summarize", ExclusivityGroup: "summarize-mode", OrderRank: 300, Mergeable: false, Terminal: true},
}

func newSuggestCatalogHandler(recipes []SuggestedStackRecipe) *StackHandler {
	return NewStackHandler(nil, zerolog.Nop(), &mockRepo{}, suggestCatalog, recipes)
}

func TestStackHandler_SuggestedStacks_ResolvesNames(t *testing.T) {
	t.Parallel()
	recipes := []SuggestedStackRecipe{
		{Name: "Polish", Icon: "sparkles", Actions: []string{"conciseRewrite", "formal"}},
	}
	h := newSuggestCatalogHandler(recipes)

	res := h.SuggestedStacks()

	if res.Error != nil {
		t.Fatalf("unexpected error: %v", res.Error)
	}
	if len(res.Data) != 1 {
		t.Fatalf("expected 1 suggested stack, got %d", len(res.Data))
	}
	got := res.Data[0]
	if got.Name != "Polish" || got.Icon != "sparkles" {
		t.Errorf("unexpected metadata: name=%q icon=%q", got.Name, got.Icon)
	}
	wantIDs := []string{"conciseRewrite", "formal"}
	wantNames := []string{"Make Concise", "Formal Tone"}
	if !reflect.DeepEqual(got.ActionIDs, wantIDs) {
		t.Errorf("ActionIDs: want %v, got %v", wantIDs, got.ActionIDs)
	}
	if !reflect.DeepEqual(got.ActionNames, wantNames) {
		t.Errorf("ActionNames: want %v, got %v", wantNames, got.ActionNames)
	}
}

func TestStackHandler_SuggestedStacks_DropsUnknownActionIDs(t *testing.T) {
	t.Parallel()
	recipes := []SuggestedStackRecipe{
		{Name: "Mixed", Icon: "wand", Actions: []string{"conciseRewrite", "ghostAction", "keyPoints"}},
	}
	h := newSuggestCatalogHandler(recipes)

	res := h.SuggestedStacks()

	if res.Error != nil {
		t.Fatalf("unexpected error: %v", res.Error)
	}
	got := res.Data[0]
	// "ghostAction" is dropped from both index-aligned slices.
	wantIDs := []string{"conciseRewrite", "keyPoints"}
	wantNames := []string{"Make Concise", "Key Points"}
	if !reflect.DeepEqual(got.ActionIDs, wantIDs) {
		t.Errorf("ActionIDs: want %v, got %v", wantIDs, got.ActionIDs)
	}
	if !reflect.DeepEqual(got.ActionNames, wantNames) {
		t.Errorf("ActionNames: want %v, got %v", wantNames, got.ActionNames)
	}
	if len(got.ActionIDs) != len(got.ActionNames) {
		t.Errorf("ActionIDs and ActionNames must stay index-aligned: %v vs %v", got.ActionIDs, got.ActionNames)
	}
}

func TestStackHandler_SuggestedStacks_OnePerRecipe(t *testing.T) {
	t.Parallel()
	recipes := []SuggestedStackRecipe{
		{Name: "A", Icon: "a", Actions: []string{"conciseRewrite"}},
		{Name: "B", Icon: "b", Actions: []string{"formal"}},
		{Name: "C", Icon: "c", Actions: []string{"keyPoints"}},
	}
	h := newSuggestCatalogHandler(recipes)

	res := h.SuggestedStacks()

	if res.Error != nil {
		t.Fatalf("unexpected error: %v", res.Error)
	}
	if len(res.Data) != len(recipes) {
		t.Fatalf("expected %d suggested stacks, got %d", len(recipes), len(res.Data))
	}
	for i, r := range recipes {
		if res.Data[i].Name != r.Name {
			t.Errorf("index %d: want name %q, got %q", i, r.Name, res.Data[i].Name)
		}
	}
}

func TestStackHandler_SuggestedStacks_EmptyRecipes(t *testing.T) {
	t.Parallel()
	h := newSuggestionsHandler(nil)

	res := h.SuggestedStacks()

	if res.Error != nil {
		t.Fatalf("unexpected error: %v", res.Error)
	}
	if len(res.Data) != 0 {
		t.Errorf("expected zero suggested stacks, got %d", len(res.Data))
	}
}

func TestStackHandler_SuggestedStacks_AllUnknownDropsToEmptySlices(t *testing.T) {
	t.Parallel()
	recipes := []SuggestedStackRecipe{
		{Name: "Stale", Icon: "trash", Actions: []string{"gone1", "gone2"}},
	}
	h := newSuggestCatalogHandler(recipes)

	res := h.SuggestedStacks()

	if res.Error != nil {
		t.Fatalf("unexpected error: %v", res.Error)
	}
	got := res.Data[0]
	if len(got.ActionIDs) != 0 || len(got.ActionNames) != 0 {
		t.Errorf("expected all actions dropped, got IDs=%v Names=%v", got.ActionIDs, got.ActionNames)
	}
}

// ─── GetStack ────────────────────────────────────────────────────────────────

func TestStackHandler_GetStack_Success(t *testing.T) {
	t.Parallel()
	stack := &apperr.SavedStack{ID: "x", Name: "Test", Steps: []string{"formal"}}
	h := newTestHandler(&mockRepo{getData: stack})

	res := h.GetStack("x")

	if res.Error != nil {
		t.Fatalf("unexpected error: %v", res.Error)
	}
	if res.Data == nil || res.Data.ID != "x" {
		t.Error("wrong stack returned")
	}
}

func TestStackHandler_GetStack_FiltersUnknown(t *testing.T) {
	t.Parallel()
	stack := &apperr.SavedStack{ID: "x", Name: "Test", Steps: []string{"unknownAction", "keyPoints"}}
	h := newTestHandler(&mockRepo{getData: stack})

	res := h.GetStack("x")

	if res.Error != nil {
		t.Fatalf("unexpected error: %v", res.Error)
	}
	if len(res.Data.Steps) != 1 || res.Data.Steps[0] != "keyPoints" {
		t.Errorf("expected filtered steps [keyPoints], got %v", res.Data.Steps)
	}
}

func TestStackHandler_GetStack_NotFound(t *testing.T) {
	t.Parallel()
	h := newTestHandler(&mockRepo{getErr: fmt.Errorf("stack %q not found", "x")})

	res := h.GetStack("x")

	if res.Error == nil {
		t.Fatal("expected error")
	}
	if res.Error.Code != apperr.CodeValidation {
		t.Errorf("expected validation code, got %s", res.Error.Code)
	}
}

// ─── CreateStack ─────────────────────────────────────────────────────────────

func TestStackHandler_CreateStack_Success(t *testing.T) {
	t.Parallel()
	h := newTestHandler(&mockRepo{})

	res := h.CreateStack(apperr.SavedStack{
		Name:  "My Stack",
		Steps: []string{"conciseRewrite", "formal"},
	})

	if res.Error != nil {
		t.Fatalf("unexpected error: %v", res.Error)
	}
	if res.Data == nil {
		t.Error("expected non-nil data")
	}
}

func TestStackHandler_CreateStack_EmptyName(t *testing.T) {
	t.Parallel()
	h := newTestHandler(&mockRepo{})

	res := h.CreateStack(apperr.SavedStack{Name: "", Steps: []string{"formal"}})

	if res.Error == nil || res.Error.Code != apperr.CodeValidation {
		t.Errorf("expected validation error for empty name, got %v", res.Error)
	}
}

func TestStackHandler_CreateStack_WhitespaceName(t *testing.T) {
	t.Parallel()
	h := newTestHandler(&mockRepo{})

	res := h.CreateStack(apperr.SavedStack{Name: "   ", Steps: []string{"formal"}})

	if res.Error == nil || res.Error.Code != apperr.CodeValidation {
		t.Errorf("expected validation error for whitespace name, got %v", res.Error)
	}
}

func TestStackHandler_CreateStack_DuplicateName(t *testing.T) {
	t.Parallel()
	h := newTestHandler(&mockRepo{createErr: fmt.Errorf(`stack name "My Stack" already exists`)})

	res := h.CreateStack(apperr.SavedStack{Name: "My Stack", Steps: []string{"formal"}})

	if res.Error == nil || res.Error.Code != apperr.CodeValidation {
		t.Errorf("expected validation error for duplicate name, got %v", res.Error)
	}
}

func TestStackHandler_CreateStack_UnknownActionID(t *testing.T) {
	t.Parallel()
	h := newTestHandler(&mockRepo{})

	res := h.CreateStack(apperr.SavedStack{
		Name:  "Test",
		Steps: []string{"unknownAction"},
	})

	if res.Error == nil {
		t.Fatal("expected error for unknown action ID")
	}
	if res.Error.Code != apperr.CodeValidation {
		t.Errorf("expected validation code, got %s", res.Error.Code)
	}
}

func TestStackHandler_CreateStack_ExclusivityViolation(t *testing.T) {
	t.Parallel()
	h := newTestHandler(&mockRepo{})

	// "formal" and "professional" share ExclusivityGroup "tone"
	res := h.CreateStack(apperr.SavedStack{
		Name:  "Test",
		Steps: []string{"conciseRewrite", "formal", "professional"},
	})

	if res.Error == nil || res.Error.Code != apperr.CodeInvalidPlan {
		t.Errorf("expected invalid_plan for exclusivity violation, got %v", res.Error)
	}
}

func TestStackHandler_CreateStack_ValidFourStepStack(t *testing.T) {
	t.Parallel()
	h := newTestHandler(&mockRepo{})

	// 4 steps spanning 4 different exclusivity groups, terminal last → valid
	res := h.CreateStack(apperr.SavedStack{
		Name:  "Valid4Step",
		Steps: []string{"conciseRewrite", "formal", "documentStructuring", "keyPoints"},
	})

	if res.Error != nil {
		t.Fatalf("expected valid 4-step stack, got error: %v", res.Error)
	}
}

// ─── UpdateStack ─────────────────────────────────────────────────────────────

func TestStackHandler_UpdateStack_Success(t *testing.T) {
	t.Parallel()
	updated := &apperr.SavedStack{ID: "1", Name: "Updated", Steps: []string{"formal"}}
	h := newTestHandler(&mockRepo{updateData: updated})

	res := h.UpdateStack(apperr.SavedStack{ID: "1", Name: "Updated", Steps: []string{"formal"}})

	if res.Error != nil {
		t.Fatalf("unexpected error: %v", res.Error)
	}
	if res.Data == nil || res.Data.Name != "Updated" {
		t.Error("expected updated stack returned")
	}
}

func TestStackHandler_UpdateStack_EmptyName(t *testing.T) {
	t.Parallel()
	h := newTestHandler(&mockRepo{})

	res := h.UpdateStack(apperr.SavedStack{ID: "1", Name: "", Steps: []string{"formal"}})

	if res.Error == nil || res.Error.Code != apperr.CodeValidation {
		t.Errorf("expected validation error, got %v", res.Error)
	}
}

func TestStackHandler_UpdateStack_NotFound(t *testing.T) {
	t.Parallel()
	h := newTestHandler(&mockRepo{updateErr: fmt.Errorf("stack not found")})

	res := h.UpdateStack(apperr.SavedStack{ID: "missing", Name: "X", Steps: []string{"formal"}})

	if res.Error == nil || res.Error.Code != apperr.CodeValidation {
		t.Errorf("expected validation error for not found, got %v", res.Error)
	}
}

func TestStackHandler_UpdateStack_ExclusivityViolation(t *testing.T) {
	t.Parallel()
	h := newTestHandler(&mockRepo{})

	res := h.UpdateStack(apperr.SavedStack{
		ID:    "1",
		Name:  "X",
		Steps: []string{"formal", "professional"},
	})

	if res.Error == nil || res.Error.Code != apperr.CodeInvalidPlan {
		t.Errorf("expected invalid_plan, got %v", res.Error)
	}
}

// ─── DeleteStack ─────────────────────────────────────────────────────────────

func TestStackHandler_DeleteStack_Success(t *testing.T) {
	t.Parallel()
	h := newTestHandler(&mockRepo{})

	res := h.DeleteStack("1")

	if res.Error != nil {
		t.Fatalf("unexpected error: %v", res.Error)
	}
}

func TestStackHandler_DeleteStack_RepoError(t *testing.T) {
	t.Parallel()
	h := newTestHandler(&mockRepo{deleteErr: errors.New("db error")})

	res := h.DeleteStack("1")

	if res.Error == nil || res.Error.Code != apperr.CodeInternal {
		t.Errorf("expected internal error, got %v", res.Error)
	}
}

// ─── DuplicateStack ──────────────────────────────────────────────────────────

func TestStackHandler_DuplicateStack_Success(t *testing.T) {
	t.Parallel()
	original := &apperr.SavedStack{ID: "orig", Name: "Original", Steps: []string{"formal"}}
	h := newTestHandler(&mockRepo{getData: original})

	res := h.DuplicateStack("orig", "Copy Name")

	if res.Error != nil {
		t.Fatalf("unexpected error: %v", res.Error)
	}
	if res.Data == nil {
		t.Error("expected non-nil data")
	}
	if res.Data.Name != "Copy Name" {
		t.Errorf("expected name 'Copy Name', got %q", res.Data.Name)
	}
}

func TestStackHandler_DuplicateStack_EmptyNewName(t *testing.T) {
	t.Parallel()
	h := newTestHandler(&mockRepo{})

	res := h.DuplicateStack("orig", "")

	if res.Error == nil || res.Error.Code != apperr.CodeValidation {
		t.Errorf("expected validation error for empty newName, got %v", res.Error)
	}
}

func TestStackHandler_DuplicateStack_WhitespaceNewName(t *testing.T) {
	t.Parallel()
	h := newTestHandler(&mockRepo{})

	res := h.DuplicateStack("orig", "  ")

	if res.Error == nil || res.Error.Code != apperr.CodeValidation {
		t.Errorf("expected validation error for whitespace newName, got %v", res.Error)
	}
}

func TestStackHandler_DuplicateStack_OriginalNotFound(t *testing.T) {
	t.Parallel()
	h := newTestHandler(&mockRepo{getErr: fmt.Errorf("stack not found")})

	res := h.DuplicateStack("missing", "Copy")

	if res.Error == nil || res.Error.Code != apperr.CodeValidation {
		t.Errorf("expected validation error for not-found original, got %v", res.Error)
	}
}

func TestStackHandler_DuplicateStack_NewNameConflict(t *testing.T) {
	t.Parallel()
	original := &apperr.SavedStack{ID: "1", Name: "A", Steps: []string{"formal"}}
	h := newTestHandler(&mockRepo{
		getData:   original,
		createErr: fmt.Errorf(`stack name "Exists" already exists`),
	})

	res := h.DuplicateStack("1", "Exists")

	if res.Error == nil || res.Error.Code != apperr.CodeValidation {
		t.Errorf("expected validation error for name conflict, got %v", res.Error)
	}
}

// ─── Panic recovery ──────────────────────────────────────────────────────────

func TestStackHandler_ListStacks_PanicRecovery(t *testing.T) {
	t.Parallel()
	// nil repo will panic on method call; defer/recover must catch it
	h := &StackHandler{zlog: zerolog.Nop()}

	res := h.ListStacks()

	if res.Error == nil || res.Error.Code != apperr.CodeInternal {
		t.Errorf("expected internal error from panic recovery, got %v", res.Error)
	}
}

func TestStackHandler_CreateStack_PanicRecovery(t *testing.T) {
	t.Parallel()
	// catalogIDs is nil → accessing it will not panic (nil map read is safe in Go)
	// but planner being nil will panic
	h := &StackHandler{zlog: zerolog.Nop()}

	res := h.CreateStack(apperr.SavedStack{Name: "X", Steps: []string{"formal"}})

	if res.Error == nil || res.Error.Code != apperr.CodeInternal {
		t.Errorf("expected internal error from panic recovery, got %v", res.Error)
	}
}
