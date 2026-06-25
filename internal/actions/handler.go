package actions

import (
	"github.com/rs/zerolog"
	"github.com/wailsapp/wails/v2/pkg/logger"
)

// ActionHandler is the Wails-bound handler for action-related operations.
// V3 methods (GetCatalog, RunChain, etc.) are added by subsequent feature tasks.
// All future methods must follow the envelope pattern: return apperr.*Result,
// no error return, and include defer/recover for panic safety.
type ActionHandler struct {
	logger        logger.Logger
	zlog          zerolog.Logger
	actionService ActionServiceAPI
}

func NewActionHandler(wailsLogger logger.Logger, zlog zerolog.Logger, actionService ActionServiceAPI) *ActionHandler {
	return &ActionHandler{
		logger:        wailsLogger,
		zlog:          zlog,
		actionService: actionService,
	}
}
