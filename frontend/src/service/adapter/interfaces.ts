import { FrontActionRequest, FrontActions, FrontLanguageItem, FrontProviderConfig, FrontSettings } from './models';

export interface IActionService {
    getActionGroups(): Promise<FrontActions>;
    processAction(actionRequest: FrontActionRequest): Promise<string>;
}

export interface IStateService {
    getDefaultInputLanguage(): Promise<FrontLanguageItem>;
    getDefaultOutputLanguage(): Promise<FrontLanguageItem>;
    getInputLanguages(): Promise<Array<FrontLanguageItem>>;
    getOutputLanguages(): Promise<Array<FrontLanguageItem>>;
}

export interface ISettingsService {
    createNewProvider(arg1: FrontProviderConfig, modelName?: string): Promise<FrontProviderConfig>;
    deleteProvider(arg1: FrontProviderConfig): Promise<boolean>;
    getCurrentSettings(): Promise<FrontSettings>;
    getDefaultSettings(): Promise<FrontSettings>;
    getModelsList(arg1: FrontProviderConfig): Promise<Array<string>>;
    getProviderTypes(): Promise<Array<string>>;
    getSettingsFilePath(): Promise<string>;
    saveSettings(arg1: FrontSettings): Promise<FrontSettings>;
    selectProvider(arg1: FrontProviderConfig): Promise<FrontProviderConfig>;
    updateProvider(arg1: FrontProviderConfig): Promise<FrontProviderConfig>;
    validateProvider(arg1: FrontProviderConfig, validate: boolean, modelName?: string): Promise<boolean>;
}

export interface IClipboardService {
    clipboardGetText(): Promise<string>;
    clipboardSetText(text: string): Promise<boolean>;
}

export interface ILoggerService {
    trace(message: string): void;
    debug(message: string): void;
    info(message: string): void;
    warning(message: string): void;
    error(message: string): void;
    fatal(message: string): void;
}
