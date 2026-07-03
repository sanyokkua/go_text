import { AnyResult, VoidResult, ok, voidOk } from '../../types';

function mockParam(name: string): boolean {
    if (globalThis.window === undefined) return false;
    try {
        return new URL(globalThis.window.location.href).searchParams.has(name);
    } catch {
        return false;
    }
}

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
    useMaxOutputTokens: false,
    maxOutputTokens: 2048,
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

// Lets Playwright fixtures exercise the T67 context-window highlight without depending
// on UpdateModelConfig, which (like the other mock Update* handlers) always echoes its
// static default rather than persisting the caller's payload.
const smallContextWindowSettings = { ...defaultSettings, modelConfig: { ...defaultModel, useContextWindow: true, contextWindow: 1024 } };

// Second provider for the T87 delete/resync scenario. Name shares no substring with
// 'Mock Provider' so Playwright's toContainText substring matching can assert on
// either provider's name without a false-positive collision.
const secondMockProvider = { ...defaultProvider, id: 'mock-provider-2', name: 'Backup LLM' };

// Module-scoped mutable "current provider" pointer for the multi-provider-test scenario
// only. Safe as module-level state — Playwright gives each test a fresh page/module load.
let statefulCurrentProviderId = defaultProvider.id;

function isMultiProviderTest(): boolean {
    return mockParam('multi-provider-test');
}

function currentMultiProvider(): typeof defaultProvider {
    return statefulCurrentProviderId === defaultProvider.id ? defaultProvider : secondMockProvider;
}

export function GetSettings(): Promise<AnyResult> {
    // Simulates real backend being slower for GetSettings than GetLoggingConfig.
    // GetLoggingConfig (7 DB reads) always returns before GetSettings in the real app.
    // This delay ensures bridge-mock tests exercise the same async ordering so the
    // sequential dispatch fix is actually tested.
    let settings = defaultSettings;
    if (mockParam('context-window-test')) {
        settings = smallContextWindowSettings;
    } else if (isMultiProviderTest()) {
        settings = {
            ...defaultSettings,
            availableProviderConfigs: [defaultProvider, secondMockProvider],
            currentProviderConfig: currentMultiProvider(),
        };
    }
    return new Promise((resolve) => setTimeout(() => resolve(ok(settings)), 0));
}
export function ResetSettingsToDefault(): Promise<AnyResult> {
    return Promise.resolve(ok(defaultSettings));
}
export function GetAppSettingsMetadata(): Promise<AnyResult> {
    return Promise.resolve(ok(defaultMetadata));
}
export function GetAllProviderConfigs(): Promise<AnyResult> {
    return Promise.resolve(ok(isMultiProviderTest() ? [defaultProvider, secondMockProvider] : [defaultProvider]));
}
export function GetProviderConfig(_id: string): Promise<AnyResult> {
    return Promise.resolve(ok(defaultProvider));
}
export function GetCurrentProviderConfig(): Promise<AnyResult> {
    return Promise.resolve(ok(isMultiProviderTest() ? currentMultiProvider() : defaultProvider));
}
export function CreateProviderConfig(_cfg: unknown): Promise<AnyResult> {
    return Promise.resolve(ok({ ...defaultProvider, id: 'mock-new' }));
}
export function UpdateProviderConfig(_cfg: unknown): Promise<AnyResult> {
    return Promise.resolve(ok(defaultProvider));
}
export function DeleteProviderConfig(_id: string): Promise<VoidResult> {
    if (isMultiProviderTest() && _id === statefulCurrentProviderId) {
        // Mirrors the real backend's "pick the first remaining provider" reassignment.
        statefulCurrentProviderId = _id === defaultProvider.id ? secondMockProvider.id : defaultProvider.id;
    }
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

const defaultUIPreferences = { theme: 'auto', layout: 'side', sidebarCollapsed: false, historyOpen: false, viewMode: 'preview' };

export function GetUIPreferencesConfig(): Promise<AnyResult> {
    const overrides = (window as Window & { __bridgeMockUIPrefs?: Partial<typeof defaultUIPreferences> }).__bridgeMockUIPrefs;
    const prefs = overrides ? { ...defaultUIPreferences, ...overrides } : defaultUIPreferences;
    return Promise.resolve(ok(prefs));
}
export function UpdateUIPreferencesConfig(cfg: unknown): Promise<AnyResult> {
    (window as Window & { __lastUIPrefsUpdate?: unknown }).__lastUIPrefsUpdate = cfg;
    return Promise.resolve(ok({ ...defaultUIPreferences, ...(cfg as object) }));
}

const defaultLoggingConfig = {
    logFileEnabled: true,
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
    {
        name: 'LM Studio',
        kind: 'lmstudio',
        baseURL: 'http://127.0.0.1:1234/',
        authScheme: 'none',
        completionPath: 'v1/chat/completions',
        modelsPath: 'v1/models',
        apiKeyEnvVar: '',
        headers: '{}',
    },
    {
        name: 'Llama.cpp',
        kind: 'llamacpp',
        baseURL: 'http://127.0.0.1:8080/',
        authScheme: 'none',
        completionPath: 'v1/chat/completions',
        modelsPath: 'v1/models',
        apiKeyEnvVar: '',
        headers: '{}',
    },
    {
        name: 'Ollama',
        kind: 'ollama',
        baseURL: 'http://127.0.0.1:11434/',
        authScheme: 'none',
        completionPath: 'v1/chat/completions',
        modelsPath: 'v1/models',
        apiKeyEnvVar: '',
        headers: '{}',
    },
    {
        name: 'OpenAI',
        kind: 'openai',
        baseURL: 'https://api.openai.com/',
        authScheme: 'bearer',
        completionPath: 'v1/chat/completions',
        modelsPath: 'v1/models',
        apiKeyEnvVar: 'OPENAI_API_KEY',
        headers: '{}',
    },
    {
        name: 'OpenRouter',
        kind: 'openai',
        baseURL: 'https://openrouter.ai/api/',
        authScheme: 'bearer',
        completionPath: 'v1/chat/completions',
        modelsPath: 'v1/models',
        apiKeyEnvVar: 'OPENROUTER_API_KEY',
        headers: '{}',
    },
];

export function ProviderPresets(): Promise<AnyResult> {
    return Promise.resolve(ok(mockProviderPresets));
}
