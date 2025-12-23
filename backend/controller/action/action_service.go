package frontend

import (
	"fmt"
	"go_text/backend/abstract/backend"
	"go_text/backend/abstract/frontend"
	"go_text/backend/model/action"
	"time"
)

type actionService struct {
	logger        backend.LoggingApi
	promptApi     backend.PromptApi
	completionApi backend.CompletionApi
	cachedActions *action.Actions
}

func (a *actionService) GetActionGroups() (*action.Actions, error) {
	startTime := time.Now()
	a.logger.Info("[GetActionGroups] Fetching action groups and prompts")

	if a.cachedActions != nil {
		return a.cachedActions, nil
	}

	appPrompts := a.promptApi.GetAppPrompts()
	a.logger.Trace(fmt.Sprintf("[GetActionGroups] Found %d prompt categories", len(appPrompts.PromptGroups)))

	groups := make([]action.Group, 0, len(appPrompts.PromptGroups))

	for _, category := range appPrompts.PromptGroups {
		a.logger.Trace(fmt.Sprintf("[GetActionGroups] Processing category: %s", category.GroupName))
		a.logger.Trace(fmt.Sprintf("[GetActionGroups] Retrieved %d prompts for category '%s'", len(category.Prompts), category.GroupName))

		actions := make([]action.Action, 0, len(category.Prompts))
		for _, prompt := range category.Prompts {
			actions = append(actions, action.Action{
				ID:   prompt.ID,
				Text: prompt.Name,
			})
		}

		groups = append(groups, action.Group{
			GroupName:    category.GroupName,
			GroupActions: actions,
		})
	}

	result := &action.Actions{
		ActionGroups: groups,
	}

	a.cachedActions = result
	duration := time.Since(startTime)
	a.logger.Info(fmt.Sprintf("[GetActionGroups] Successfully retrieved %d action groups with %d total actions in %v", len(groups), len(result.ActionGroups), duration))

	return result, nil
}

func (a *actionService) ProcessAction(actionReq action.ActionRequest) (string, error) {
	startTime := time.Now()
	a.logger.Info(fmt.Sprintf("[ProcessAction] Processing action: %s", actionReq.ID))

	result, err := a.completionApi.ProcessAction(actionReq)
	if err != nil {
		a.logger.Error(fmt.Sprintf("[ProcessAction] Failed to process action '%s': %v", actionReq.ID, err))
		return "", fmt.Errorf("action processing failed: %w", err)
	}

	duration := time.Since(startTime)
	a.logger.Info(fmt.Sprintf("[ProcessAction] Successfully processed action '%s' in %v, Result length: %d characters", actionReq.ID, duration, len(result)))

	return result, nil
}

func NewActionApi(logger backend.LoggingApi, promptApi backend.PromptApi, completionApi backend.CompletionApi) frontend.ActionApi {
	return &actionService{
		logger:        logger,
		promptApi:     promptApi,
		completionApi: completionApi,
	}
}
