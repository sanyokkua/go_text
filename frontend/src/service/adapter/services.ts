import { IActionService, IClipboardService, ILoggerService, ISettingsService } from './interfaces';
import { fromBackendActions, fromBackendSettings, toBackendActionRequest, toBackendProviderConfig, toBackendSettings } from './mappers';
import { FrontActionRequest, FrontActions, FrontProviderConfig, FrontSettings } from './models';

import { GetActionGroups as backendGetActionGroups, ProcessAction as backendProcessAction } from '../../../wailsjs/go/frontend/actionService';

import {
    CreateNewProvider as backendCreateNewProvider,
    DeleteProvider as backendDeleteProvider,
    GetCurrentSettings as backendGetCurrentSettings,
    GetDefaultSettings as backendGetDefaultSettings,
    GetModelsList as backendGetModelsList,
    GetProviderTypes as backendGetProviderTypes,
    GetSettingsFilePath as backendGetSettingsFilePath,
    SaveSettings as backendSaveSettings,
    SelectProvider as backendSelectProvider,
    UpdateProvider as backendUpdateProvider,
    ValidateProvider as backendValidateProvider,
} from '../../../wailsjs/go/frontend/settingsService';

import {
    ClipboardGetText as backendClipboardGetText,
    ClipboardSetText as backendClipboardSetText,
    LogDebug as backendLogDebug,
    LogError as backendLogError,
    LogFatal as backendLogFatal,
    LogInfo as backendLogInfo,
    LogTrace as backendLogTrace,
    LogWarning as backendLogWarning,
} from '../../../wailsjs/runtime';

/**
 * ActionService - Handles action-related operations
 * Wraps backend action API with proper error handling and data mapping
 */
export class ActionService implements IActionService {
    /**
     * Gets all available action groups from the backend
     * @returns Promise<FrontActions> - Available action groups
     * @throws Error if backend call fails
     */
    async getActionGroups(): Promise<FrontActions> {
        try {
            const backendActions = await backendGetActionGroups();
            return fromBackendActions(backendActions);
        } catch (error) {
            backendLogError(`ActionService.getActionGroups failed: ${error}`);
            throw new Error('Failed to get action groups');
        }
    }

    /**
     * Processes an action request through the backend
     * @param actionRequest - Action request to process
     * @returns Promise<string> - Result of the action processing
     * @throws Error if backend call fails
     */
    async processAction(actionRequest: FrontActionRequest): Promise<string> {
        try {
            const backendRequest = toBackendActionRequest(actionRequest);
            return await backendProcessAction(backendRequest);
        } catch (error) {
            backendLogError(`ActionService.processAction failed: ${error}`);
            throw new Error('Failed to process action');
        }
    }
}

/**
 * SettingsService - Handles settings-related operations
 * Wraps backend settings API with proper error handling and data mapping
 */
export class SettingsService implements ISettingsService {
    /**
     * Creates a new provider configuration
     * @param providerConfig - Provider configuration to create
     * @param modelName - Optional model name to be used for validation
     * @returns Promise<FrontProviderConfig> - Created provider configuration
     * @throws Error if backend call fails
     */
    async createNewProvider(providerConfig: FrontProviderConfig, modelName?: string): Promise<FrontProviderConfig> {
        try {
            const backendProviderConfig = toBackendProviderConfig(providerConfig);
            const createdProvider = await backendCreateNewProvider(backendProviderConfig, modelName ?? '');
            return this.mapBackendProviderConfigToFrontend(createdProvider);
        } catch (error) {
            backendLogError(`SettingsService.createNewProvider failed: ${error}`);
            throw new Error('Failed to create new provider');
        }
    }

    /**
     * Deletes a provider configuration
     * @param providerConfig - Provider configuration to delete
     * @returns Promise<boolean> - True if deletion was successful
     * @throws Error if backend call fails
     */
    async deleteProvider(providerConfig: FrontProviderConfig): Promise<boolean> {
        try {
            const backendProviderConfig = toBackendProviderConfig(providerConfig);
            return await backendDeleteProvider(backendProviderConfig);
        } catch (error) {
            backendLogError(`SettingsService.deleteProvider failed: ${error}`);
            throw new Error('Failed to delete provider');
        }
    }

    /**
     * Gets the current settings
     * @returns Promise<FrontSettings> - Current settings
     * @throws Error if backend call fails
     */
    async getCurrentSettings(): Promise<FrontSettings> {
        try {
            const backendSettings = await backendGetCurrentSettings();
            return fromBackendSettings(backendSettings);
        } catch (error) {
            backendLogError(`SettingsService.getCurrentSettings failed: ${error}`);
            throw new Error('Failed to get current settings');
        }
    }

    /**
     * Gets the default settings
     * @returns Promise<FrontSettings> - Default settings
     * @throws Error if backend call fails
     */
    async getDefaultSettings(): Promise<FrontSettings> {
        try {
            const backendSettings = await backendGetDefaultSettings();
            return fromBackendSettings(backendSettings);
        } catch (error) {
            backendLogError(`SettingsService.getDefaultSettings failed: ${error}`);
            throw new Error('Failed to get default settings');
        }
    }

    /**
     * Gets the list of available models for a provider
     * @param providerConfig - Provider configuration to get models for
     * @returns Promise<Array<string>> - List of available model names
     * @throws Error if backend call fails
     */
    async getModelsList(providerConfig: FrontProviderConfig): Promise<Array<string>> {
        try {
            const backendProviderConfig = toBackendProviderConfig(providerConfig);
            return await backendGetModelsList(backendProviderConfig);
        } catch (error) {
            backendLogError(`SettingsService.getModelsList failed: ${error}`);
            throw new Error('Failed to get models list');
        }
    }

    /**
     * Gets the available provider types
     * @returns Promise<Array<string>> - List of available provider types
     * @throws Error if backend call fails
     */
    async getProviderTypes(): Promise<Array<string>> {
        try {
            return await backendGetProviderTypes();
        } catch (error) {
            backendLogError(`SettingsService.getProviderTypes failed: ${error}`);
            throw new Error('Failed to get provider types');
        }
    }

    /**
     * Gets the settings file path
     * @returns Promise<string> - Path to the settings file
     * @throws Error if backend call fails
     */
    async getSettingsFilePath(): Promise<string> {
        try {
            return await backendGetSettingsFilePath();
        } catch (error) {
            backendLogError(`SettingsService.getSettingsFilePath failed: ${error}`);
            throw new Error('Failed to get settings file path');
        }
    }

    /**
     * Saves the current settings
     * @param settings - Settings to save
     * @returns Promise<FrontSettings> - Saved settings
     * @throws Error if backend call fails
     */
    async saveSettings(settings: FrontSettings): Promise<FrontSettings> {
        try {
            const backendSettings = toBackendSettings(settings);
            const savedSettings = await backendSaveSettings(backendSettings);
            return fromBackendSettings(savedSettings);
        } catch (error) {
            backendLogError(`SettingsService.saveSettings failed: ${error}`);
            throw new Error('Failed to save settings');
        }
    }

    /**
     * Selects a provider as the current provider
     * @param providerConfig - Provider configuration to select
     * @returns Promise<FrontProviderConfig> - Selected provider configuration
     * @throws Error if backend call fails
     */
    async selectProvider(providerConfig: FrontProviderConfig): Promise<FrontProviderConfig> {
        try {
            const backendProviderConfig = toBackendProviderConfig(providerConfig);
            const selectedProvider = await backendSelectProvider(backendProviderConfig);
            return this.mapBackendProviderConfigToFrontend(selectedProvider);
        } catch (error) {
            backendLogError(`SettingsService.selectProvider failed: ${error}`);
            throw new Error('Failed to select provider');
        }
    }

    /**
     * Updates a provider configuration
     * @param providerConfig - Provider configuration to update
     * @returns Promise<FrontProviderConfig> - Updated provider configuration
     * @throws Error if backend call fails
     */
    async updateProvider(providerConfig: FrontProviderConfig): Promise<FrontProviderConfig> {
        try {
            const backendProviderConfig = toBackendProviderConfig(providerConfig);
            const updatedProvider = await backendUpdateProvider(backendProviderConfig);
            return this.mapBackendProviderConfigToFrontend(updatedProvider);
        } catch (error) {
            backendLogError(`SettingsService.updateProvider failed: ${error}`);
            throw new Error('Failed to update provider');
        }
    }

    /**
     * Validates a provider configuration
     * @param providerConfig - Provider configuration to validate
     * @param validateHttpCall - Calls models and completion endpoints of provider to check if they are working
     * @param modelName - Optional Model name to be used during the validation
     * @returns Promise<boolean> - True if provider is valid
     * @throws Error if backend call fails
     */
    async validateProvider(providerConfig: FrontProviderConfig, validateHttpCall: boolean, modelName?: string): Promise<boolean> {
        try {
            const backendProviderConfig = toBackendProviderConfig(providerConfig);
            return await backendValidateProvider(backendProviderConfig, validateHttpCall, modelName ?? '');
        } catch (error) {
            backendLogError(`SettingsService.validateProvider failed: ${error}`);
            throw new Error('Failed to validate provider');
        }
    }

    /**
     * Maps backend provider config to frontend provider config
     * Handles provider type mapping and data validation
     * @param backendProviderConfig - Backend provider configuration
     * @returns FrontProviderConfig - Frontend provider configuration
     */
    private mapBackendProviderConfigToFrontend(backendProviderConfig: {
        providerType?: string;
        providerName?: string;
        baseUrl?: string;
        modelsEndpoint?: string;
        completionEndpoint?: string;
        headers?: Record<string, string>;
    }): FrontProviderConfig {
        // Map provider type from backend string to frontend type
        const providerType = backendProviderConfig.providerType || 'open-ai-compatible';

        // Validate and clean base URL
        let baseUrl = backendProviderConfig.baseUrl || '';
        if (baseUrl && !(baseUrl.startsWith('http://') || baseUrl.startsWith('https://'))) {
            baseUrl = 'http://' + baseUrl;
        }

        // Clean empty headers
        let headers = backendProviderConfig.headers || {};
        if (headers && headers['']) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { ['']: _, ...rest } = headers;
            headers = rest;
        }

        return {
            providerName: backendProviderConfig.providerName || '',
            providerType: providerType,
            baseUrl: baseUrl,
            modelsEndpoint: backendProviderConfig.modelsEndpoint || '',
            completionEndpoint: backendProviderConfig.completionEndpoint || '',
            headers: headers,
        };
    }
}

/**
 * ClipboardService - Handles clipboard operations
 * Wraps backend clipboard API with proper error handling
 */
export class ClipboardService implements IClipboardService {
    /**
     * Gets text from the clipboard
     * @returns Promise<string> - Text from clipboard
     * @throws Error if clipboard access fails
     */
    async clipboardGetText(): Promise<string> {
        try {
            return await backendClipboardGetText();
        } catch (error) {
            backendLogError(`ClipboardService.clipboardGetText failed: ${error}`);
            throw new Error('Failed to get clipboard text');
        }
    }

    /**
     * Sets text to the clipboard
     * @param text - Text to set to clipboard
     * @returns Promise<boolean> - True if operation was successful
     * @throws Error if clipboard access fails
     */
    async clipboardSetText(text: string): Promise<boolean> {
        try {
            return await backendClipboardSetText(text);
        } catch (error) {
            backendLogError(`ClipboardService.clipboardSetText failed: ${error}`);
            throw new Error('Failed to set clipboard text');
        }
    }
}

/**
 * LoggerService - Handles logging operations
 * Wraps backend logging API with proper error handling
 */
export class LoggerService implements ILoggerService {
    /**
     * Logs a debug message
     * @param message - Message to log
     */
    debug(message: string): void {
        try {
            backendLogDebug(message);
        } catch (error) {
            console.error(`LoggerService.logDebug failed: ${error}`);
        }
    }

    /**
     * Logs an error message
     * @param message - Message to log
     */
    error(message: string): void {
        try {
            backendLogError(message);
        } catch (error) {
            console.error(`LoggerService.logError failed: ${error}`);
        }
    }

    /**
     * Logs a fatal message
     * @param message - Message to log
     */
    fatal(message: string): void {
        try {
            backendLogFatal(message);
        } catch (error) {
            console.error(`LoggerService.logFatal failed: ${error}`);
        }
    }

    /**
     * Logs an info message
     * @param message - Message to log
     */
    info(message: string): void {
        try {
            backendLogInfo(message);
        } catch (error) {
            console.error(`LoggerService.logInfo failed: ${error}`);
        }
    }

    /**
     * Logs a trace message
     * @param message - Message to log
     */
    trace(message: string): void {
        try {
            backendLogTrace(message);
        } catch (error) {
            console.error(`LoggerService.logTrace failed: ${error}`);
        }
    }

    /**
     * Logs a warning message
     * @param message - Message to log
     */
    warning(message: string): void {
        try {
            backendLogWarning(message);
        } catch (error) {
            console.error(`LoggerService.logWarning failed: ${error}`);
        }
    }
}
