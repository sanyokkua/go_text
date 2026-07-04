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
    SaveWindowSize,
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
import { guardArity } from './bridgeGuard';
import { IActionHandler, IAppHandler, IClipboardService, IHistoryHandler, ILoggerService, ISettingsHandler, IStackHandler } from './interfaces';
import { toWireBehavior, toWireLogging, toWireProvider, toWireUIPreferences } from './mappers';
import { AppBehaviorConfig, InferenceBaseConfig, LoggingConfig, ModelConfig, ProviderConfig, UIPreferencesConfig } from './models';

// Guarded wrappers: reject on argument-count mismatch instead of risking a
// hung Promise (see bridgeGuard.ts for why this is necessary with Wails v2).
const CancelAllRunsSafe = guardArity('ActionHandler.CancelAllRuns', CancelAllRuns);
const CancelChainSafe = guardArity('ActionHandler.CancelChain', CancelChain);
const GetActionCatalogSafe = guardArity('ActionHandler.GetActionCatalog', GetActionCatalog);
const GetModelsSafe = guardArity('ActionHandler.GetModels', GetModels);
const PreviewPromptSafe = guardArity('ActionHandler.PreviewPrompt', PreviewPrompt);
const ProcessPromptChainSafe = guardArity('ActionHandler.ProcessPromptChain', ProcessPromptChain);
const TestConnectionSafe = guardArity('ActionHandler.TestConnection', TestConnection);
const TestInferenceSafe = guardArity('ActionHandler.TestInference', TestInference);
const TestModelsSafe = guardArity('ActionHandler.TestModels', TestModels);

const AppLogErrorSafe = guardArity('AppHandler.LogError', AppLogError);
const BrowserOpenURLSafe = guardArity('AppHandler.BrowserOpenURL', BrowserOpenURL);
const ClipboardGetTextSafe = guardArity('AppHandler.ClipboardGetText', ClipboardGetText);
const ClipboardSetTextSafe = guardArity('AppHandler.ClipboardSetText', ClipboardSetText);
const OpenPathSafe = guardArity('AppHandler.OpenPath', OpenPath);
const SaveWindowSizeSafe = guardArity('AppHandler.SaveWindowSize', SaveWindowSize);

const ClearHistorySafe = guardArity('HistoryHandler.ClearHistory', ClearHistory);
const DeleteHistoryEntrySafe = guardArity('HistoryHandler.DeleteHistoryEntry', DeleteHistoryEntry);
const GetHistoryEntrySafe = guardArity('HistoryHandler.GetHistoryEntry', GetHistoryEntry);
const ListHistorySafe = guardArity('HistoryHandler.ListHistory', ListHistory);

const AddLanguageSafe = guardArity('SettingsHandler.AddLanguage', AddLanguage);
const CreateProviderConfigSafe = guardArity('SettingsHandler.CreateProviderConfig', CreateProviderConfig);
const DeleteProviderConfigSafe = guardArity('SettingsHandler.DeleteProviderConfig', DeleteProviderConfig);
const GetAllProviderConfigsSafe = guardArity('SettingsHandler.GetAllProviderConfigs', GetAllProviderConfigs);
const GetAppBehaviorConfigSafe = guardArity('SettingsHandler.GetAppBehaviorConfig', GetAppBehaviorConfig);
const GetAppSettingsMetadataSafe = guardArity('SettingsHandler.GetAppSettingsMetadata', GetAppSettingsMetadata);
const GetCurrentProviderConfigSafe = guardArity('SettingsHandler.GetCurrentProviderConfig', GetCurrentProviderConfig);
const GetInferenceBaseConfigSafe = guardArity('SettingsHandler.GetInferenceBaseConfig', GetInferenceBaseConfig);
const GetLanguageConfigSafe = guardArity('SettingsHandler.GetLanguageConfig', GetLanguageConfig);
const GetLoggingConfigSafe = guardArity('SettingsHandler.GetLoggingConfig', GetLoggingConfig);
const GetModelConfigSafe = guardArity('SettingsHandler.GetModelConfig', GetModelConfig);
const GetSettingsSafe = guardArity('SettingsHandler.GetSettings', GetSettings);
const GetUIPreferencesConfigSafe = guardArity('SettingsHandler.GetUIPreferencesConfig', GetUIPreferencesConfig);
const ProviderPresetsSafe = guardArity('SettingsHandler.ProviderPresets', ProviderPresets);
const RemoveLanguageSafe = guardArity('SettingsHandler.RemoveLanguage', RemoveLanguage);
const ResetSettingsToDefaultSafe = guardArity('SettingsHandler.ResetSettingsToDefault', ResetSettingsToDefault);
const SetAsCurrentProviderConfigSafe = guardArity('SettingsHandler.SetAsCurrentProviderConfig', SetAsCurrentProviderConfig);
const SetDefaultInputLanguageSafe = guardArity('SettingsHandler.SetDefaultInputLanguage', SetDefaultInputLanguage);
const SetDefaultOutputLanguageSafe = guardArity('SettingsHandler.SetDefaultOutputLanguage', SetDefaultOutputLanguage);
const UpdateAppBehaviorConfigSafe = guardArity('SettingsHandler.UpdateAppBehaviorConfig', UpdateAppBehaviorConfig);
const UpdateInferenceBaseConfigSafe = guardArity('SettingsHandler.UpdateInferenceBaseConfig', UpdateInferenceBaseConfig);
const UpdateLoggingConfigSafe = guardArity('SettingsHandler.UpdateLoggingConfig', UpdateLoggingConfig);
const UpdateModelConfigSafe = guardArity('SettingsHandler.UpdateModelConfig', UpdateModelConfig);
const UpdateProviderConfigSafe = guardArity('SettingsHandler.UpdateProviderConfig', UpdateProviderConfig);
const UpdateUIPreferencesConfigSafe = guardArity('SettingsHandler.UpdateUIPreferencesConfig', UpdateUIPreferencesConfig);

const CreateStackSafe = guardArity('StackHandler.CreateStack', CreateStack);
const DeleteStackSafe = guardArity('StackHandler.DeleteStack', DeleteStack);
const DuplicateStackSafe = guardArity('StackHandler.DuplicateStack', DuplicateStack);
const GetStackSafe = guardArity('StackHandler.GetStack', GetStack);
const ListStacksSafe = guardArity('StackHandler.ListStacks', ListStacks);
const SuggestedStacksSafe = guardArity('StackHandler.SuggestedStacks', SuggestedStacks);
const UpdateStackSafe = guardArity('StackHandler.UpdateStack', UpdateStack);

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
        return AppLogErrorSafe(message);
    }

    clipboardGetText(): Promise<apperr.StringResult> {
        return ClipboardGetTextSafe();
    }

    clipboardSetText(text: string): Promise<apperr.VoidResult> {
        return ClipboardSetTextSafe(text);
    }

    browserOpenURL(url: string): Promise<apperr.VoidResult> {
        this.logger.logDebug(`AppHandler.browserOpenURL: ${url}`);
        return BrowserOpenURLSafe(url);
    }

    openPath(path: string): Promise<apperr.VoidResult> {
        this.logger.logDebug(`AppHandler.openPath: ${path}`);
        return OpenPathSafe(path);
    }

    saveWindowSize(width: number, height: number): Promise<apperr.VoidResult> {
        return SaveWindowSizeSafe(width, height);
    }
}

export class ActionHandler implements IActionHandler {
    constructor(private readonly logger: ILoggerService) {}

    async getActionCatalog(): Promise<apperr.CatalogResult> {
        this.logger.logInfo('getActionCatalog');
        return GetActionCatalogSafe();
    }

    async getModels(providerId: string): Promise<apperr.ModelsResult> {
        this.logger.logInfo(`getModels: ${providerId}`);
        return GetModelsSafe(providerId);
    }

    async previewPrompt(req: apperr.PromptPreviewRequest): Promise<apperr.PromptPreviewResult> {
        this.logger.logInfo('previewPrompt');
        return PreviewPromptSafe(req);
    }

    async processPromptChain(req: apperr.ChainRequest): Promise<apperr.ChainResultEnv> {
        this.logger.logInfo('processPromptChain');
        return ProcessPromptChainSafe(req);
    }

    async cancelChain(runId: string): Promise<apperr.VoidResult> {
        this.logger.logInfo(`cancelChain: ${runId}`);
        return CancelChainSafe(runId);
    }

    async cancelAllRuns(): Promise<void> {
        this.logger.logInfo('cancelAllRuns');
        return CancelAllRunsSafe();
    }

    async testConnection(providerConfig: ProviderConfig): Promise<apperr.VerifyResult> {
        this.logger.logInfo(`testConnection: ${providerConfig.providerName}`);
        return TestConnectionSafe(toWireProvider(providerConfig));
    }

    async testInference(providerConfig: ProviderConfig): Promise<apperr.VerifyResult> {
        this.logger.logInfo(`testInference: ${providerConfig.providerName}`);
        return TestInferenceSafe(toWireProvider(providerConfig));
    }

    async testModels(providerConfig: ProviderConfig): Promise<apperr.VerifyResult> {
        this.logger.logInfo(`testModels: ${providerConfig.providerName}`);
        return TestModelsSafe(toWireProvider(providerConfig));
    }
}

export class SettingsHandler implements ISettingsHandler {
    constructor(private readonly logger: ILoggerService) {}

    async addLanguage(language: string): Promise<apperr.LanguagesResult> {
        this.logger.logInfo(`addLanguage: ${language}`);
        return AddLanguageSafe(language);
    }

    async createProviderConfig(providerConfig: ProviderConfig): Promise<apperr.ProviderResult> {
        this.logger.logInfo(`createProviderConfig: ${providerConfig.providerName}`);
        return CreateProviderConfigSafe(toWireProvider(providerConfig));
    }

    async deleteProviderConfig(providerId: string): Promise<apperr.VoidResult> {
        this.logger.logInfo(`deleteProviderConfig: ${providerId}`);
        return DeleteProviderConfigSafe(providerId);
    }

    async getAllProviderConfigs(): Promise<apperr.ProvidersResult> {
        this.logger.logInfo('getAllProviderConfigs');
        return GetAllProviderConfigsSafe();
    }

    async getAppSettingsMetadata(): Promise<apperr.MetadataResult> {
        this.logger.logInfo('getAppSettingsMetadata');
        return GetAppSettingsMetadataSafe();
    }

    async getCurrentProviderConfig(): Promise<apperr.ProviderResult> {
        this.logger.logInfo('getCurrentProviderConfig');
        return GetCurrentProviderConfigSafe();
    }

    async getInferenceBaseConfig(): Promise<apperr.InferenceResult> {
        this.logger.logInfo('getInferenceBaseConfig');
        return GetInferenceBaseConfigSafe();
    }

    async getLanguageConfig(): Promise<apperr.LanguageResult> {
        this.logger.logInfo('getLanguageConfig');
        return GetLanguageConfigSafe();
    }

    async providerPresets(): Promise<apperr.ProviderPresetsResult> {
        this.logger.logInfo('providerPresets');
        return ProviderPresetsSafe();
    }

    async getModelConfig(): Promise<apperr.ModelConfigResult> {
        this.logger.logInfo('getModelConfig');
        return GetModelConfigSafe();
    }

    async getSettings(): Promise<apperr.SettingsResult> {
        this.logger.logInfo('getSettings');
        return GetSettingsSafe();
    }

    async removeLanguage(language: string): Promise<apperr.LanguagesResult> {
        this.logger.logInfo(`removeLanguage: ${language}`);
        return RemoveLanguageSafe(language);
    }

    async resetSettingsToDefault(): Promise<apperr.SettingsResult> {
        this.logger.logInfo('resetSettingsToDefault');
        return ResetSettingsToDefaultSafe();
    }

    async setAsCurrentProviderConfig(providerId: string): Promise<apperr.ProviderResult> {
        this.logger.logInfo(`setAsCurrentProviderConfig: ${providerId}`);
        return SetAsCurrentProviderConfigSafe(providerId);
    }

    async setDefaultInputLanguage(language: string): Promise<apperr.VoidResult> {
        this.logger.logInfo(`setDefaultInputLanguage: ${language}`);
        return SetDefaultInputLanguageSafe(language);
    }

    async setDefaultOutputLanguage(language: string): Promise<apperr.VoidResult> {
        this.logger.logInfo(`setDefaultOutputLanguage: ${language}`);
        return SetDefaultOutputLanguageSafe(language);
    }

    async updateInferenceBaseConfig(config: InferenceBaseConfig): Promise<apperr.InferenceResult> {
        this.logger.logInfo('updateInferenceBaseConfig');
        return UpdateInferenceBaseConfigSafe(config);
    }

    async updateModelConfig(config: ModelConfig): Promise<apperr.ModelConfigResult> {
        this.logger.logInfo(`updateModelConfig: ${config.name}`);
        return UpdateModelConfigSafe(config);
    }

    async updateProviderConfig(providerConfig: ProviderConfig): Promise<apperr.ProviderResult> {
        this.logger.logInfo(`updateProviderConfig: ${providerConfig.providerName}`);
        return UpdateProviderConfigSafe(toWireProvider(providerConfig));
    }

    async getAppBehaviorConfig(): Promise<apperr.AppBehaviorResult> {
        this.logger.logInfo('getAppBehaviorConfig');
        return GetAppBehaviorConfigSafe();
    }

    async updateAppBehaviorConfig(config: AppBehaviorConfig): Promise<apperr.AppBehaviorResult> {
        this.logger.logInfo('updateAppBehaviorConfig');
        return UpdateAppBehaviorConfigSafe(toWireBehavior(config));
    }

    async getUIPreferencesConfig(): Promise<apperr.UIPreferencesResult> {
        this.logger.logInfo('getUIPreferencesConfig');
        return GetUIPreferencesConfigSafe();
    }

    async updateUIPreferencesConfig(config: UIPreferencesConfig): Promise<apperr.UIPreferencesResult> {
        this.logger.logInfo('updateUIPreferencesConfig');
        return UpdateUIPreferencesConfigSafe(toWireUIPreferences(config));
    }

    async getLoggingConfig(): Promise<apperr.LoggingResult> {
        this.logger.logInfo('getLoggingConfig');
        return GetLoggingConfigSafe();
    }

    async updateLoggingConfig(config: LoggingConfig): Promise<apperr.LoggingResult> {
        this.logger.logInfo('updateLoggingConfig');
        return UpdateLoggingConfigSafe(toWireLogging(config));
    }
}

export class HistoryHandler implements IHistoryHandler {
    constructor(private readonly logger: ILoggerService) {}

    async clearHistory(): Promise<apperr.VoidResult> {
        this.logger.logInfo('clearHistory');
        return ClearHistorySafe();
    }

    async deleteHistoryEntry(id: string): Promise<apperr.VoidResult> {
        this.logger.logInfo(`deleteHistoryEntry: ${id}`);
        return DeleteHistoryEntrySafe(id);
    }

    async getHistoryEntry(id: string): Promise<apperr.HistoryEntryResult> {
        this.logger.logInfo(`getHistoryEntry: ${id}`);
        return GetHistoryEntrySafe(id);
    }

    async listHistory(limit: number, offset: number): Promise<apperr.HistoryListResult> {
        this.logger.logInfo(`listHistory: limit=${limit} offset=${offset}`);
        return ListHistorySafe(limit, offset);
    }
}

export class StackHandler implements IStackHandler {
    constructor(private readonly logger: ILoggerService) {}

    async createStack(stack: apperr.SavedStack): Promise<apperr.StackResult> {
        this.logger.logInfo(`createStack: ${stack.name}`);
        return CreateStackSafe(stack);
    }

    async deleteStack(id: string): Promise<apperr.VoidResult> {
        this.logger.logInfo(`deleteStack: ${id}`);
        return DeleteStackSafe(id);
    }

    async duplicateStack(id: string, newName: string): Promise<apperr.StackResult> {
        this.logger.logInfo(`duplicateStack: ${id} -> ${newName}`);
        return DuplicateStackSafe(id, newName);
    }

    async getStack(id: string): Promise<apperr.StackResult> {
        this.logger.logInfo(`getStack: ${id}`);
        return GetStackSafe(id);
    }

    async listStacks(): Promise<apperr.StacksResult> {
        this.logger.logInfo('listStacks');
        return ListStacksSafe();
    }

    async suggestedStacks(): Promise<apperr.SuggestedStacksResult> {
        this.logger.logInfo('suggestedStacks');
        return SuggestedStacksSafe();
    }

    async updateStack(stack: apperr.SavedStack): Promise<apperr.StackResult> {
        this.logger.logInfo(`updateStack: ${stack.name}`);
        return UpdateStackSafe(stack);
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
