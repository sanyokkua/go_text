package backend_api

import (
	"go_text/internal/v2/model/action"
)

type CompletionApi interface {
	ProcessAction(action action.ActionRequest) (string, error)
}
