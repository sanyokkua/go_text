import { Prompts } from '../../adapter';
import { RootState } from '../index';

export const selectPromptGroups = (state: RootState): Prompts | null => state.actions.promptGroups;
export const selectAvailableModels = (state: RootState): string[] => state.actions.availableModels;
