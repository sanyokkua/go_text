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
export const selectDiscoveredModels = (state: RootState): string[] => state.settings.discoveredModels ?? [];

// Derived SelectItem lists for compact pickers in AppBar
export const selectProviderItems = createSelector([selectAvailableProviders], (providers): SelectItem[] =>
    providers.map((p) => ({ value: p.providerId, label: p.providerName })),
);

export const selectLanguageItems = createSelector([selectLanguageConfig], (cfg): SelectItem[] => {
    if (!cfg) return [];
    return cfg.languages.map((lang) => ({ value: lang, label: lang }));
});

/**
 * Returns the model names selectable for the current provider in the AppBar picker.
 *
 * When useCustomModels is enabled the provider ships its own list. Otherwise the
 * list is the live-discovered models unioned with the currently selected model
 * (deduped). The current model is always present so the Select value stays valid
 * even before discovery has run, and the list is never empty.
 */
export const selectCurrentProviderModelItems = createSelector(
    [selectCurrentProvider, selectModelConfig, selectDiscoveredModels],
    (provider, modelCfg, discovered): SelectItem[] => {
        if (!provider) return [];

        const currentModel = modelCfg?.name ?? provider.selectedModel;

        if (provider.useCustomModels && provider.customModels.length > 0) {
            return provider.customModels.filter(Boolean).map((m) => ({ value: m, label: m }));
        }

        // Discovered models ∪ current model, current always included so the
        // Select has a valid option for its bound value.
        const deduped = [...new Set([...discovered, currentModel].filter(Boolean))];
        return deduped.map((m) => ({ value: m, label: m }));
    },
);
