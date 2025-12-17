package api

import (
	"go_text/internal/v2/model/action"
)

type ActionApi interface {
	GetActionGroups() (*action.Actions, error)
	ProcessAction(action action.ActionRequest) (string, error)
}
