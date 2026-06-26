package history

import (
	"fmt"

	"go_text/internal/apperr"

	"github.com/rs/zerolog"
	"github.com/wailsapp/wails/v2/pkg/logger"
)

const panicMsgFmt = "panic: %v"

// HistoryHandler is the Wails-bound handler for history CRUD.
// All bound methods follow the envelope pattern: return apperr.*Result,
// no error return, and include defer/recover for panic safety.
type HistoryHandler struct {
	logger  logger.Logger
	zlog    zerolog.Logger
	service HistoryServiceAPI
}

// NewHistoryHandler constructs a HistoryHandler.
func NewHistoryHandler(
	wailsLogger logger.Logger,
	zlog zerolog.Logger,
	service HistoryServiceAPI,
) *HistoryHandler {
	return &HistoryHandler{logger: wailsLogger, zlog: zlog, service: service}
}

// ListHistory returns history entries paginated by limit/offset, newest first.
func (h *HistoryHandler) ListHistory(limit, offset int) (res apperr.HistoryListResult) {
	defer func() {
		if r := recover(); r != nil {
			ae := apperr.Internal(fmt.Errorf(panicMsgFmt, r))
			wire := apperr.ToWire(h.zlog, ae)
			res = apperr.HistoryListResult{Error: &wire}
		}
	}()
	data, err := h.service.List(int64(limit), int64(offset))
	if err != nil {
		wire := apperr.ToWire(h.zlog, err)
		return apperr.HistoryListResult{Error: &wire}
	}
	if data == nil {
		data = []apperr.HistoryEntry{}
	}
	return apperr.HistoryListResult{Data: data}
}

// GetHistoryEntry returns a single history entry by ID.
func (h *HistoryHandler) GetHistoryEntry(id string) (res apperr.HistoryEntryResult) {
	defer func() {
		if r := recover(); r != nil {
			ae := apperr.Internal(fmt.Errorf(panicMsgFmt, r))
			wire := apperr.ToWire(h.zlog, ae)
			res = apperr.HistoryEntryResult{Error: &wire}
		}
	}()
	entry, err := h.service.Get(id)
	if err != nil {
		wire := apperr.ToWire(h.zlog, err)
		return apperr.HistoryEntryResult{Error: &wire}
	}
	return apperr.HistoryEntryResult{Data: entry}
}

// DeleteHistoryEntry removes a single history entry by ID.
func (h *HistoryHandler) DeleteHistoryEntry(id string) (res apperr.VoidResult) {
	defer func() {
		if r := recover(); r != nil {
			ae := apperr.Internal(fmt.Errorf(panicMsgFmt, r))
			wire := apperr.ToWire(h.zlog, ae)
			res = apperr.VoidResult{Error: &wire}
		}
	}()
	if err := h.service.Delete(id); err != nil {
		wire := apperr.ToWire(h.zlog, err)
		return apperr.VoidResult{Error: &wire}
	}
	return apperr.VoidResult{}
}

// ClearHistory removes all history entries.
func (h *HistoryHandler) ClearHistory() (res apperr.VoidResult) {
	defer func() {
		if r := recover(); r != nil {
			ae := apperr.Internal(fmt.Errorf(panicMsgFmt, r))
			wire := apperr.ToWire(h.zlog, ae)
			res = apperr.VoidResult{Error: &wire}
		}
	}()
	if err := h.service.Clear(); err != nil {
		wire := apperr.ToWire(h.zlog, err)
		return apperr.VoidResult{Error: &wire}
	}
	return apperr.VoidResult{}
}
