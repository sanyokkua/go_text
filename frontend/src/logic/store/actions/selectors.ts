import { RootState } from '../index';
import { Prompts } from '../../adapter';

// Basic selectors
export const selectPromptGroups = (state: RootState): Prompts | null => state.actions.promptGroups;

export const selectAvailableModels = (state: RootState): string[] => state.actions.availableModels;

export const selectActionsLoading = (state: RootState): boolean => state.actions.loading;

export const selectActionsError = (state: RootState): string | null => state.actions.error;

// Derived selectors
export const selectPromptGroupById = (groupId: string) => (state: RootState) => {
    return state.actions.promptGroups?.promptGroups[groupId] || null;
};

export const selectAllPromptGroups = (state: RootState) => {
    return state.actions.promptGroups?.promptGroups || {};
};

export const selectIsActionsLoading = (state: RootState): boolean => state.actions.loading;
