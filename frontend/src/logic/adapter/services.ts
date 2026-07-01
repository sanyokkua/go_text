import {
    CancelAllRuns,
    CancelChain,
    GetActionCatalog,
    GetModels,
    PreviewPrompt,
    ProcessPromptChain,
    TestConnection,
    TestInference,
    TestModels,
} from '../../../wailsjs/go/actions/ActionHandler';
import {
    LogError as AppLogError,
    BrowserOpenURL,
    ClipboardGetText,
    ClipboardSetText,
    OpenPath,
} from '../../../wailsjs/go/application/ApplicationContextHolder';
import { ClearHistory, DeleteHistoryEntry, GetHistoryEntry, ListHistory } from '../../../wailsjs/go/history/HistoryHandler';
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
    GetLoggingConfig,
    GetModelConfig,
    GetSettings,
    GetUIPreferencesConfig,
    ProviderPresets,
    RemoveLanguage,
    ResetSettingsToDefault,
    SetAsCurrentProviderConfig,
    SetDefaultInputLanguage,
    SetDefaultOutputLanguage,
    UpdateAppBehaviorConfig,
    UpdateInferenceBaseConfig,
    UpdateLoggingConfig,
    UpdateModelConfig,
    UpdateProviderConfig,
    UpdateUIPreferencesConfig,
} from '../../../wailsjs/go/settings/SettingsHandler';
import {
    CreateStack,
    DeleteStack,
    DuplicateStack,
    GetStack,
    ListStacks,
    SuggestedStacks,
    UpdateStack,
} from '../../../wailsjs/go/stacks/StackHandler';
import { LogDebug, LogError, LogFatal, LogInfo, LogPrint, LogTrace, LogWarning } from '../../../wailsjs/runtime';
import { IActionHandler, IAppHandler, IClipboardService, IHistoryHandler, ILoggerService, ISettingsHandler, IStackHandler } from './interfaces';
import { toWireBehavior, toWireLogging, toWireProvider, toWireUIPreferences } from './mappers';
import { AppBehaviorConfig, InferenceBaseConfig, LoggingConfig, ModelConfig, ProviderConfig, UIPreferencesConfig } from './models';

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

export class AppHandler implements IAppHandler {
    constructor(private readonly logger: ILoggerService) {}

    logError(message: string): Promise<apperr.VoidResult> {
        this.logger.logDebug(`AppHandler.logError: ${message}`);
        return AppLogError(message);
    }

    clipboardGetText(): Promise<apperr.StringResult> {
        return ClipboardGetText();
    }

    clipboardSetText(text: string): Promise<apperr.VoidResult> {
        return ClipboardSetText(text);
    }

    browserOpenURL(url: string): Promise<apperr.VoidResult> {
        this.logger.logDebug(`AppHandler.browserOpenURL: ${url}`);
        return BrowserOpenURL(url);
    }

    openPath(path: string): Promise<apperr.VoidResult> {
        this.logger.logDebug(`AppHandler.openPath: ${path}`);
        return OpenPath(path);
    }
}

export class ActionHandler implements IActionHandler {
    constructor(private readonly logger: ILoggerService) {}

    async getActionCatalog(): Promise<apperr.CatalogResult> {
        this.logger.logInfo('getActionCatalog');
        return GetActionCatalog();
    }

    async getModels(providerId: string): Promise<apperr.ModelsResult> {
        this.logger.logInfo(`getModels: ${providerId}`);
        return GetModels(providerId);
    }

    async previewPrompt(req: apperr.PromptPreviewRequest): Promise<apperr.PromptPreviewResult> {
        this.logger.logInfo('previewPrompt');
        return PreviewPrompt(req);
    }

    async processPromptChain(req: apperr.ChainRequest): Promise<apperr.ChainResultEnv> {
        this.logger.logInfo('processPromptChain');
        return ProcessPromptChain(req);
    }

    async cancelChain(runId: string): Promise<apperr.VoidResult> {
        this.logger.logInfo(`cancelChain: ${runId}`);
        return CancelChain(runId);
    }

    async cancelAllRuns(): Promise<void> {
        this.logger.logInfo('cancelAllRuns');
        return CancelAllRuns();
    }

    async testConnection(providerConfig: ProviderConfig): Promise<apperr.VerifyResult> {
        this.logger.logInfo(`testConnection: ${providerConfig.providerName}`);
        return TestConnection(toWireProvider(providerConfig));
    }

    async testInference(providerConfig: ProviderConfig): Promise<apperr.VerifyResult> {
        this.logger.logInfo(`testInference: ${providerConfig.providerName}`);
        return TestInference(toWireProvider(providerConfig));
    }

    async testModels(providerConfig: ProviderConfig): Promise<apperr.VerifyResult> {
        this.logger.logInfo(`testModels: ${providerConfig.providerName}`);
        return TestModels(toWireProvider(providerConfig));
    }
}

export class SettingsHandler implements ISettingsHandler {
    constructor(private readonly logger: ILoggerService) {}

    async addLanguage(language: string): Promise<apperr.LanguagesResult> {
        this.logger.logInfo(`addLanguage: ${language}`);
        return AddLanguage(language);
    }

    async createProviderConfig(providerConfig: ProviderConfig): Promise<apperr.ProviderResult> {
        this.logger.logInfo(`createProviderConfig: ${providerConfig.providerName}`);
        return CreateProviderConfig(toWireProvider(providerConfig));
    }

    async deleteProviderConfig(providerId: string): Promise<apperr.VoidResult> {
        this.logger.logInfo(`deleteProviderConfig: ${providerId}`);
        return DeleteProviderConfig(providerId);
    }

    async getAllProviderConfigs(): Promise<apperr.ProvidersResult> {
        this.logger.logInfo('getAllProviderConfigs');
        return GetAllProviderConfigs();
    }

    async getAppSettingsMetadata(): Promise<apperr.MetadataResult> {
        this.logger.logInfo('getAppSettingsMetadata');
        return GetAppSettingsMetadata();
    }

    async getCurrentProviderConfig(): Promise<apperr.ProviderResult> {
        this.logger.logInfo('getCurrentProviderConfig');
        return GetCurrentProviderConfig();
    }

    async getInferenceBaseConfig(): Promise<apperr.InferenceResult> {
        this.logger.logInfo('getInferenceBaseConfig');
        return GetInferenceBaseConfig();
    }

    async getLanguageConfig(): Promise<apperr.LanguageResult> {
        this.logger.logInfo('getLanguageConfig');
        return GetLanguageConfig();
    }

    async providerPresets(): Promise<apperr.ProviderPresetsResult> {
        this.logger.logInfo('providerPresets');
        return ProviderPresets();
    }

    async getModelConfig(): Promise<apperr.ModelConfigResult> {
        this.logger.logInfo('getModelConfig');
        return GetModelConfig();
    }

    async getSettings(): Promise<apperr.SettingsResult> {
        this.logger.logInfo('getSettings');
        return GetSettings();
    }

    async removeLanguage(language: string): Promise<apperr.LanguagesResult> {
        this.logger.logInfo(`removeLanguage: ${language}`);
        return RemoveLanguage(language);
    }

    async resetSettingsToDefault(): Promise<apperr.SettingsResult> {
        this.logger.logInfo('resetSettingsToDefault');
        return ResetSettingsToDefault();
    }

    async setAsCurrentProviderConfig(providerId: string): Promise<apperr.ProviderResult> {
        this.logger.logInfo(`setAsCurrentProviderConfig: ${providerId}`);
        return SetAsCurrentProviderConfig(providerId);
    }

    async setDefaultInputLanguage(language: string): Promise<apperr.VoidResult> {
        this.logger.logInfo(`setDefaultInputLanguage: ${language}`);
        return SetDefaultInputLanguage(language);
    }

    async setDefaultOutputLanguage(language: string): Promise<apperr.VoidResult> {
        this.logger.logInfo(`setDefaultOutputLanguage: ${language}`);
        return SetDefaultOutputLanguage(language);
    }

    async updateInferenceBaseConfig(config: InferenceBaseConfig): Promise<apperr.InferenceResult> {
        this.logger.logInfo('updateInferenceBaseConfig');
        return UpdateInferenceBaseConfig(config);
    }

    async updateModelConfig(config: ModelConfig): Promise<apperr.ModelConfigResult> {
        this.logger.logInfo(`updateModelConfig: ${config.name}`);
        return UpdateModelConfig(config);
    }

    async updateProviderConfig(providerConfig: ProviderConfig): Promise<apperr.ProviderResult> {
        this.logger.logInfo(`updateProviderConfig: ${providerConfig.providerName}`);
        return UpdateProviderConfig(toWireProvider(providerConfig));
    }

    async getAppBehaviorConfig(): Promise<apperr.AppBehaviorResult> {
        this.logger.logInfo('getAppBehaviorConfig');
        return GetAppBehaviorConfig();
    }

    async updateAppBehaviorConfig(config: AppBehaviorConfig): Promise<apperr.AppBehaviorResult> {
        this.logger.logInfo('updateAppBehaviorConfig');
        return UpdateAppBehaviorConfig(toWireBehavior(config));
    }

    async getUIPreferencesConfig(): Promise<apperr.UIPreferencesResult> {
        this.logger.logInfo('getUIPreferencesConfig');
        return GetUIPreferencesConfig();
    }

    async updateUIPreferencesConfig(config: UIPreferencesConfig): Promise<apperr.UIPreferencesResult> {
        this.logger.logInfo('updateUIPreferencesConfig');
        return UpdateUIPreferencesConfig(toWireUIPreferences(config));
    }

    async getLoggingConfig(): Promise<apperr.LoggingResult> {
        this.logger.logInfo('getLoggingConfig');
        return GetLoggingConfig();
    }

    async updateLoggingConfig(config: LoggingConfig): Promise<apperr.LoggingResult> {
        this.logger.logInfo('updateLoggingConfig');
        return UpdateLoggingConfig(toWireLogging(config));
    }
}

export class HistoryHandler implements IHistoryHandler {
    constructor(private readonly logger: ILoggerService) {}

    async clearHistory(): Promise<apperr.VoidResult> {
        this.logger.logInfo('clearHistory');
        return ClearHistory();
    }

    async deleteHistoryEntry(id: string): Promise<apperr.VoidResult> {
        this.logger.logInfo(`deleteHistoryEntry: ${id}`);
        return DeleteHistoryEntry(id);
    }

    async getHistoryEntry(id: string): Promise<apperr.HistoryEntryResult> {
        this.logger.logInfo(`getHistoryEntry: ${id}`);
        return GetHistoryEntry(id);
    }

    async listHistory(limit: number, offset: number): Promise<apperr.HistoryListResult> {
        this.logger.logInfo(`listHistory: limit=${limit} offset=${offset}`);
        return ListHistory(limit, offset);
    }
}

export class StackHandler implements IStackHandler {
    constructor(private readonly logger: ILoggerService) {}

    async createStack(stack: apperr.SavedStack): Promise<apperr.StackResult> {
        this.logger.logInfo(`createStack: ${stack.name}`);
        return CreateStack(stack);
    }

    async deleteStack(id: string): Promise<apperr.VoidResult> {
        this.logger.logInfo(`deleteStack: ${id}`);
        return DeleteStack(id);
    }

    async duplicateStack(id: string, newName: string): Promise<apperr.StackResult> {
        this.logger.logInfo(`duplicateStack: ${id} -> ${newName}`);
        return DuplicateStack(id, newName);
    }

    async getStack(id: string): Promise<apperr.StackResult> {
        this.logger.logInfo(`getStack: ${id}`);
        return GetStack(id);
    }

    async listStacks(): Promise<apperr.StacksResult> {
        this.logger.logInfo('listStacks');
        return ListStacks();
    }

    async suggestedStacks(): Promise<apperr.SuggestedStacksResult> {
        this.logger.logInfo('suggestedStacks');
        return SuggestedStacks();
    }

    async updateStack(stack: apperr.SavedStack): Promise<apperr.StackResult> {
        this.logger.logInfo(`updateStack: ${stack.name}`);
        return UpdateStack(stack);
    }
}

export class ClipboardService implements IClipboardService {
    constructor(
        private readonly logger: ILoggerService,
        private readonly appHandler: IAppHandler,
    ) {}

    async getText(): Promise<string> {
        try {
            const result = await this.appHandler.clipboardGetText();
            return result.data ?? '';
        } catch (e) {
            this.logger.logError(`ClipboardGetText failed: ${String(e)}`);
            return '';
        }
    }

    async setText(text: string): Promise<boolean> {
        try {
            const result = await this.appHandler.clipboardSetText(text);
            return !result.error;
        } catch (e) {
            this.logger.logError(`ClipboardSetText failed: ${String(e)}`);
            return false;
        }
    }
}
