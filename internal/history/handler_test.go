package history

import (
	"errors"
	"testing"

	"go_text/internal/apperr"

	zlog "github.com/rs/zerolog/log"
)

// mockHistoryService satisfies HistoryServiceAPI.
type mockHistoryService struct {
	listRet []apperr.HistoryEntry
	listErr error
	getRet  *apperr.HistoryEntry
	getErr  error
	delErr  error
	clrErr  error
}

func (m *mockHistoryService) Record(_ apperr.HistoryEntry) {}
func (m *mockHistoryService) List(l, o int64) ([]apperr.HistoryEntry, error) {
	return m.listRet, m.listErr
}
func (m *mockHistoryService) Get(id string) (*apperr.HistoryEntry, error) { return m.getRet, m.getErr }
func (m *mockHistoryService) Delete(id string) error                      { return m.delErr }
func (m *mockHistoryService) Clear() error                                { return m.clrErr }
func (m *mockHistoryService) Count() (int64, error)                       { return 0, nil }

func newTestHandler(svc HistoryServiceAPI) *HistoryHandler {
	return NewHistoryHandler(&fakeLogger{}, zlog.Logger, svc)
}

func TestHistoryHandler_ListHistory_Success(t *testing.T) {
	entries := []apperr.HistoryEntry{{ID: "e1", Status: "success", Kind: "single"}}
	h := newTestHandler(&mockHistoryService{listRet: entries})
	res := h.ListHistory(10, 0)
	if res.Error != nil {
		t.Fatalf("unexpected error: %+v", res.Error)
	}
	if len(res.Data) != 1 || res.Data[0].ID != "e1" {
		t.Errorf("unexpected data: %+v", res.Data)
	}
}

func TestHistoryHandler_ListHistory_Error(t *testing.T) {
	h := newTestHandler(&mockHistoryService{listErr: errors.New("db fail")})
	res := h.ListHistory(10, 0)
	if res.Error == nil {
		t.Fatal("expected error in result")
	}
}

func TestHistoryHandler_GetHistoryEntry_Success(t *testing.T) {
	entry := &apperr.HistoryEntry{ID: "e2", Status: "error", Kind: "stack"}
	h := newTestHandler(&mockHistoryService{getRet: entry})
	res := h.GetHistoryEntry("e2")
	if res.Error != nil {
		t.Fatalf("unexpected error: %+v", res.Error)
	}
	if res.Data == nil || res.Data.ID != "e2" {
		t.Errorf("unexpected data: %+v", res.Data)
	}
}

func TestHistoryHandler_GetHistoryEntry_Error(t *testing.T) {
	h := newTestHandler(&mockHistoryService{getErr: errors.New("not found")})
	res := h.GetHistoryEntry("missing")
	if res.Error == nil {
		t.Fatal("expected error in result")
	}
}

func TestHistoryHandler_DeleteHistoryEntry_Success(t *testing.T) {
	h := newTestHandler(&mockHistoryService{})
	res := h.DeleteHistoryEntry("e1")
	if res.Error != nil {
		t.Fatalf("unexpected error: %+v", res.Error)
	}
}

func TestHistoryHandler_DeleteHistoryEntry_Error(t *testing.T) {
	h := newTestHandler(&mockHistoryService{delErr: errors.New("db fail")})
	res := h.DeleteHistoryEntry("e1")
	if res.Error == nil {
		t.Fatal("expected error in result")
	}
}

func TestHistoryHandler_ClearHistory_Success(t *testing.T) {
	h := newTestHandler(&mockHistoryService{})
	res := h.ClearHistory()
	if res.Error != nil {
		t.Fatalf("unexpected error: %+v", res.Error)
	}
}

func TestHistoryHandler_ClearHistory_Error(t *testing.T) {
	h := newTestHandler(&mockHistoryService{clrErr: errors.New("db fail")})
	res := h.ClearHistory()
	if res.Error == nil {
		t.Fatal("expected error in result")
	}
}

func TestHistoryHandler_PanicRecovery_ListHistory(t *testing.T) {
	h := &HistoryHandler{logger: &fakeLogger{}, zlog: zlog.Logger, service: nil}
	res := h.ListHistory(10, 0)
	if res.Error == nil {
		t.Fatal("expected internal error after nil-service panic")
	}
}
