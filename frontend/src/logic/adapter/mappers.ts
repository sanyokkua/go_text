import { apperr } from '../../../wailsjs/go/models';
import { AppBehaviorConfig, AppSettingsMetadata, LoggingConfig, ProviderConfig, Settings, UIPreferencesConfig } from './models';

export function fromWireProvider(v: apperr.ProviderConfig): ProviderConfig {
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
        envVarTokenName: v.apiKeyEnvVar ?? '',
        apiVersion: v.apiVersion ?? '',
        selectedModel: v.selectedModel ?? '',
        useCustomHeaders: Object.keys(v.headers ?? {}).length > 0,
        headers: v.headers ?? {},
        useCustomModels: v.useCustomModels,
        customModels: v.customModels ?? [],
    };
}

export function toWireProvider(v: ProviderConfig): apperr.ProviderConfig {
    return apperr.ProviderConfig.createFrom({
        id: v.providerId,
        name: v.providerName,
        kind: v.providerType,
        baseUrl: v.baseUrl,
        authScheme: v.authType,
        apiKeyEnvVar: v.envVarTokenName,
        apiVersion: v.apiVersion,
        selectedModel: v.selectedModel,
        completionPath: v.completionEndpoint,
        modelsPath: v.modelsEndpoint,
        useCustomModels: v.useCustomModels,
        headers: v.headers,
        customModels: v.customModels,
    });
}

export function fromWireSettings(v: apperr.Settings): Settings {
    return {
        availableProviderConfigs: (v.availableProviderConfigs ?? []).map(fromWireProvider),
        currentProviderConfig: fromWireProvider(v.currentProviderConfig),
        inferenceBaseConfig: v.inferenceBaseConfig,
        modelConfig: v.modelConfig,
        languageConfig: v.languageConfig,
        appBehaviorConfig: fromWireBehavior(v.appBehaviorConfig),
    };
}

export function fromWireMetadata(v: apperr.AppSettingsMetadata): AppSettingsMetadata {
    return {
        authTypes: v.authSchemes,
        providerTypes: v.providerKinds,
        settingsFolder: v.settingsFolder,
        settingsFile: v.databaseFile,
        logsFolder: v.logsFolder,
        appVersion: v.appVersion ?? '',
    };
}

export function fromWireBehavior(v: apperr.AppBehaviorConfig): AppBehaviorConfig {
    return { enableTaskLogging: v.enableTaskLogging, logDirectory: '', historyEnabled: v.historyEnabled, historyMaxEntries: v.historyMaxEntries };
}

export function toWireBehavior(v: AppBehaviorConfig): apperr.AppBehaviorConfig {
    return apperr.AppBehaviorConfig.createFrom({
        enableTaskLogging: v.enableTaskLogging,
        historyEnabled: v.historyEnabled ?? false,
        historyMaxEntries: v.historyMaxEntries ?? 0,
    });
}

export function fromWireUIPreferences(v: apperr.UIPreferencesConfig): UIPreferencesConfig {
    const theme = v.theme === 'light' || v.theme === 'dark' ? v.theme : 'auto';
    const layout = v.layout === 'stacked' ? 'stacked' : 'side';
    const viewMode = v.viewMode === 'source' || v.viewMode === 'diff' ? v.viewMode : 'preview';
    return {
        theme,
        layout,
        sidebarCollapsed: Boolean(v.sidebarCollapsed),
        historyOpen: Boolean(v.historyOpen),
        viewMode,
    };
}

export function toWireUIPreferences(v: UIPreferencesConfig): apperr.UIPreferencesConfig {
    return apperr.UIPreferencesConfig.createFrom({
        theme: v.theme,
        layout: v.layout,
        sidebarCollapsed: v.sidebarCollapsed,
        historyOpen: v.historyOpen,
        viewMode: v.viewMode,
    });
}

export function fromWireLogging(v: apperr.LoggingConfig): LoggingConfig {
    return {
        logFileEnabled: v.logFileEnabled,
        logLevel: v.logLevel,
        logDirectory: v.logDirectory,
        logMaxSizeMB: v.logMaxSizeMB,
        logMaxBackups: v.logMaxBackups,
        logMaxAgeDays: v.logMaxAgeDays,
        logCompress: v.logCompress,
    };
}

export function toWireLogging(v: LoggingConfig): apperr.LoggingConfig {
    return apperr.LoggingConfig.createFrom({
        logFileEnabled: v.logFileEnabled,
        logLevel: v.logLevel,
        logDirectory: v.logDirectory,
        logMaxSizeMB: v.logMaxSizeMB,
        logMaxBackups: v.logMaxBackups,
        logMaxAgeDays: v.logMaxAgeDays,
        logCompress: v.logCompress,
    });
}
