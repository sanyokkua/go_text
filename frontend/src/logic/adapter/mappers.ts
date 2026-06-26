import { apperr } from '../../../wailsjs/go/models';
import { AppBehaviorConfig, AppSettingsMetadata, ProviderConfig, Settings } from './models';

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
    };
}

export function fromWireBehavior(v: apperr.AppBehaviorConfig): AppBehaviorConfig {
    return {
        enableTaskLogging: v.enableTaskLogging,
        logDirectory: '',
        historyEnabled: v.historyEnabled,
        historyMaxEntries: v.historyMaxEntries,
    };
}

export function toWireBehavior(v: AppBehaviorConfig): apperr.AppBehaviorConfig {
    return apperr.AppBehaviorConfig.createFrom({
        enableTaskLogging: v.enableTaskLogging,
        historyEnabled: v.historyEnabled ?? false,
        historyMaxEntries: v.historyMaxEntries ?? 0,
    });
}
