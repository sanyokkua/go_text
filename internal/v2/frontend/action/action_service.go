package api

import (
	"fmt"
	"time"

	"go_text/internal/v2/api"
	"go_text/internal/v2/backend_api"
	"go_text/internal/v2/model/action"
)

type actionService struct {
	logger        backend_api.LoggingApi
	promptApi     backend_api.PromptApi
	completionApi backend_api.CompletionApi
	cachedActions *action.Actions
}

func (a *actionService) GetActionGroups() (*action.Actions, error) {
	startTime := time.Now()
	a.logger.LogInfo("[GetActionGroups] Fetching action groups and prompts")

	if a.cachedActions != nil {
		return a.cachedActions, nil
	}

	categories := a.promptApi.GetPromptsCategories()
	a.logger.LogDebug(fmt.Sprintf("[GetActionGroups] Found %d prompt categories", len(categories)))

	groups := make([]action.Group, 0, len(categories))

	for _, category := range categories {
		a.logger.LogDebug(fmt.Sprintf("[GetActionGroups] Processing category: %s", category))

		prompts, err := a.promptApi.GetUserPromptsForCategory(category)
		if err != nil {
			a.logger.LogError(fmt.Sprintf("[GetActionGroups] Failed to get prompts for category '%s': %v", category, err))
			return nil, fmt.Errorf("failed to retrieve prompts for category %q: %w", category, err)
		}

		a.logger.LogDebug(fmt.Sprintf("[GetActionGroups] Retrieved %d prompts for category '%s'", len(prompts), category))

		actions := make([]action.Action, 0, len(prompts))
		for _, prompt := range prompts {
			actions = append(actions, action.Action{
				ID:   prompt.ID,
				Text: prompt.Name,
			})
		}

		groups = append(groups, action.Group{
			GroupName:    category,
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

func NewActionApi(logger backend_api.LoggingApi, promptApi backend_api.PromptApi, completionApi backend_api.CompletionApi) api.ActionApi {
	logger.LogDebug("[NewActionApi] Initializing action service")

	service := &actionService{
		logger:        logger,
		promptApi:     promptApi,
		completionApi: completionApi,
	}

	logger.LogDebug(fmt.Sprintf("[NewActionApi] Successfully initialized action service"))

	return service
}
