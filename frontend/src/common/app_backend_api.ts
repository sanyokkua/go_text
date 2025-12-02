import { AppActionItem, AppActionObj, AppLanguageItem, AppSettings } from './types';

export interface IActionApi {
    processAction(actionObj: AppActionObj): Promise<string>;
}

export interface ISettingsApi {
    loadSettings(): Promise<AppSettings>;
    resetToDefaultSettings(): Promise<AppSettings>;
    saveSettings(settings: AppSettings): Promise<void>;
    validateModelsRequest(baseUrl: string, endpoint: string, headers: Record<string, string>): Promise<boolean>;
    validateCompletionRequest(baseUrl: string, endpoint: string, modelName: string, headers: Record<string, string>): Promise<boolean>;
}

export interface IUiStateApi {
    getCurrentModel(): Promise<string>;
    getDefaultInputLanguage(): Promise<AppLanguageItem>;
    getDefaultOutputLanguage(): Promise<AppLanguageItem>;
    getFormattingItems(): Promise<Array<AppActionItem>>;
    getTransformingItems(): Promise<Array<AppActionItem>>;
    getInputLanguages(): Promise<Array<AppLanguageItem>>;
    getModelsList(): Promise<Array<string>>;
    getOutputLanguages(): Promise<Array<AppLanguageItem>>;
    getProofreadingItems(): Promise<Array<AppActionItem>>;
    getSummarizationItems(): Promise<Array<AppActionItem>>;
    getTranslatingItems(): Promise<Array<AppActionItem>>;
}

export interface IClipboardUtils {
    clipboardGetText(): Promise<string>;
    clipboardSetText(text: string): Promise<boolean>;
}
