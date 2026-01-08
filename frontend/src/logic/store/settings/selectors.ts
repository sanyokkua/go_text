import { Settings } from '../../adapter';
import { RootState } from '../index';

// Basic selectors
export const selectAllSettings = (state: RootState): Settings | null => state.settings.allSettings;

export const selectSettingsMetadata = (state: RootState) => state.settings.metadata;

export const selectSettingsLoading = (state: RootState): boolean => state.settings.loading;

export const selectSettingsSaving = (state: RootState): boolean => state.settings.saving;

export const selectSettingsError = (state: RootState): string | null => state.settings.error;

// Derived selectors for specific settings parts
export const selectCurrentProvider = (state: RootState) => state.settings.allSettings?.currentProviderConfig || null;

export const selectAvailableProviders = (state: RootState) => state.settings.allSettings?.availableProviderConfigs || [];

export const selectModelConfig = (state: RootState) => state.settings.allSettings?.modelConfig || null;

export const selectInferenceBaseConfig = (state: RootState) => state.settings.allSettings?.inferenceBaseConfig || null;

export const selectLanguageConfig = (state: RootState) => state.settings.allSettings?.languageConfig || null;

export const selectInputLanguage = (state: RootState): string => state.settings.allSettings?.languageConfig?.defaultInputLanguage || 'en';

export const selectOutputLanguage = (state: RootState): string => state.settings.allSettings?.languageConfig?.defaultOutputLanguage || 'en';

export const selectAvailableLanguages = (state: RootState): string[] => state.settings.allSettings?.languageConfig?.languages || [];

// Selector to check if a specific provider is the current one
export const selectIsCurrentProvider =
    (providerId: string) =>
    (state: RootState): boolean => {
        return state.settings.allSettings?.currentProviderConfig.providerId === providerId;
    };
