import { createSelector } from '@reduxjs/toolkit';

import { SelectItem } from '../../../ui/primitives/Select';
import { Settings } from '../../adapter';
import { RootState } from '../index';

// Basic selectors
export const selectAllSettings = (state: RootState): Settings | null => state.settings.allSettings;
export const selectSettingsMetadata = (state: RootState) => state.settings.metadata;

// Derived selectors for specific settings parts
export const selectCurrentProvider = (state: RootState) => state.settings.allSettings?.currentProviderConfig || null;
export const selectModelConfig = (state: RootState) => state.settings.allSettings?.modelConfig || null;
export const selectAppBehaviorConfig = (state: RootState) => state.settings.allSettings?.appBehaviorConfig ?? null;
export const selectInferenceBaseConfig = (state: RootState) => state.settings.allSettings?.inferenceBaseConfig ?? null;
export const selectLanguageConfig = (state: RootState) => state.settings.allSettings?.languageConfig ?? null;
export const selectAvailableProviders = (state: RootState) => state.settings.allSettings?.availableProviderConfigs ?? [];

// Derived SelectItem lists for compact pickers in AppBar
export const selectProviderItems = createSelector([selectAvailableProviders], (providers): SelectItem[] =>
    providers.map((p) => ({ value: p.providerId, label: p.providerName })),
);

export const selectLanguageItems = createSelector([selectLanguageConfig], (cfg): SelectItem[] => {
    if (!cfg) return [];
    return cfg.languages.map((lang) => ({ value: lang, label: lang }));
});

/**
 * Returns the list of model names available for the current provider.
 * When useCustomModels is enabled the provider ships its own list; otherwise
 * the picker falls back to the currently selected model so it is never empty.
 */
export const selectCurrentProviderModelItems = createSelector([selectCurrentProvider, selectModelConfig], (provider, modelCfg): SelectItem[] => {
    if (!provider) return [];
    const models = provider.useCustomModels && provider.customModels.length > 0 ? provider.customModels : [modelCfg?.name ?? provider.selectedModel];
    return models.filter(Boolean).map((m) => ({ value: m, label: m }));
});
