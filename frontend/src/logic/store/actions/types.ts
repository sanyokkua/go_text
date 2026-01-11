import { Prompts } from '../../adapter';

export interface ActionsState {
    promptGroups: Prompts | null; // Structure for buttons/tabs
    availableModels: string[]; // List of models for current provider
}
