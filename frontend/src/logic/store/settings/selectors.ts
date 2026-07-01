import { createSelector } from '@reduxjs/toolkit';

import { apperr } from '../../../../wailsjs/go/models';
import { SelectItem } from '../../../ui/primitives/Select';
import { ProviderConfig, Settings } from '../../adapter';
import { RootState } from '../index';

// Shared empty-array reference reused by the nullish-fallback selectors below so
// repeated calls return the same object when the underlying field is absent —
// `?? []` would otherwise allocate a new array every call, defeating reselect's
// reference-equality memoization for any derived selector built on top of them.
const EMPTY_ARRAY: readonly never[] = [];
function emptyArray<T>(): T[] {
    return EMPTY_ARRAY as unknown as T[];
}

// Basic selectors
export const selectAllSettings = (state: RootState): Settings | null => state.settings.allSettings;
export const selectSettingsMetadata = (state: RootState) => state.settings.metadata;

// Derived selectors for specific settings parts
export const selectCurrentProvider = (state: RootState) => state.settings.allSettings?.currentProviderConfig || null;
export const selectModelConfig = (state: RootState) => state.settings.allSettings?.modelConfig || null;
export const selectAppBehaviorConfig = (state: RootState) => state.settings.allSettings?.appBehaviorConfig ?? null;
export const selectLoggingConfig = (state: RootState) => state.settings.allSettings?.loggingConfig ?? null;
export const selectInferenceBaseConfig = (state: RootState) => state.settings.allSettings?.inferenceBaseConfig ?? null;
export const selectLanguageConfig = (state: RootState) => state.settings.allSettings?.languageConfig ?? null;
export const selectAvailableProviders = (state: RootState): ProviderConfig[] =>
    state.settings.allSettings?.availableProviderConfigs ?? emptyArray<ProviderConfig>();
export const selectDiscoveredModels = (state: RootState): apperr.ModelInfo[] => state.settings.discoveredModels ?? emptyArray<apperr.ModelInfo>();
export const selectProviderPresets = (state: RootState): apperr.ProviderPreset[] =>
    state.settings.providerPresets ?? emptyArray<apperr.ProviderPreset>();

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

        // Build label-by-id so a discovered model keeps its human label while the
        // current model (which may not be among discovered) still gets an entry.
        const labelById = new Map(discovered.map((m) => [m.id, m.label]));
        const ids = [...new Set([...discovered.map((m) => m.id), currentModel].filter(Boolean))];
        return ids.map((id) => ({ value: id, label: labelById.get(id) ?? id }));
    },
);

/**
 * Returns the capability flags for the currently-selected model, or null when it
 * has not been discovered yet. Drives feature gating in the Settings Model tab
 * (e.g. hiding the temperature control for models that reject it).
 */
export const selectCurrentModelCaps = createSelector([selectModelConfig, selectDiscoveredModels], (modelCfg, discovered): apperr.ModelCaps | null => {
    if (!modelCfg) return null;
    return discovered.find((m) => m.id === modelCfg.name)?.caps ?? null;
});
