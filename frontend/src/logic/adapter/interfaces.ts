import {
    AppSettingsMetadata,
    ChatCompletionRequest,
    InferenceBaseConfig,
    LanguageConfig,
    ModelConfig,
    PromptActionRequest,
    Prompts,
    ProviderConfig,
    Settings,
} from './models';

export interface ILoggerService {
    logPrint(message: string): void;
    logTrace(message: string): void;
    logDebug(message: string): void;
    logError(message: string): void;
    logFatal(message: string): void;
    logInfo(message: string): void;
    logWarning(message: string): void;
}

export interface IActionHandler {
    getCompletionResponse(chatCompletionRequest: ChatCompletionRequest): Promise<string>;
    getCompletionResponseForProvider(providerConfig: ProviderConfig, arg2: ChatCompletionRequest): Promise<string>;
    getModelsList(): Promise<Array<string>>;
    getModelsListForProvider(providerConfig: ProviderConfig): Promise<Array<string>>;
    getPromptGroups(): Promise<Prompts>;
    processPrompt(promptActionRequest: PromptActionRequest): Promise<string>;
}

export interface ISettingsHandler {
    addLanguage(language: string): Promise<Array<string>>;
    createProviderConfig(providerConfig: ProviderConfig): Promise<ProviderConfig>;
    deleteProviderConfig(providerId: string): Promise<void>;
    getAllProviderConfigs(): Promise<Array<ProviderConfig>>;
    getAppSettingsMetadata(): Promise<AppSettingsMetadata>;
    getCurrentProviderConfig(): Promise<ProviderConfig>;
    getInferenceBaseConfig(): Promise<InferenceBaseConfig>;
    getLanguageConfig(): Promise<LanguageConfig>;
    getModelConfig(): Promise<ModelConfig>;
    getProviderConfig(providerId: string): Promise<ProviderConfig>;
    getSettings(): Promise<Settings>;
    removeLanguage(language: string): Promise<Array<string>>;
    resetSettingsToDefault(): Promise<Settings>;
    setAsCurrentProviderConfig(providerId: string): Promise<ProviderConfig>;
    setDefaultInputLanguage(language: string): Promise<void>;
    setDefaultOutputLanguage(language: string): Promise<void>;
    updateInferenceBaseConfig(inferenceBaseConfig: InferenceBaseConfig): Promise<InferenceBaseConfig>;
    updateModelConfig(modelConfig: ModelConfig): Promise<ModelConfig>;
    updateProviderConfig(providerConfig: ProviderConfig): Promise<ProviderConfig>;
}

export interface IEventsService {
    eventsEmit(eventName: string, ...data: unknown[]): void;
    eventsOn(eventName: string, callback: (...data: unknown[]) => void): () => void;
    eventsOnMultiple(eventName: string, callback: (...data: unknown[]) => void, maxCallbacks: number): () => void;
    eventsOnce(eventName: string, callback: (...data: unknown[]) => void): () => void;
    eventsOff(eventName: string, ...additionalEventNames: string[]): void;
    eventsOffAll(): void;
}

export interface IClipboardService {
    getText(): Promise<string>;
    setText(text: string): Promise<boolean>;
}
