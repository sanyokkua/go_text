package api

import (
	"go_text/internal/v2/model/action"
)

type actionService struct {
}

func (a *actionService) GetActionGroups() (*action.Actions, error) {
	//TODO implement me
	panic("implement me")
}

func (a *actionService) ProcessAction(action action.ActionRequest) (string, error) {
	//TODO implement me
	panic("implement me")
}
