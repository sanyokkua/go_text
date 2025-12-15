export type Color =
    | ''
    | 'black-color'
    | 'white-color'
    | 'primary-color'
    | 'primary-container-color'
    | 'secondary-color'
    | 'secondary-container-color'
    | 'tertiary-color'
    | 'tertiary-container-color'
    | 'error-color'
    | 'error-container-color'
    | 'surface-color'
    | 'surface-dim-color'
    | 'info-color'
    | 'info-container-color'
    | 'success-color'
    | 'success-container-color'
    | 'warning-color'
    | 'warning-container-color';
export type Size = 'tiny' | 'small' | 'default' | 'large';

export type KeyValuePair = { id: string; key: string; value: string };

export interface AppSettings {
    baseUrl: string;
    headers: Record<string, string>;
    modelsEndpoint: string;
    completionEndpoint: string;
    modelName: string;
    temperature: number;
    isTemperatureEnabled: boolean;
    defaultInputLanguage: string;
    defaultOutputLanguage: string;
    languages: string[];
    useMarkdownForOutput: boolean;
}

export interface AppActionObj {
    actionId: string;
    actionInput: string;
    actionOutput: string;
    actionInputLanguage: string;
    actionOutputLanguage: string;
}

export interface AppLanguageItem {
    languageId: string;
    languageText: string;
}

export interface AppActionItem {
    actionId: string;
    actionText: string;
}

export const UnknownError = 'Unknown error';
