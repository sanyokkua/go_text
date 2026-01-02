export interface FrontAction {
    id: string;
    text: string;
}
export interface FrontActionRequest {
    id: string;
    inputText: string;
    outputText?: string;
    inputLanguageId?: string;
    outputLanguageId?: string;
}
export interface FrontGroup {
    groupId: string;
    groupName: string;
    groupActions: FrontAction[];
}
export interface FrontActions {
    actionGroups: FrontGroup[];
}
export interface FrontLanguageItem {
    languageId: string;
    languageText: string;
}
export interface FrontLanguageConfig {
    languages: string[];
    defaultInputLanguage: string;
    defaultOutputLanguage: string;
}
export interface FrontModelConfig {
    modelName: string;
    isTemperatureEnabled: boolean;
    temperature: number;
}
export interface FrontProviderConfig {
    providerName: string;
    providerType: string;
    baseUrl: string;
    modelsEndpoint: string;
    completionEndpoint: string;
    headers: Record<string, string>;
}
export interface FrontSettings {
    availableProviderConfigs: FrontProviderConfig[];
    currentProviderConfig: FrontProviderConfig;
    modelConfig: FrontModelConfig;
    languageConfig: FrontLanguageConfig;
    useMarkdownForOutput: boolean;
}
