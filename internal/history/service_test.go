package history

import (
	"errors"
	"testing"

	"go_text/internal/apperr"
	"go_text/internal/settings"
)

// --- mock settings service ---

type mockSettingsSvc struct {
	cfg *settings.AppBehaviorConfig
	err error
}

func (m *mockSettingsSvc) GetAppBehaviorConfig() (*settings.AppBehaviorConfig, error) {
	return m.cfg, m.err
}

// --- mock repo ---

type mockRepo struct {
	added   []apperr.HistoryEntry
	addErr  error
	listRet []apperr.HistoryEntry
	listErr error
	getErr  error
	delErr  error
}

func (r *mockRepo) Add(entry apperr.HistoryEntry, maxEntries int64) error {
	r.added = append(r.added, entry)
	return r.addErr
}
func (r *mockRepo) List(limit, offset int64) ([]apperr.HistoryEntry, error) {
	return r.listRet, r.listErr
}
func (r *mockRepo) Get(id string) (*apperr.HistoryEntry, error) {
	if r.getErr != nil {
		return nil, r.getErr
	}
	return nil, nil
}
func (r *mockRepo) Delete(id string) error { return r.delErr }
func (r *mockRepo) Clear() error           { return nil }
func (r *mockRepo) Count() (int64, error)  { return 0, nil }

// --- fakeLogger ---

type fakeLogger struct{ warnings []string }

func (f *fakeLogger) Print(msg string)   {}
func (f *fakeLogger) Trace(msg string)   {}
func (f *fakeLogger) Debug(msg string)   {}
func (f *fakeLogger) Info(msg string)    {}
func (f *fakeLogger) Warning(msg string) { f.warnings = append(f.warnings, msg) }
func (f *fakeLogger) Error(msg string)   {}
func (f *fakeLogger) Fatal(msg string)   {}

func disabledSvc(t *testing.T) (*HistoryService, *mockRepo) {
	t.Helper()
	repo := &mockRepo{}
	svc := NewHistoryService(&fakeLogger{}, &mockSettingsSvc{cfg: &settings.AppBehaviorConfig{
		HistoryEnabled:    false,
		HistoryMaxEntries: 100,
	}})
	svc.SetRepository(repo)
	return svc, repo
}

func enabledSvc(t *testing.T, maxEntries int) (*HistoryService, *mockRepo, *fakeLogger) {
	t.Helper()
	repo := &mockRepo{}
	log := &fakeLogger{}
	svc := NewHistoryService(log, &mockSettingsSvc{cfg: &settings.AppBehaviorConfig{
		HistoryEnabled:    true,
		HistoryMaxEntries: maxEntries,
	}})
	svc.SetRepository(repo)
	return svc, repo, log
}

func sampleEntry(status string) apperr.HistoryEntry {
	return apperr.HistoryEntry{Kind: "single", Title: "Proofread", Status: status}
}

func TestHistoryService_Record_DisabledNoWrite(t *testing.T) {
	svc, repo := disabledSvc(t)
	svc.Record(sampleEntry("success"))
	if len(repo.added) != 0 {
		t.Errorf("expected 0 writes when disabled, got %d", len(repo.added))
	}
}

func TestHistoryService_Record_NilRepoNoPanic(t *testing.T) {
	svc := NewHistoryService(&fakeLogger{}, &mockSettingsSvc{cfg: &settings.AppBehaviorConfig{
		HistoryEnabled: true, HistoryMaxEntries: 100,
	}})
	svc.Record(sampleEntry("success")) // must not panic
}

func TestHistoryService_Record_EnabledWrites(t *testing.T) {
	svc, repo, _ := enabledSvc(t, 50)
	svc.Record(sampleEntry("success"))
	if len(repo.added) != 1 {
		t.Fatalf("expected 1 write, got %d", len(repo.added))
	}
	if repo.added[0].Status != "success" {
		t.Errorf("status = %q, want success", repo.added[0].Status)
	}
}

func TestHistoryService_Record_RepoErrorSwallowed(t *testing.T) {
	svc, repo, log := enabledSvc(t, 100)
	repo.addErr = errors.New("disk full")
	svc.Record(sampleEntry("error")) // must not propagate
	if len(log.warnings) == 0 {
		t.Error("expected a warning to be logged on repo error")
	}
}

func TestHistoryService_Record_PassesMaxEntriesToRepo(t *testing.T) {
	svc, _, _ := enabledSvc(t, 77)
	realRepo := newHistoryRepo(t) // from repository_sqlite_test.go (same package)
	svc.SetRepository(realRepo)
	for i := 0; i < 80; i++ {
		svc.Record(apperr.HistoryEntry{Kind: "single", Title: "x", Status: "success"})
	}
	count, err := realRepo.Count()
	if err != nil {
		t.Fatalf("Count: %v", err)
	}
	if count > 77 {
		t.Errorf("count = %d, want <=77 after pruning", count)
	}
}

func TestHistoryService_Record_SettingsErrorSwallowed(t *testing.T) {
	repo := &mockRepo{}
	log := &fakeLogger{}
	svc := NewHistoryService(log, &mockSettingsSvc{err: errors.New("settings fail")})
	svc.SetRepository(repo)
	svc.Record(sampleEntry("success")) // must not propagate
	if len(repo.added) != 0 {
		t.Errorf("expected 0 writes when settings fail, got %d", len(repo.added))
	}
	if len(log.warnings) == 0 {
		t.Error("expected warning on settings error")
	}
}

func TestHistoryService_List_NoRepo(t *testing.T) {
	svc := NewHistoryService(&fakeLogger{}, &mockSettingsSvc{cfg: &settings.AppBehaviorConfig{}})
	_, err := svc.List(10, 0)
	if err == nil {
		t.Error("expected error when repo is nil")
	}
}

func TestHistoryService_List_DelegatesToRepo(t *testing.T) {
	svc, repo, _ := enabledSvc(t, 100)
	repo.listRet = []apperr.HistoryEntry{sampleEntry("success")}
	got, err := svc.List(10, 0)
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	if len(got) != 1 {
		t.Errorf("expected 1 entry, got %d", len(got))
	}
}

func TestHistoryService_Get_NoRepo(t *testing.T) {
	svc := NewHistoryService(&fakeLogger{}, &mockSettingsSvc{cfg: &settings.AppBehaviorConfig{}})
	_, err := svc.Get("x")
	if err == nil {
		t.Error("expected error when repo is nil")
	}
}

func TestHistoryService_Delete_NoRepo(t *testing.T) {
	svc := NewHistoryService(&fakeLogger{}, &mockSettingsSvc{cfg: &settings.AppBehaviorConfig{}})
	err := svc.Delete("x")
	if err == nil {
		t.Error("expected error when repo is nil")
	}
}

func TestHistoryService_Clear_NoRepo(t *testing.T) {
	svc := NewHistoryService(&fakeLogger{}, &mockSettingsSvc{cfg: &settings.AppBehaviorConfig{}})
	err := svc.Clear()
	if err == nil {
		t.Error("expected error when repo is nil")
	}
}

// Compile-time interface checks.
var _ historySettingsAPI = (*mockSettingsSvc)(nil)
var _ HistoryRepositoryAPI = (*mockRepo)(nil)
