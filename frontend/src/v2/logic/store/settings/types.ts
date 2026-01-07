import { AppSettingsMetadata, InferenceBaseConfig, LanguageConfig, ModelConfig, ProviderConfig, Settings } from '../../adapter/models';

export interface SettingsState {
    currentSettings: Settings | null;
    currentProvider: ProviderConfig | null;
    allProviders: ProviderConfig[];
    languageConfig: LanguageConfig | null;
    modelConfig: ModelConfig | null;
    inferenceBaseConfig: InferenceBaseConfig | null;
    appSettingsMetadata: AppSettingsMetadata | null;
    loading: boolean;
    error: string | null;
}
