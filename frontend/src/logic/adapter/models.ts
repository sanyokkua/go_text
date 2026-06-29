/**
 * Application behavior configuration for task logging
 *
 * Controls whether completed tasks are written to log files and where those files are stored.
 * An empty logDirectory means the backend uses the OS-appropriate default path.
 */
export interface AppBehaviorConfig {
    enableTaskLogging: boolean;
    logDirectory: string;
    historyEnabled?: boolean;
    historyMaxEntries?: number;
}

/**
 * UI preferences persisted in the backend.
 *
 * `theme` is the user's chosen mode; `'auto'` defers to the OS color scheme.
 */
export interface UIPreferencesConfig {
    theme: 'auto' | 'light' | 'dark';
}

/**
 * Application settings metadata
 *
 * Provides information about the settings system including:
 * - Available authentication types
 * - Supported provider types
 * - File system locations for settings storage
 */
export interface AppSettingsMetadata {
    authTypes: string[];
    providerTypes: string[];
    settingsFolder: string;
    settingsFile: string;
    logsFolder: string;
    appVersion: string;
}

/**
 * Base configuration for LLM inference operations
 *
 * Defines global parameters that apply to all LLM requests:
 * - Network timeouts
 * - Retry logic
 * - Output formatting preferences
 */
export interface InferenceBaseConfig {
    timeout: number;
    maxRetries: number;
    useMarkdownForOutput: boolean;
}

/**
 * Language configuration for the application
 *
 * Manages supported languages and default selections for:
 * - Input text language detection
 * - Output text language generation
 */
export interface LanguageConfig {
    languages: string[];
    defaultInputLanguage: string;
    defaultOutputLanguage: string;
}

/**
 * Model configuration for LLM operations
 *
 * Defines the specific model to use and its generation parameters.
 * Temperature control is optional and can be toggled on/off.
 */
export interface ModelConfig {
    name: string;
    useTemperature: boolean;
    temperature: number;
    // Context window settings
    useContextWindow: boolean;
    contextWindow: number;
    useLegacyMaxTokens: boolean;
}

/**
 * Provider configuration for LLM service integration
 *
 * Comprehensive configuration for connecting to external LLM providers.
 * Includes endpoint URLs, authentication, and customization options.
 *
 * Key features:
 * - Multiple authentication methods (token, environment variable)
 * - Custom headers support
 * - Custom model lists
 * - Flexible endpoint configuration
 */
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
    apiVersion: string;
    selectedModel: string;
    useCustomHeaders: boolean;
    headers: Record<string, string>;
    useCustomModels: boolean;
    customModels: string[];
}

/**
 * Complete application settings object
 *
 * Root container for all application configuration.
 * Contains all provider configs, current selections, and sub-configurations.
 *
 * This is the single source of truth for the application state.
 */
export interface Settings {
    availableProviderConfigs: ProviderConfig[];
    currentProviderConfig: ProviderConfig;
    inferenceBaseConfig: InferenceBaseConfig;
    modelConfig: ModelConfig;
    languageConfig: LanguageConfig;
    appBehaviorConfig: AppBehaviorConfig;
}
