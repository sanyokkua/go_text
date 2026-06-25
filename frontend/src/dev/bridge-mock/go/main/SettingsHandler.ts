import { AnyResult, VoidResult, ok, voidOk } from '../../types';

const defaultProvider = {
    id: 'mock-provider-1',
    name: 'Mock Provider',
    kind: 'openai',
    baseUrl: 'http://localhost:11434',
    apiKeyEnvVar: '',
    isCurrent: true,
};

const defaultSettings = { currentProviderId: 'mock-provider-1' };

const defaultInference = { temperature: 0.7, maxTokens: 2048, topP: 1.0 };
const defaultModel = { model: 'mock-model' };
const defaultBehavior = { saveTaskLog: false };
const defaultLogging = { level: 'info' };
const defaultLanguage = { inputLanguage: 'English', outputLanguage: 'English', languages: ['English'] };

export function GetSettings(): Promise<AnyResult> {
    return Promise.resolve(ok(defaultSettings));
}
export function ResetSettingsToDefault(): Promise<AnyResult> {
    return Promise.resolve(ok(defaultSettings));
}
export function GetAppSettingsMetadata(): Promise<AnyResult> {
    return Promise.resolve(ok({ version: '3.0.0' }));
}
export function GetAllProviderConfigs(): Promise<AnyResult> {
    return Promise.resolve(ok([defaultProvider]));
}
export function GetProviderConfig(_id: string): Promise<AnyResult> {
    return Promise.resolve(ok(defaultProvider));
}
export function GetCurrentProviderConfig(): Promise<AnyResult> {
    return Promise.resolve(ok(defaultProvider));
}
export function CreateProviderConfig(_cfg: unknown): Promise<AnyResult> {
    return Promise.resolve(ok({ ...defaultProvider, id: 'mock-new' }));
}
export function UpdateProviderConfig(_cfg: unknown): Promise<AnyResult> {
    return Promise.resolve(ok(defaultProvider));
}
export function DeleteProviderConfig(_id: string): Promise<VoidResult> {
    return Promise.resolve(voidOk());
}
export function SetAsCurrentProviderConfig(_id: string): Promise<AnyResult> {
    return Promise.resolve(ok(defaultProvider));
}
export function GetInferenceBaseConfig(): Promise<AnyResult> {
    return Promise.resolve(ok(defaultInference));
}
export function UpdateInferenceBaseConfig(_cfg: unknown): Promise<AnyResult> {
    return Promise.resolve(ok(defaultInference));
}
export function GetModelConfig(): Promise<AnyResult> {
    return Promise.resolve(ok(defaultModel));
}
export function UpdateModelConfig(_cfg: unknown): Promise<AnyResult> {
    return Promise.resolve(ok(defaultModel));
}
export function GetAppBehaviorConfig(): Promise<AnyResult> {
    return Promise.resolve(ok(defaultBehavior));
}
export function UpdateAppBehaviorConfig(_cfg: unknown): Promise<AnyResult> {
    return Promise.resolve(ok(defaultBehavior));
}
export function GetLoggingConfig(): Promise<AnyResult> {
    return Promise.resolve(ok(defaultLogging));
}
export function UpdateLoggingConfig(_cfg: unknown): Promise<AnyResult> {
    return Promise.resolve(ok(defaultLogging));
}
export function GetLanguageConfig(): Promise<AnyResult> {
    return Promise.resolve(ok(defaultLanguage));
}
export function AddLanguage(_name: string): Promise<AnyResult> {
    return Promise.resolve(ok({ ...defaultLanguage, languages: ['English', _name] }));
}
export function RemoveLanguage(_name: string): Promise<AnyResult> {
    return Promise.resolve(ok(defaultLanguage));
}
export function SetDefaultInputLanguage(_name: string): Promise<VoidResult> {
    return Promise.resolve(voidOk());
}
export function SetDefaultOutputLanguage(_name: string): Promise<VoidResult> {
    return Promise.resolve(voidOk());
}
