package backend

import (
	"go_text/backend/v2/model/action"
)

type CompletionApi interface {
	ProcessAction(action action.ActionRequest) (string, error)
}
