import { Prompts } from '../../adapter';

export interface ActionsState {
    completionResponse: string | null;
    completionResponseForProvider: string | null;
    modelsList: Array<string>;
    modelsListForProvider: Array<string>;
    promptGroups: Prompts | null;
    processedPrompt: string | null;
    loading: boolean;
    error: string | null;
}

export interface KnownError {
    errorMessage: string;
    code?: string;
}
