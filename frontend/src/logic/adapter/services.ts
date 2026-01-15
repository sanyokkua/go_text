import {
    GetCompletionResponseForProvider,
    GetModelsList,
    GetModelsListForProvider,
    GetPromptGroups,
    ProcessPrompt,
} from '../../../wailsjs/go/actions/ActionHandler';
import { llms, settings } from '../../../wailsjs/go/models';
import {
    AddLanguage,
    CreateProviderConfig,
    DeleteProviderConfig,
    GetAllProviderConfigs,
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
    UpdateInferenceBaseConfig,
    UpdateModelConfig,
    UpdateProviderConfig,
} from '../../../wailsjs/go/settings/SettingsHandler';
import { ClipboardGetText, ClipboardSetText, LogDebug, LogError, LogFatal, LogInfo, LogPrint, LogTrace, LogWarning } from '../../../wailsjs/runtime';
import { parseError } from '../utils/error_utils';
import { IActionHandler, IClipboardService, ILoggerService, ISettingsHandler } from './interfaces';
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
 * Handles all AI-related operations including completion requests, model management, and prompt processing.
 *
 * Key Responsibilities:
 * - Converting frontend models to Wails-compatible formats
 * - Error handling and logging for all LLM operations
 * - Managing provider-specific operations
 * - Processing user-initiated prompt actions
 */
export class ActionHandler implements IActionHandler {
    constructor(private readonly logger: ILoggerService) {}

    /**
     * Gets completion response from a specific provider
     *
     * @param providerConfig - Provider configuration to use
     * @param chatCompletionRequest - Complete request with a model, messages, and parameters
     * @returns Generated completion text
     * @throws Rejects with original error if operation fails
     */
    async getCompletionResponseForProvider(providerConfig: ProviderConfig, chatCompletionRequest: ChatCompletionRequest): Promise<string> {
        try {
            this.logger.logInfo(
                `Attempt to call Wails generated GetCompletionResponseForProvider with provider: ${providerConfig.providerName}, request: ${JSON.stringify(chatCompletionRequest)}`,
            );
            const wailsProviderConfig = settings.ProviderConfig.createFrom(providerConfig);
            const wailsChatCompletionRequest = llms.ChatCompletionRequest.createFrom(chatCompletionRequest);
            const result = await GetCompletionResponseForProvider(wailsProviderConfig, wailsChatCompletionRequest);
            this.logger.logInfo(`Wails generated GetCompletionResponseForProvider completed successfully`);
            return result;
        } catch (error) {
            const err = parseError(error);
            this.logger.logError(`Wails generated GetCompletionResponseForProvider failed: ${err.message}`);
            return Promise.reject(error);
        }
    }

    /**
     * Retrieves a list of available models from current provider
     *
     * @returns Array of model names
     * @throws Rejects with original error if operation fails
     */
    async getModelsList(): Promise<Array<string>> {
        try {
            this.logger.logInfo(`Attempt to call Wails generated GetModelsList`);
            const result = await GetModelsList();
            this.logger.logInfo(`Wails generated GetModelsList completed successfully, found ${result.length} models`);
            return result;
        } catch (error) {
            const err = parseError(error);
            this.logger.logError(`Wails generated GetModelsList failed: ${err.message}`);
            return Promise.reject(error);
        }
    }

    /**
     * Retrieves a list of available models from specific provider
     *
     * @param providerConfig - Provider configuration to query
     * @returns Array of model names
     * @throws Rejects with original error if operation fails
     */
    async getModelsListForProvider(providerConfig: ProviderConfig): Promise<Array<string>> {
        try {
            this.logger.logInfo(`Attempt to call Wails generated GetModelsListForProvider with provider: ${providerConfig.providerName}`);
            const result = await GetModelsListForProvider(providerConfig);
            this.logger.logInfo(`Wails generated GetModelsListForProvider completed successfully, found ${result.length} models`);
            return result;
        } catch (error) {
            const err = parseError(error);
            this.logger.logError(`Wails generated GetModelsListForProvider failed: ${err.message}`);
            return Promise.reject(error);
        }
    }

    /**
     * Retrieves all available prompt groups
     *
     * @returns Complete prompts collection with all groups and individual prompts
     * @throws Rejects with original error if operation fails
     */
    async getPromptGroups(): Promise<Prompts> {
        try {
            this.logger.logInfo(`Attempt to call Wails generated GetPromptGroups`);
            const result = await GetPromptGroups();
            const groupCount = Object.keys(result.promptGroups).length;
            this.logger.logInfo(`Wails generated GetPromptGroups completed successfully, found ${groupCount} prompt groups`);
            return result;
        } catch (error) {
            const err = parseError(error);
            this.logger.logError(`Wails generated GetPromptGroups failed: ${err.message}`);
            return Promise.reject(error);
        }
    }

    /**
     * Processes a specific prompt action with user input
     *
     * @param promptActionRequest - Request containing prompt ID, input text, and language config
     * @returns Generated output text from prompt processing
     * @throws Rejects with original error if operation fails
     */
    async processPrompt(promptActionRequest: PromptActionRequest): Promise<string> {
        try {
            this.logger.logInfo(`Attempt to call Wails generated ProcessPrompt with request: ${JSON.stringify(promptActionRequest)}`);
            const result = await ProcessPrompt(promptActionRequest);
            this.logger.logInfo(`Wails generated ProcessPrompt completed successfully`);
            return result;
        } catch (error) {
            const err = parseError(error);
            this.logger.logError(`Wails generated ProcessPrompt failed: ${err.message}`);
            return Promise.reject(error);
        }
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
            this.logger.logInfo(`Wails generated AddLanguage completed successfully, languages count: ${result.length}`);
            return result;
        } catch (error) {
            const err = parseError(error);
            this.logger.logError(`Wails generated AddLanguage failed: ${err.message}`);
            return Promise.reject(error);
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
            const wailsProviderConfig = settings.ProviderConfig.createFrom(providerConfig);
            const result = await CreateProviderConfig(wailsProviderConfig);
            this.logger.logInfo(`Wails generated CreateProviderConfig completed successfully for provider: ${result.providerName}`);
            return result;
        } catch (error) {
            const err = parseError(error);
            this.logger.logError(`Wails generated CreateProviderConfig failed: ${err.message}`);
            return Promise.reject(error);
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
            await DeleteProviderConfig(providerId);
            this.logger.logInfo(`Wails generated DeleteProviderConfig completed successfully`);
        } catch (error) {
            const err = parseError(error);
            this.logger.logError(`Wails generated DeleteProviderConfig failed: ${err.message}`);
            return Promise.reject(error);
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
            this.logger.logInfo(`Wails generated GetAllProviderConfigs completed successfully, found ${result.length} providers`);
            return result;
        } catch (error) {
            const err = parseError(error);
            this.logger.logError(`Wails generated GetAllProviderConfigs failed: ${err.message}`);
            return Promise.reject(error);
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
            this.logger.logInfo(`Wails generated GetAppSettingsMetadata completed successfully`);
            return result;
        } catch (error) {
            const err = parseError(error);
            this.logger.logError(`Wails generated GetAppSettingsMetadata failed: ${err.message}`);
            return Promise.reject(error);
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
            this.logger.logInfo(`Wails generated GetCurrentProviderConfig completed successfully for provider: ${result.providerName}`);
            return result;
        } catch (error) {
            const err = parseError(error);
            this.logger.logError(`Wails generated GetCurrentProviderConfig failed: ${err.message}`);
            return Promise.reject(error);
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
            this.logger.logInfo(`Wails generated GetInferenceBaseConfig completed successfully`);
            return result;
        } catch (error) {
            const err = parseError(error);
            this.logger.logError(`Wails generated GetInferenceBaseConfig failed: ${err.message}`);
            return Promise.reject(error);
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
            this.logger.logInfo(`Wails generated GetLanguageConfig completed successfully, languages count: ${result.languages.length}`);
            return result;
        } catch (error) {
            const err = parseError(error);
            this.logger.logError(`Wails generated GetLanguageConfig failed: ${err.message}`);
            return Promise.reject(error);
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
            this.logger.logInfo(`Wails generated GetModelConfig completed successfully for model: ${result.name}`);
            return result;
        } catch (error) {
            const err = parseError(error);
            this.logger.logError(`Wails generated GetModelConfig failed: ${err.message}`);
            return Promise.reject(error);
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
            this.logger.logInfo(`Wails generated GetSettings completed successfully, providers count: ${result.availableProviderConfigs.length}`);
            return result;
        } catch (error) {
            const err = parseError(error);
            this.logger.logError(`Wails generated GetSettings failed: ${err.message}`);
            return Promise.reject(error);
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
            this.logger.logInfo(`Wails generated RemoveLanguage completed successfully, languages count: ${result.length}`);
            return result;
        } catch (error) {
            const err = parseError(error);
            this.logger.logError(`Wails generated RemoveLanguage failed: ${err.message}`);
            return Promise.reject(error);
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
            this.logger.logInfo(`Wails generated ResetSettingsToDefault completed successfully`);
            return result;
        } catch (error) {
            const err = parseError(error);
            this.logger.logError(`Wails generated ResetSettingsToDefault failed: ${err.message}`);
            return Promise.reject(error);
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
            this.logger.logInfo(`Wails generated SetAsCurrentProviderConfig completed successfully for provider: ${result.providerName}`);
            return result;
        } catch (error) {
            const err = parseError(error);
            this.logger.logError(`Wails generated SetAsCurrentProviderConfig failed: ${err.message}`);
            return Promise.reject(error);
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
            await SetDefaultInputLanguage(language);
            this.logger.logInfo(`Wails generated SetDefaultInputLanguage completed successfully`);
        } catch (error) {
            const err = parseError(error);
            this.logger.logError(`Wails generated SetDefaultInputLanguage failed: ${err.message}`);
            return Promise.reject(error);
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
            await SetDefaultOutputLanguage(language);
            this.logger.logInfo(`Wails generated SetDefaultOutputLanguage completed successfully`);
        } catch (error) {
            const err = parseError(error);
            this.logger.logError(`Wails generated SetDefaultOutputLanguage failed: ${err.message}`);
            return Promise.reject(error);
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
            const wailsInferenceBaseConfig = settings.InferenceBaseConfig.createFrom(inferenceBaseConfig);
            const result = await UpdateInferenceBaseConfig(wailsInferenceBaseConfig);
            this.logger.logInfo(`Wails generated UpdateInferenceBaseConfig completed successfully`);
            return result;
        } catch (error) {
            const err = parseError(error);
            this.logger.logError(`Wails generated UpdateInferenceBaseConfig failed: ${err.message}`);
            return Promise.reject(error);
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
            const wailsModelConfig = settings.ModelConfig.createFrom(modelConfig);
            const result = await UpdateModelConfig(wailsModelConfig);
            this.logger.logInfo(`Wails generated UpdateModelConfig completed successfully for model: ${result.name}`);
            return result;
        } catch (error) {
            const err = parseError(error);
            this.logger.logError(`Wails generated UpdateModelConfig failed: ${err.message}`);
            return Promise.reject(error);
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
            const wailsProviderConfig = settings.ProviderConfig.createFrom(providerConfig);
            const result = await UpdateProviderConfig(wailsProviderConfig);
            this.logger.logInfo(`Wails generated UpdateProviderConfig completed successfully for provider: ${result.providerName}`);
            return result;
        } catch (error) {
            const err = parseError(error);
            this.logger.logError(`Wails generated UpdateProviderConfig failed: ${err.message}`);
            return Promise.reject(error);
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
            return Promise.reject(error);
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
            return Promise.reject(error);
        }
    }
}
