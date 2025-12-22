package api

import (
	"go_text/backend/v2/model/action"
)

type ActionApi interface {
	GetActionGroups() (*action.Actions, error)
	ProcessAction(action action.ActionRequest) (string, error)
}
