import { apperr } from '../../../wailsjs/go/models';
import {
    AddLanguage,
    CreateProviderConfig,
    DeleteProviderConfig,
    GetAllProviderConfigs,
    GetAppBehaviorConfig,
    GetAppSettingsMetadata,
    GetCurrentProviderConfig,
    GetInferenceBaseConfig,
    GetLanguageConfig,
    GetModelConfig,
    GetSettings,
    RemoveLanguage,
    ResetSettingsToDefault,
    SetAsCurrentProviderConfig,
    SetDefaultInputLanguage,
    SetDefaultOutputLanguage,
    UpdateAppBehaviorConfig,
    UpdateInferenceBaseConfig,
    UpdateModelConfig,
    UpdateProviderConfig,
} from '../../../wailsjs/go/settings/SettingsHandler';
import { ClipboardGetText, ClipboardSetText, LogDebug, LogError, LogFatal, LogInfo, LogPrint, LogTrace, LogWarning } from '../../../wailsjs/runtime';
import { parseError } from '../utils/error_utils';
import { IActionHandler, IClipboardService, ILoggerService, ISettingsHandler } from './interfaces';
import {
    AppBehaviorConfig,
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

// ─── v3 → v2 field mappers (T04 bridge; T19 replaces with real v3 frontend) ───

function unwrapOrThrow<T>(result: { data?: T; error?: apperr.WireError }): T {
    if (result.error) {
        throw new Error(`${result.error.title}: ${result.error.message}`);
    }
    if (result.data === undefined) {
        throw new Error('No data in result envelope');
    }
    return result.data;
}

function fromWireProvider(v: apperr.ProviderConfig): ProviderConfig {
    return {
        providerId: v.id,
        providerName: v.name,
        providerType: v.kind,
        baseUrl: v.baseUrl,
        modelsEndpoint: v.modelsPath,
        completionEndpoint: v.completionPath,
        authType: v.authScheme,
        authToken: '',
        useAuthTokenFromEnv: !!v.apiKeyEnvVar,
        envVarTokenName: v.apiKeyEnvVar,
        useCustomHeaders: Object.keys(v.headers ?? {}).length > 0,
        headers: v.headers ?? {},
        useCustomModels: v.useCustomModels,
        customModels: v.customModels ?? [],
    };
}

function toWireProvider(v: ProviderConfig): apperr.ProviderConfig {
    return apperr.ProviderConfig.createFrom({
        id: v.providerId,
        name: v.providerName,
        kind: v.providerType,
        baseUrl: v.baseUrl,
        authScheme: v.authType,
        apiKeyEnvVar: v.envVarTokenName,
        completionPath: v.completionEndpoint,
        modelsPath: v.modelsEndpoint,
        useCustomModels: v.useCustomModels,
        headers: v.headers,
        customModels: v.customModels,
    });
}

function fromWireSettings(v: apperr.Settings): Settings {
    return {
        availableProviderConfigs: (v.availableProviderConfigs ?? []).map(fromWireProvider),
        currentProviderConfig: fromWireProvider(v.currentProviderConfig),
        inferenceBaseConfig: v.inferenceBaseConfig,
        modelConfig: v.modelConfig,
        languageConfig: v.languageConfig,
        appBehaviorConfig: { enableTaskLogging: v.appBehaviorConfig.enableTaskLogging, logDirectory: '' },
    };
}

/**
 * Formats log messages with service context for consistent logging structure
 *
 * @param message - The log message content
 * @param serviceName - Optional service name for context
 * @returns Formatted log message with service prefix
 */
function formatLogMessage(message: string, serviceName?: string): string {
    if (serviceName && serviceName.trim().length > 0) {
        return `[FrontendLogger].${serviceName}: ${message}`;
    }
    return `[FrontendLogger].${message}`;
}

/**
 * Safely executes log functions with error handling
 *
 * Wraps Wails-generated log functions to prevent crashes from logging errors.
 * Falls back to console.error if the primary logging mechanism fails.
 *
 * @param message - The log message content
 * @param logFunction - The Wails-generated log function to call
 * @param serviceName - Optional service name for context
 */
function logMessage(message: string, logFunction: (arg: string) => void, serviceName?: string) {
    try {
        logFunction(formatLogMessage(message, serviceName));
    } catch (error) {
        console.error(error);
    }
}

/**
 * Logger Service Implementation
 *
 * Concrete implementation of ILoggerService that wraps Wails-generated logging functions.
 * Provides structured logging with service context and error handling.
 *
 * Features:
 * - Service-specific logging context
 * - Error-safe logging operations
 * - Static factory method for easy instantiation
 */
export class LoggerService implements ILoggerService {
    constructor(private readonly loggerServiceName?: string) {}

    /**
     * Factory method to create logger instances with service context
     *
     * @param serviceName - Name of the service for logging context
     * @returns Configured LoggerService instance
     */
    static getLogger(serviceName?: string): LoggerService {
        return new LoggerService(serviceName);
    }

    logDebug(message: string): void {
        logMessage(message, LogDebug, this.loggerServiceName);
    }

    logError(message: string): void {
        logMessage(message, LogError, this.loggerServiceName);
    }

    logFatal(message: string): void {
        logMessage(message, LogFatal, this.loggerServiceName);
    }

    logInfo(message: string): void {
        logMessage(message, LogInfo, this.loggerServiceName);
    }

    logPrint(message: string): void {
        logMessage(message, LogPrint, this.loggerServiceName);
    }

    logTrace(message: string): void {
        logMessage(message, LogTrace, this.loggerServiceName);
    }

    logWarning(message: string): void {
        logMessage(message, LogWarning, this.loggerServiceName);
    }
}
/**
 * Action Handler Service Implementation
 *
 * Concrete implementation of IActionHandler that bridges frontend UI with backend LLM services.
 * All v2 methods are stubbed — the v3 chain API replaces them in T19.
 */
export class ActionHandler implements IActionHandler {
    constructor(private readonly logger: ILoggerService) {}

    async getCompletionResponseForProvider(_providerConfig: ProviderConfig, _chatCompletionRequest: ChatCompletionRequest): Promise<string> {
        // T19 — v2 method removed; replaced by v3 chain API
        this.logger.logError('getCompletionResponseForProvider: not implemented in v3; see T19');
        throw new Error('Not implemented in v3; see T19');
    }

    async getModelsList(): Promise<Array<string>> {
        // T19 — v2 method removed; replaced by v3 chain API
        this.logger.logError('getModelsList: not implemented in v3; see T19');
        throw new Error('Not implemented in v3; see T19');
    }

    async getModelsListForProvider(_providerConfig: ProviderConfig): Promise<Array<string>> {
        // T19 — v2 method removed; replaced by v3 chain API
        this.logger.logError('getModelsListForProvider: not implemented in v3; see T19');
        throw new Error('Not implemented in v3; see T19');
    }

    async getPromptGroups(): Promise<Prompts> {
        // T19 — v2 method removed; replaced by v3 chain API
        this.logger.logError('getPromptGroups: not implemented in v3; see T19');
        throw new Error('Not implemented in v3; see T19');
    }

    async processPrompt(_promptActionRequest: PromptActionRequest): Promise<string> {
        // T19 — v2 method removed; replaced by v3 chain API
        this.logger.logError('processPrompt: not implemented in v3; see T19');
        throw new Error('Not implemented in v3; see T19');
    }
}
/**
 * Settings Handler Service Implementation
 *
 * Concrete implementation of ISettingsHandler that manages all application configuration.
 * Bridges the frontend UI with backend settings persistence and provides comprehensive CRUD operations.
 *
 * Key Responsibilities:
 * - Converting frontend models to Wails-compatible formats
 * - Error handling and logging for all settings operations
 * - Managing provider configurations (create, read, update, delete)
 * - Handling language, model, and inference configurations
 * - Providing factory reset functionality
 */
export class SettingsHandler implements ISettingsHandler {
    constructor(private readonly logger: ILoggerService) {}

    /**
     * Adds a new language to the supported languages list
     *
     * @param language - Language code to add (e.g., "en", "es")
     * @returns Updated array of all supported languages
     * @throws Rejects with original error if operation fails
     */
    async addLanguage(language: string): Promise<Array<string>> {
        try {
            this.logger.logInfo(`Attempt to call Wails generated AddLanguage with language: ${language}`);
            const result = await AddLanguage(language);
            const data = result.data ?? [];
            this.logger.logInfo(`Wails generated AddLanguage completed successfully, languages count: ${data.length}`);
            return data;
        } catch (error) {
            const err = parseError(error);
            this.logger.logError(`Wails generated AddLanguage failed: ${err.message}`);
            throw error;
        }
    }

    /**
     * Creates a new provider configuration
     *
     * @param providerConfig - Complete provider configuration
     * @returns Created provider configuration with generated ID
     * @throws Rejects with original error if operation fails
     */
    async createProviderConfig(providerConfig: ProviderConfig): Promise<ProviderConfig> {
        try {
            this.logger.logInfo(`Attempt to call Wails generated CreateProviderConfig with provider: ${providerConfig.providerName}`);
            const result = await CreateProviderConfig(toWireProvider(providerConfig));
            const data = fromWireProvider(unwrapOrThrow(result));
            this.logger.logInfo(`Wails generated CreateProviderConfig completed successfully for provider: ${data.providerName}`);
            return data;
        } catch (error) {
            const err = parseError(error);
            this.logger.logError(`Wails generated CreateProviderConfig failed: ${err.message}`);
            throw error;
        }
    }

    /**
     * Deletes a provider configuration by ID
     *
     * @param providerId - ID of provider to delete
     * @throws Rejects with original error if operation fails
     */
    async deleteProviderConfig(providerId: string): Promise<void> {
        try {
            this.logger.logInfo(`Attempt to call Wails generated DeleteProviderConfig with providerId: ${providerId}`);
            const result = await DeleteProviderConfig(providerId);
            if (result.error) {
                throw new Error(`${result.error.title}: ${result.error.message}`);
            }
            this.logger.logInfo(`Wails generated DeleteProviderConfig completed successfully`);
        } catch (error) {
            const err = parseError(error);
            this.logger.logError(`Wails generated DeleteProviderConfig failed: ${err.message}`);
            throw error;
        }
    }

    /**
     * Retrieves all available provider configurations
     *
     * @returns Array of all provider configurations
     * @throws Rejects with original error if operation fails
     */
    async getAllProviderConfigs(): Promise<Array<ProviderConfig>> {
        try {
            this.logger.logInfo(`Attempt to call Wails generated GetAllProviderConfigs`);
            const result = await GetAllProviderConfigs();
            const data = (result.data ?? []).map(fromWireProvider);
            this.logger.logInfo(`Wails generated GetAllProviderConfigs completed successfully, found ${data.length} providers`);
            return data;
        } catch (error) {
            const err = parseError(error);
            this.logger.logError(`Wails generated GetAllProviderConfigs failed: ${err.message}`);
            throw error;
        }
    }

    /**
     * Retrieves application settings metadata
     *
     * @returns Metadata including auth types, provider types, and file locations
     * @throws Rejects with original error if operation fails
     */
    async getAppSettingsMetadata(): Promise<AppSettingsMetadata> {
        try {
            this.logger.logInfo(`Attempt to call Wails generated GetAppSettingsMetadata`);
            const result = await GetAppSettingsMetadata();
            const wire = unwrapOrThrow(result);
            const data: AppSettingsMetadata = {
                authTypes: wire.authSchemes,
                providerTypes: wire.providerKinds,
                settingsFolder: wire.settingsFolder,
                settingsFile: wire.databaseFile,
                logsFolder: wire.logsFolder,
            };
            this.logger.logInfo(`Wails generated GetAppSettingsMetadata completed successfully`);
            return data;
        } catch (error) {
            const err = parseError(error);
            this.logger.logError(`Wails generated GetAppSettingsMetadata failed: ${err.message}`);
            throw error;
        }
    }

    /**
     * Retrieves the currently active provider configuration
     *
     * @returns Current provider configuration
     * @throws Rejects with original error if operation fails
     */
    async getCurrentProviderConfig(): Promise<ProviderConfig> {
        try {
            this.logger.logInfo(`Attempt to call Wails generated GetCurrentProviderConfig`);
            const result = await GetCurrentProviderConfig();
            const data = fromWireProvider(unwrapOrThrow(result));
            this.logger.logInfo(`Wails generated GetCurrentProviderConfig completed successfully for provider: ${data.providerName}`);
            return data;
        } catch (error) {
            const err = parseError(error);
            this.logger.logError(`Wails generated GetCurrentProviderConfig failed: ${err.message}`);
            throw error;
        }
    }

    /**
     * Retrieves the inference base configuration
     *
     * @returns Inference configuration with timeout, retries, and formatting options
     * @throws Rejects with original error if operation fails
     */
    async getInferenceBaseConfig(): Promise<InferenceBaseConfig> {
        try {
            this.logger.logInfo(`Attempt to call Wails generated GetInferenceBaseConfig`);
            const result = await GetInferenceBaseConfig();
            const data = unwrapOrThrow(result);
            this.logger.logInfo(`Wails generated GetInferenceBaseConfig completed successfully`);
            return data;
        } catch (error) {
            const err = parseError(error);
            this.logger.logError(`Wails generated GetInferenceBaseConfig failed: ${err.message}`);
            throw error;
        }
    }

    /**
     * Retrieves the language configuration
     *
     * @returns Language configuration with supported languages and defaults
     * @throws Rejects with original error if operation fails
     */
    async getLanguageConfig(): Promise<LanguageConfig> {
        try {
            this.logger.logInfo(`Attempt to call Wails generated GetLanguageConfig`);
            const result = await GetLanguageConfig();
            const data = unwrapOrThrow(result);
            this.logger.logInfo(`Wails generated GetLanguageConfig completed successfully, languages count: ${data.languages.length}`);
            return data;
        } catch (error) {
            const err = parseError(error);
            this.logger.logError(`Wails generated GetLanguageConfig failed: ${err.message}`);
            throw error;
        }
    }

    /**
     * Retrieves the model configuration
     *
     * @returns Model configuration with selected model and temperature settings
     * @throws Rejects with original error if operation fails
     */
    async getModelConfig(): Promise<ModelConfig> {
        try {
            this.logger.logInfo(`Attempt to call Wails generated GetModelConfig`);
            const result = await GetModelConfig();
            const data = unwrapOrThrow(result);
            this.logger.logInfo(`Wails generated GetModelConfig completed successfully for model: ${data.name}`);
            return data;
        } catch (error) {
            const err = parseError(error);
            this.logger.logError(`Wails generated GetModelConfig failed: ${err.message}`);
            throw error;
        }
    }

    /**
     * Retrieves complete application settings
     *
     * @returns Full settings object with all configurations
     * @throws Rejects with original error if operation fails
     */
    async getSettings(): Promise<Settings> {
        try {
            this.logger.logInfo(`Attempt to call Wails generated GetSettings`);
            const result = await GetSettings();
            const data = fromWireSettings(unwrapOrThrow(result));
            this.logger.logInfo(`Wails generated GetSettings completed successfully, providers count: ${data.availableProviderConfigs.length}`);
            return data;
        } catch (error) {
            const err = parseError(error);
            this.logger.logError(`Wails generated GetSettings failed: ${err.message}`);
            throw error;
        }
    }

    /**
     * Removes a language from the supported languages list
     *
     * @param language - Language code to remove (e.g., "en", "es")
     * @returns Updated array of all supported languages
     * @throws Rejects with original error if operation fails
     */
    async removeLanguage(language: string): Promise<Array<string>> {
        try {
            this.logger.logInfo(`Attempt to call Wails generated RemoveLanguage with language: ${language}`);
            const result = await RemoveLanguage(language);
            const data = result.data ?? [];
            this.logger.logInfo(`Wails generated RemoveLanguage completed successfully, languages count: ${data.length}`);
            return data;
        } catch (error) {
            const err = parseError(error);
            this.logger.logError(`Wails generated RemoveLanguage failed: ${err.message}`);
            throw error;
        }
    }

    /**
     * Resets all settings to default values
     *
     * @returns Complete settings object with default values
     * @throws Rejects with original error if operation fails
     */
    async resetSettingsToDefault(): Promise<Settings> {
        try {
            this.logger.logInfo(`Attempt to call Wails generated ResetSettingsToDefault`);
            const result = await ResetSettingsToDefault();
            const data = fromWireSettings(unwrapOrThrow(result));
            this.logger.logInfo(`Wails generated ResetSettingsToDefault completed successfully`);
            return data;
        } catch (error) {
            const err = parseError(error);
            this.logger.logError(`Wails generated ResetSettingsToDefault failed: ${err.message}`);
            throw error;
        }
    }

    /**
     * Sets a provider as the current/active provider
     *
     * @param providerId - ID of provider to activate
     * @returns Updated provider configuration that is now active
     * @throws Rejects with original error if operation fails
     */
    async setAsCurrentProviderConfig(providerId: string): Promise<ProviderConfig> {
        try {
            this.logger.logInfo(`Attempt to call Wails generated SetAsCurrentProviderConfig with providerId: ${providerId}`);
            const result = await SetAsCurrentProviderConfig(providerId);
            const data = fromWireProvider(unwrapOrThrow(result));
            this.logger.logInfo(`Wails generated SetAsCurrentProviderConfig completed successfully for provider: ${data.providerName}`);
            return data;
        } catch (error) {
            const err = parseError(error);
            this.logger.logError(`Wails generated SetAsCurrentProviderConfig failed: ${err.message}`);
            throw error;
        }
    }

    /**
     * Sets the default input language
     *
     * @param language - Language code to set as default for input
     * @throws Rejects with original error if operation fails
     */
    async setDefaultInputLanguage(language: string): Promise<void> {
        try {
            this.logger.logInfo(`Attempt to call Wails generated SetDefaultInputLanguage with language: ${language}`);
            const result = await SetDefaultInputLanguage(language);
            if (result.error) {
                throw new Error(`${result.error.title}: ${result.error.message}`);
            }
            this.logger.logInfo(`Wails generated SetDefaultInputLanguage completed successfully`);
        } catch (error) {
            const err = parseError(error);
            this.logger.logError(`Wails generated SetDefaultInputLanguage failed: ${err.message}`);
            throw error;
        }
    }

    /**
     * Sets the default output language
     *
     * @param language - Language code to set as default for output
     * @throws Rejects with original error if operation fails
     */
    async setDefaultOutputLanguage(language: string): Promise<void> {
        try {
            this.logger.logInfo(`Attempt to call Wails generated SetDefaultOutputLanguage with language: ${language}`);
            const result = await SetDefaultOutputLanguage(language);
            if (result.error) {
                throw new Error(`${result.error.title}: ${result.error.message}`);
            }
            this.logger.logInfo(`Wails generated SetDefaultOutputLanguage completed successfully`);
        } catch (error) {
            const err = parseError(error);
            this.logger.logError(`Wails generated SetDefaultOutputLanguage failed: ${err.message}`);
            throw error;
        }
    }

    /**
     * Updates the inference base configuration
     *
     * @param inferenceBaseConfig - Complete inference configuration to update
     * @returns Updated inference configuration
     * @throws Rejects with original error if operation fails
     */
    async updateInferenceBaseConfig(inferenceBaseConfig: InferenceBaseConfig): Promise<InferenceBaseConfig> {
        try {
            this.logger.logInfo(`Attempt to call Wails generated UpdateInferenceBaseConfig`);
            const result = await UpdateInferenceBaseConfig(apperr.InferenceBaseConfig.createFrom(inferenceBaseConfig));
            const data = unwrapOrThrow(result);
            this.logger.logInfo(`Wails generated UpdateInferenceBaseConfig completed successfully`);
            return data;
        } catch (error) {
            const err = parseError(error);
            this.logger.logError(`Wails generated UpdateInferenceBaseConfig failed: ${err.message}`);
            throw error;
        }
    }

    /**
     * Updates the model configuration
     *
     * @param modelConfig - Complete model configuration to update
     * @returns Updated model configuration
     * @throws Rejects with original error if operation fails
     */
    async updateModelConfig(modelConfig: ModelConfig): Promise<ModelConfig> {
        try {
            this.logger.logInfo(`Attempt to call Wails generated UpdateModelConfig with model: ${modelConfig.name}`);
            const result = await UpdateModelConfig(apperr.ModelConfig.createFrom(modelConfig));
            const data = unwrapOrThrow(result);
            this.logger.logInfo(`Wails generated UpdateModelConfig completed successfully for model: ${data.name}`);
            return data;
        } catch (error) {
            const err = parseError(error);
            this.logger.logError(`Wails generated UpdateModelConfig failed: ${err.message}`);
            throw error;
        }
    }

    /**
     * Updates a provider configuration
     *
     * @param providerConfig - Complete provider configuration to update
     * @returns Updated provider configuration
     * @throws Rejects with original error if operation fails
     */
    async updateProviderConfig(providerConfig: ProviderConfig): Promise<ProviderConfig> {
        try {
            this.logger.logInfo(`Attempt to call Wails generated UpdateProviderConfig with provider: ${providerConfig.providerName}`);
            const result = await UpdateProviderConfig(toWireProvider(providerConfig));
            const data = fromWireProvider(unwrapOrThrow(result));
            this.logger.logInfo(`Wails generated UpdateProviderConfig completed successfully for provider: ${data.providerName}`);
            return data;
        } catch (error) {
            const err = parseError(error);
            this.logger.logError(`Wails generated UpdateProviderConfig failed: ${err.message}`);
            throw error;
        }
    }

    /**
     * Retrieves the application behavior configuration
     *
     * @returns App behavior configuration with task logging settings
     * @throws Rejects with original error if operation fails
     */
    async getAppBehaviorConfig(): Promise<AppBehaviorConfig> {
        try {
            this.logger.logInfo(`Attempt to call Wails generated GetAppBehaviorConfig`);
            const result = await GetAppBehaviorConfig();
            const wire = unwrapOrThrow(result);
            const data: AppBehaviorConfig = { enableTaskLogging: wire.enableTaskLogging, logDirectory: '' };
            this.logger.logInfo(`Wails generated GetAppBehaviorConfig completed successfully`);
            return data;
        } catch (error) {
            const err = parseError(error);
            this.logger.logError(`Wails generated GetAppBehaviorConfig failed: ${err.message}`);
            throw error;
        }
    }

    /**
     * Updates the application behavior configuration
     *
     * @param config - App behavior configuration to update
     * @returns Updated app behavior configuration
     * @throws Rejects with original error if operation fails
     */
    async updateAppBehaviorConfig(config: AppBehaviorConfig): Promise<AppBehaviorConfig> {
        try {
            this.logger.logInfo(`Attempt to call Wails generated UpdateAppBehaviorConfig`);
            const result = await UpdateAppBehaviorConfig(apperr.AppBehaviorConfig.createFrom({ enableTaskLogging: config.enableTaskLogging }));
            const wire = unwrapOrThrow(result);
            const data: AppBehaviorConfig = { enableTaskLogging: wire.enableTaskLogging, logDirectory: '' };
            this.logger.logInfo(`Wails generated UpdateAppBehaviorConfig completed successfully`);
            return data;
        } catch (error) {
            const err = parseError(error);
            this.logger.logError(`Wails generated UpdateAppBehaviorConfig failed: ${err.message}`);
            throw error;
        }
    }
}
export class ClipboardService implements IClipboardService {
    constructor(private readonly logger: ILoggerService) {}

    /**
     * Retrieves text from the system clipboard
     *
     * @returns Clipboard text content
     * @throws Rejects with error if clipboard access fails or is empty
     */
    async getText(): Promise<string> {
        try {
            this.logger.logInfo(`Attempt to call Wails generated ClipboardGetText`);
            const result = await ClipboardGetText();
            this.logger.logInfo(`Wails generated ClipboardGetText completed successfully`);
            return result;
        } catch (error) {
            const err = parseError(error);
            this.logger.logError(`Wails generated ClipboardGetText failed: ${err.message}`);
            throw error;
        }
    }

    /**
     * Sets text content to the system clipboard
     *
     * @param text - Text content to copy to clipboard
     * @returns Boolean indicating success (true) or failure (false)
     * @throws Rejects with error if clipboard access fails
     */
    async setText(text: string): Promise<boolean> {
        try {
            this.logger.logInfo(`Attempt to call Wails generated ClipboardSetText with text length: ${text.length}`);
            const result = await ClipboardSetText(text);
            this.logger.logInfo(`Wails generated ClipboardSetText completed successfully, result: ${result}`);
            return result;
        } catch (error) {
            const err = parseError(error);
            this.logger.logError(`Wails generated ClipboardSetText failed: ${err.message}`);
            throw error;
        }
    }
}
