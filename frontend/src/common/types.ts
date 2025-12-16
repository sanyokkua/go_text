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

export type ProviderType = 'custom' | 'ollama' | 'lm-studio' | 'llama-cpp';

export interface ProviderConfig {
    providerType: ProviderType;
    providerName: string;
    baseUrl: string;
    modelsEndpoint: string;
    completionEndpoint: string;
    headers: Record<string, string>;
}

export interface ModelConfig {
    modelName: string;
    isTemperatureEnabled: boolean;
    temperature: number;
}

export interface LanguageConfig {
    languages: string[];
    defaultInputLanguage: string;
    defaultOutputLanguage: string;
}

export interface AppSettings {
    availableProviderConfigs: ProviderConfig[];
    currentProviderConfig: ProviderConfig;
    modelConfig: ModelConfig;
    languageConfig: LanguageConfig;
    useMarkdownForOutput: boolean;
}

// Deprecated: flattened AppSettings for backward compatibility during migration if needed
// But for this refactor we aim to switch fully to the nested structure

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
