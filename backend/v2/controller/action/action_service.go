package frontend

import (
	"fmt"
	backend_api2 "go_text/backend/v2/abstract/backend"
	"go_text/backend/v2/abstract/frontend"
	"time"

	"go_text/backend/v2/model/action"
)

type actionService struct {
	logger        backend_api2.LoggingApi
	promptApi     backend_api2.PromptApi
	completionApi backend_api2.CompletionApi
	cachedActions *action.Actions
}

func (a *actionService) GetActionGroups() (*action.Actions, error) {
	startTime := time.Now()
	a.logger.LogInfo("[GetActionGroups] Fetching action groups and prompts")

	if a.cachedActions != nil {
		return a.cachedActions, nil
	}

	appPrompts := a.promptApi.GetAppPrompts()
	a.logger.LogDebug(fmt.Sprintf("[GetActionGroups] Found %d prompt categories", len(appPrompts.PromptGroups)))

	groups := make([]action.Group, 0, len(appPrompts.PromptGroups))

	for _, category := range appPrompts.PromptGroups {
		a.logger.LogDebug(fmt.Sprintf("[GetActionGroups] Processing category: %s", category.GroupName))
		a.logger.LogDebug(fmt.Sprintf("[GetActionGroups] Retrieved %d prompts for category '%s'", len(category.Prompts), category))

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
	a.logger.LogInfo(fmt.Sprintf("[GetActionGroups] Successfully retrieved %d action groups with %d total actions in %v", len(groups), len(result.ActionGroups), duration))

	return result, nil
}

func (a *actionService) ProcessAction(actionReq action.ActionRequest) (string, error) {
	startTime := time.Now()
	a.logger.LogInfo(fmt.Sprintf("[ProcessAction] Processing action: %s", actionReq.ID))

	result, err := a.completionApi.ProcessAction(actionReq)
	if err != nil {
		a.logger.LogError(fmt.Sprintf("[ProcessAction] Failed to process action '%s': %v", actionReq.ID, err))
		return "", fmt.Errorf("action processing failed: %w", err)
	}

	duration := time.Since(startTime)
	a.logger.LogInfo(fmt.Sprintf("[ProcessAction] Successfully processed action '%s' in %v, Result length: %d characters", actionReq.ID, duration, len(result)))

	return result, nil
}

func NewActionApi(logger backend_api2.LoggingApi, promptApi backend_api2.PromptApi, completionApi backend_api2.CompletionApi) frontend.ActionApi {
	return &actionService{
		logger:        logger,
		promptApi:     promptApi,
		completionApi: completionApi,
	}
}
