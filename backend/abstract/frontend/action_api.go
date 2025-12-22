package frontend

import (
	"go_text/backend/model/action"
)

type ActionApi interface {
	GetActionGroups() (*action.Actions, error)
	ProcessAction(action action.ActionRequest) (string, error)
}
