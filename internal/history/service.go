package history

import (
	"errors"
	"fmt"

	"go_text/internal/apperr"
	"go_text/internal/settings"

	"github.com/wailsapp/wails/v2/pkg/logger"
)

// historySettingsAPI is the minimal contract HistoryService needs from the settings service.
type historySettingsAPI interface {
	GetAppBehaviorConfig() (*settings.AppBehaviorConfig, error)
}

// HistoryServiceAPI is the contract consumed by ActionService and HistoryHandler.
type HistoryServiceAPI interface {
	// Record writes one history entry if history is enabled.
	// All errors are logged and swallowed — recording must never break a run.
	Record(entry apperr.HistoryEntry)
	List(limit, offset int64) ([]apperr.HistoryEntry, error)
	Get(id string) (*apperr.HistoryEntry, error)
	Delete(id string) error
	Clear() error
	Count() (int64, error)
}

// HistoryService implements HistoryServiceAPI.
// repo is nil-safe: Record is a no-op before Init wires it; CRUD returns error when nil.
type HistoryService struct {
	logger   logger.Logger
	repo     HistoryRepositoryAPI
	settings historySettingsAPI
}

// NewHistoryService constructs a HistoryService. Panics on nil dependencies.
// Returns *HistoryService (concrete) so ApplicationContextHolder can call SetRepository.
func NewHistoryService(wailsLogger logger.Logger, settingsService historySettingsAPI) *HistoryService {
	const op = "HistoryService.NewHistoryService"
	if wailsLogger == nil {
		panic(fmt.Sprintf("%s: logger cannot be nil", op))
	}
	if settingsService == nil {
		panic(fmt.Sprintf("%s: settings service cannot be nil", op))
	}
	wailsLogger.Info(fmt.Sprintf("[%s] Initializing history service", op))
	return &HistoryService{logger: wailsLogger, settings: settingsService}
}

// SetRepository wires the SQLite-backed repository after the DB is open.
// Called from ApplicationContextHolder.Init.
func (s *HistoryService) SetRepository(repo HistoryRepositoryAPI) {
	s.repo = repo
}

// Record writes one history entry when history is enabled.
// Errors from settings or the repository are WARN-logged and swallowed.
func (s *HistoryService) Record(entry apperr.HistoryEntry) {
	const op = "HistoryService.Record"
	if s.repo == nil {
		return
	}
	cfg, err := s.settings.GetAppBehaviorConfig()
	if err != nil {
		s.logger.Warning(fmt.Sprintf("[%s] get config: %v", op, err))
		return
	}
	if cfg == nil || !cfg.HistoryEnabled {
		return
	}
	maxEntries := int64(cfg.HistoryMaxEntries)
	if addErr := s.repo.Add(entry, maxEntries); addErr != nil {
		s.logger.Warning(fmt.Sprintf("[%s] add entry: %v", op, addErr))
	}
}

func (s *HistoryService) List(limit, offset int64) ([]apperr.HistoryEntry, error) {
	if s.repo == nil {
		return nil, apperr.Internal(errors.New("history repository not initialized"))
	}
	return s.repo.List(limit, offset)
}

func (s *HistoryService) Get(id string) (*apperr.HistoryEntry, error) {
	if s.repo == nil {
		return nil, apperr.Internal(errors.New("history repository not initialized"))
	}
	return s.repo.Get(id)
}

func (s *HistoryService) Delete(id string) error {
	if s.repo == nil {
		return apperr.Internal(errors.New("history repository not initialized"))
	}
	return s.repo.Delete(id)
}

func (s *HistoryService) Clear() error {
	if s.repo == nil {
		return apperr.Internal(errors.New("history repository not initialized"))
	}
	return s.repo.Clear()
}

func (s *HistoryService) Count() (int64, error) {
	if s.repo == nil {
		return 0, apperr.Internal(errors.New("history repository not initialized"))
	}
	return s.repo.Count()
}
