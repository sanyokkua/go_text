import { apperr } from '../../../wailsjs/go/models';
import { AppBehaviorConfig, InferenceBaseConfig, ModelConfig, ProviderConfig } from './models';

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
    getActionCatalog(): Promise<apperr.CatalogResult>;
    getModels(providerId: string): Promise<apperr.ModelsResult>;
    previewPrompt(req: apperr.PromptPreviewRequest): Promise<apperr.PromptPreviewResult>;
    processPromptChain(req: apperr.ChainRequest): Promise<apperr.ChainResultEnv>;
    cancelChain(runId: string): Promise<apperr.VoidResult>;
    cancelAllRuns(): Promise<void>;
    testConnection(providerConfig: ProviderConfig): Promise<apperr.VerifyResult>;
    testInference(providerConfig: ProviderConfig): Promise<apperr.VerifyResult>;
    testModels(providerConfig: ProviderConfig): Promise<apperr.VerifyResult>;
}

export interface IHistoryHandler {
    clearHistory(): Promise<apperr.VoidResult>;
    deleteHistoryEntry(id: string): Promise<apperr.VoidResult>;
    getHistoryEntry(id: string): Promise<apperr.HistoryEntryResult>;
    listHistory(page: number, pageSize: number): Promise<apperr.HistoryListResult>;
}

export interface IStackHandler {
    createStack(stack: apperr.SavedStack): Promise<apperr.StackResult>;
    deleteStack(id: string): Promise<apperr.VoidResult>;
    duplicateStack(id: string, newName: string): Promise<apperr.StackResult>;
    getStack(id: string): Promise<apperr.StackResult>;
    listStacks(): Promise<apperr.StacksResult>;
    updateStack(stack: apperr.SavedStack): Promise<apperr.StackResult>;
}

/** Returns raw wire envelopes — consumers call unwrap() to extract domain values. */
export interface ISettingsHandler {
    addLanguage(language: string): Promise<apperr.LanguagesResult>;
    createProviderConfig(providerConfig: ProviderConfig): Promise<apperr.ProviderResult>;
    deleteProviderConfig(providerId: string): Promise<apperr.VoidResult>;
    getAllProviderConfigs(): Promise<apperr.ProvidersResult>;
    getAppSettingsMetadata(): Promise<apperr.MetadataResult>;
    getCurrentProviderConfig(): Promise<apperr.ProviderResult>;
    getInferenceBaseConfig(): Promise<apperr.InferenceResult>;
    getLanguageConfig(): Promise<apperr.LanguageResult>;
    getModelConfig(): Promise<apperr.ModelConfigResult>;
    getSettings(): Promise<apperr.SettingsResult>;
    removeLanguage(language: string): Promise<apperr.LanguagesResult>;
    resetSettingsToDefault(): Promise<apperr.SettingsResult>;
    setAsCurrentProviderConfig(providerId: string): Promise<apperr.ProviderResult>;
    setDefaultInputLanguage(language: string): Promise<apperr.VoidResult>;
    setDefaultOutputLanguage(language: string): Promise<apperr.VoidResult>;
    updateInferenceBaseConfig(config: InferenceBaseConfig): Promise<apperr.InferenceResult>;
    updateModelConfig(config: ModelConfig): Promise<apperr.ModelConfigResult>;
    updateProviderConfig(providerConfig: ProviderConfig): Promise<apperr.ProviderResult>;
    getAppBehaviorConfig(): Promise<apperr.AppBehaviorResult>;
    updateAppBehaviorConfig(config: AppBehaviorConfig): Promise<apperr.AppBehaviorResult>;
}

export interface IClipboardService {
    getText(): Promise<string>;
    setText(text: string): Promise<boolean>;
}

export interface IAppHandler {
    logError(message: string): Promise<apperr.VoidResult>;
    clipboardGetText(): Promise<apperr.StringResult>;
    clipboardSetText(text: string): Promise<apperr.VoidResult>;
    browserOpenURL(url: string): Promise<apperr.VoidResult>;
}
