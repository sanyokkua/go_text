export interface Options {
    temperature?: number;
}
export interface CompletionRequestMessage {
    role: string;
    content: string;
}
export interface ChatCompletionRequest {
    model: string;
    messages: CompletionRequestMessage[];
    temperature?: number;
    options?: Options;
    stream: boolean;
    n?: number;
}
export interface Prompt {
    id: string;
    name: string;
    type: string;
    category: string;
    value: string;
}
export interface PromptActionRequest {
    id: string;
    inputText: string;
    outputText?: string;
    inputLanguageId?: string;
    outputLanguageId?: string;
}
export interface PromptGroup {
    groupId: string;
    groupName: string;
    systemPrompt: Prompt;
    prompts: Record<string, Prompt>;
}
export interface Prompts {
    promptGroups: Record<string, PromptGroup>;
}

export interface AppSettingsMetadata {
    authTypes: string[];
    providerTypes: string[];
    settingsFolder: string;
    settingsFile: string;
}
export interface InferenceBaseConfig {
    timeout: number;
    maxRetries: number;
    useMarkdownForOutput: boolean;
}
export interface LanguageConfig {
    languages: string[];
    defaultInputLanguage: string;
    defaultOutputLanguage: string;
}
export interface ModelConfig {
    name: string;
    useTemperature: boolean;
    temperature: number;
}
export interface ProviderConfig {
    providerId: string;
    providerName: string;
    providerType: string;
    baseUrl: string;
    modelsEndpoint: string;
    completionEndpoint: string;
    authType: string;
    authToken: string;
    useAuthTokenFromEnv: boolean;
    envVarTokenName: string;
    useCustomHeaders: boolean;
    headers: Record<string, string>;
    useCustomModels: boolean;
    customModels: string[];
}
export interface Settings {
    availableProviderConfigs: ProviderConfig[];
    currentProviderConfig: ProviderConfig;
    inferenceBaseConfig: InferenceBaseConfig;
    modelConfig: ModelConfig;
    languageConfig: LanguageConfig;
}
