package backend

import (
	"go_text/backend/model/action"
)

type CompletionApi interface {
	ProcessAction(action action.ActionRequest) (string, error)
}
