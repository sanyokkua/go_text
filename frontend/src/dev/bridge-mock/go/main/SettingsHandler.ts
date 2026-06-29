import { AnyResult, VoidResult, ok, voidOk } from '../../types';

const defaultProvider = {
    id: 'mock-provider-1',
    name: 'Mock Provider',
    kind: 'openai',
    baseUrl: 'http://localhost:11434',
    apiKeyEnvVar: '',
    authScheme: 'none',
    modelsPath: '/v1/models',
    completionPath: '/v1/chat/completions',
    apiVersion: '',
    selectedModel: 'mock-model',
    headers: {},
    useCustomModels: false,
    customModels: [],
};

const defaultInference = { timeout: 30, maxRetries: 3, useMarkdownForOutput: false };
const defaultModel = {
    name: 'mock-model',
    useTemperature: false,
    temperature: 0.7,
    useContextWindow: false,
    contextWindow: 4096,
    useLegacyMaxTokens: false,
};
const defaultBehavior = { enableTaskLogging: false, historyEnabled: true, historyMaxEntries: 50 };
const defaultLanguage = { defaultInputLanguage: 'English', defaultOutputLanguage: 'English', languages: ['English'] };
const defaultMetadata = {
    authSchemes: ['none', 'bearer', 'apiKey'],
    providerKinds: ['openai', 'azure', 'anthropic', 'google', 'ollama', 'lmstudio'],
    settingsFolder: '/mock/settings',
    databaseFile: '/mock/settings/gotext.db',
    logsFolder: '/mock/logs',
    appVersion: '3.0.0',
};

const defaultSettings = {
    availableProviderConfigs: [defaultProvider],
    currentProviderConfig: defaultProvider,
    inferenceBaseConfig: defaultInference,
    modelConfig: defaultModel,
    languageConfig: defaultLanguage,
    appBehaviorConfig: defaultBehavior,
};

export function GetSettings(): Promise<AnyResult> {
    return Promise.resolve(ok(defaultSettings));
}
export function ResetSettingsToDefault(): Promise<AnyResult> {
    return Promise.resolve(ok(defaultSettings));
}
export function GetAppSettingsMetadata(): Promise<AnyResult> {
    return Promise.resolve(ok(defaultMetadata));
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

const defaultUIPreferences = { theme: 'auto' };

export function GetUIPreferencesConfig(): Promise<AnyResult> {
    return Promise.resolve(ok(defaultUIPreferences));
}
export function UpdateUIPreferencesConfig(_cfg: unknown): Promise<AnyResult> {
    return Promise.resolve(ok(defaultUIPreferences));
}

const defaultLoggingConfig = {
    logFileEnabled: false,
    logLevel: 'info',
    logDirectory: '',
    logMaxSizeMB: 10,
    logMaxBackups: 5,
    logMaxAgeDays: 30,
    logCompress: false,
};

export function GetLoggingConfig(): Promise<AnyResult> {
    return Promise.resolve(ok(defaultLoggingConfig));
}
export function UpdateLoggingConfig(_cfg: unknown): Promise<AnyResult> {
    return Promise.resolve(ok(_cfg ?? defaultLoggingConfig));
}

const mockProviderPresets = [
    { name: 'LM Studio', kind: 'lmstudio', baseURL: 'http://127.0.0.1:1234/', authScheme: 'none', completionPath: 'v1/chat/completions', modelsPath: 'v1/models', apiKeyEnvVar: '', headers: '{}' },
    { name: 'Llama.cpp', kind: 'llamacpp', baseURL: 'http://127.0.0.1:8080/', authScheme: 'none', completionPath: 'v1/chat/completions', modelsPath: 'v1/models', apiKeyEnvVar: '', headers: '{}' },
    { name: 'Ollama', kind: 'ollama', baseURL: 'http://127.0.0.1:11434/', authScheme: 'none', completionPath: 'v1/chat/completions', modelsPath: 'v1/models', apiKeyEnvVar: '', headers: '{}' },
    { name: 'OpenAI', kind: 'openai', baseURL: 'https://api.openai.com/', authScheme: 'bearer', completionPath: 'v1/chat/completions', modelsPath: 'v1/models', apiKeyEnvVar: 'OPENAI_API_KEY', headers: '{}' },
    { name: 'OpenRouter', kind: 'openai', baseURL: 'https://openrouter.ai/api/', authScheme: 'bearer', completionPath: 'v1/chat/completions', modelsPath: 'v1/models', apiKeyEnvVar: 'OPENROUTER_API_KEY', headers: '{}' },
];

export function ProviderPresets(): Promise<AnyResult> {
    return Promise.resolve(ok(mockProviderPresets));
}
