import {
    GetCompletionResponse,
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
    GetProviderConfig,
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
import {
    ClipboardGetText,
    ClipboardSetText,
    EventsEmit,
    EventsOff,
    EventsOffAll,
    EventsOn,
    EventsOnce,
    EventsOnMultiple,
    LogDebug,
    LogError,
    LogFatal,
    LogInfo,
    LogPrint,
    LogTrace,
    LogWarning,
} from '../../../wailsjs/runtime';
import { parseError } from '../utils/error_utils';
import { IActionHandler, IClipboardService, IEventsService, ILoggerService, ISettingsHandler } from './interfaces';
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

function formatLogMessage(message: string, serviceName?: string): string {
    if (serviceName && serviceName.trim().length > 0) {
        return `[FrontendLogger].${serviceName}: ${message}`;
    }
    return `[FrontendLogger].${message}`;
}
function logMessage(message: string, logFunction: (arg: string) => void, serviceName?: string) {
    try {
        logFunction(formatLogMessage(message, serviceName));
    } catch (error) {
        console.error(error);
    }
}

export class LoggerService implements ILoggerService {
    constructor(private readonly loggerServiceName?: string) {}

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
export class ActionHandler implements IActionHandler {
    constructor(private readonly logger: ILoggerService) {}

    async getCompletionResponse(chatCompletionRequest: ChatCompletionRequest): Promise<string> {
        try {
            this.logger.logInfo(`Attempt to call Wails generated GetCompletionResponse with arguments: ${JSON.stringify(chatCompletionRequest)}`);
            const wailsChatCompletionRequest = llms.ChatCompletionRequest.createFrom(chatCompletionRequest);
            const result = await GetCompletionResponse(wailsChatCompletionRequest);
            this.logger.logInfo(`Wails generated GetCompletionResponse completed successfully`);
            return result;
        } catch (error) {
            const err = parseError(error);
            this.logger.logError(`Wails generated GetCompletionResponse failed: ${err.message}`);
            return Promise.reject(error);
        }
    }

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
export class SettingsHandler implements ISettingsHandler {
    constructor(private readonly logger: ILoggerService) {}

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

    async getProviderConfig(providerId: string): Promise<ProviderConfig> {
        try {
            this.logger.logInfo(`Attempt to call Wails generated GetProviderConfig with providerId: ${providerId}`);
            const result = await GetProviderConfig(providerId);
            this.logger.logInfo(`Wails generated GetProviderConfig completed successfully for provider: ${result.providerName}`);
            return result;
        } catch (error) {
            const err = parseError(error);
            this.logger.logError(`Wails generated GetProviderConfig failed: ${err.message}`);
            return Promise.reject(error);
        }
    }

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
export class EventsService implements IEventsService {
    constructor(private readonly logger: ILoggerService) {}

    eventsEmit(eventName: string, ...data: unknown[]): void {
        try {
            this.logger.logInfo(`Attempt to call Wails generated EventsEmit with event: ${eventName}`);
            EventsEmit(eventName, ...data);
            this.logger.logInfo(`Wails generated EventsEmit completed successfully`);
        } catch (error) {
            const err = parseError(error);
            this.logger.logError(`Wails generated EventsEmit failed: ${err.message}`);
        }
    }

    eventsOff(eventName: string, ...additionalEventNames: string[]): void {
        try {
            this.logger.logInfo(`Attempt to call Wails generated EventsOff with event: ${eventName}`);
            EventsOff(eventName, ...additionalEventNames);
            this.logger.logInfo(`Wails generated EventsOff completed successfully`);
        } catch (error) {
            const err = parseError(error);
            this.logger.logError(`Wails generated EventsOff failed: ${err.message}`);
        }
    }

    eventsOffAll(): void {
        try {
            this.logger.logInfo(`Attempt to call Wails generated EventsOffAll`);
            EventsOffAll();
            this.logger.logInfo(`Wails generated EventsOffAll completed successfully`);
        } catch (error) {
            const err = parseError(error);
            this.logger.logError(`Wails generated EventsOffAll failed: ${err.message}`);
        }
    }

    eventsOn(eventName: string, callback: (...data: unknown[]) => void): () => void {
        try {
            this.logger.logInfo(`Attempt to call Wails generated EventsOn with event: ${eventName}`);
            const result = EventsOn(eventName, callback);
            this.logger.logInfo(`Wails generated EventsOn completed successfully`);
            return result;
        } catch (error) {
            const err = parseError(error);
            this.logger.logError(`Wails generated EventsOn failed: ${err.message}`);
            return () => {};
        }
    }

    eventsOnMultiple(eventName: string, callback: (...data: unknown[]) => void, maxCallbacks: number): () => void {
        try {
            this.logger.logInfo(`Attempt to call Wails generated EventsOnMultiple with event: ${eventName}, maxCallbacks: ${maxCallbacks}`);
            const result = EventsOnMultiple(eventName, callback, maxCallbacks);
            this.logger.logInfo(`Wails generated EventsOnMultiple completed successfully`);
            return result;
        } catch (error) {
            const err = parseError(error);
            this.logger.logError(`Wails generated EventsOnMultiple failed: ${err.message}`);
            return () => {};
        }
    }

    eventsOnce(eventName: string, callback: (...data: unknown[]) => void): () => void {
        try {
            this.logger.logInfo(`Attempt to call Wails generated EventsOnce with event: ${eventName}`);
            const result = EventsOnce(eventName, callback);
            this.logger.logInfo(`Wails generated EventsOnce completed successfully`);
            return result;
        } catch (error) {
            const err = parseError(error);
            this.logger.logError(`Wails generated EventsOnce failed: ${err.message}`);
            return () => {};
        }
    }
}
export class ClipboardService implements IClipboardService {
    constructor(private readonly logger: ILoggerService) {}

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
