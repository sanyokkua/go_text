/**
 * Settings State Management
 *
 * Handles application settings state with optimized update strategies:
 * - Full state replacement for initialization and major changes
 * - Partial updates for specific configuration changes
 * - Comprehensive handling of provider configurations, language settings, and metadata
 *
 * Key Features:
 * - Maintains null safety for optional settings data
 * - Handles complex provider configuration updates with array filtering
 * - Manages relationships between current and available provider configs
 */
import { createSlice } from '@reduxjs/toolkit';
import { getLogger } from '../../adapter';
import {
    addLanguage,
    createProviderConfig,
    deleteProviderConfig,
    discoverCurrentProviderModels,
    fetchProviderPresets,
    getAppBehaviorConfig,
    getAppSettingsMetadata,
    getCurrentProviderConfig,
    getLoggingConfig,
    getModelConfig,
    getSettings,
    removeLanguage,
    resetSettingsToDefault,
    setAsCurrentProviderConfig,
    setDefaultInputLanguage,
    setDefaultOutputLanguage,
    updateAppBehaviorConfig,
    updateInferenceBaseConfig,
    updateLoggingConfig,
    updateModelConfig,
    updateProviderConfig,
} from './thunks';
import { SettingsState } from './types';

const logger = getLogger('SettingsSlice');

const initialState: SettingsState = { allSettings: null, metadata: null, discoveredModels: [], providerPresets: [] };

const settingsSlice = createSlice({
    name: 'settings',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            // Full state replacement operations
            .addCase(getSettings.fulfilled, (state, action) => {
                logger.logInfo('Settings loaded successfully');
                // loggingConfig is loaded separately via GetLoggingConfig and is absent from
                // the GetSettings response. Preserve it so a parallel init load isn't wiped.
                const loggingConfig = state.allSettings?.loggingConfig;
                state.allSettings = action.payload;
                if (state.allSettings !== null && loggingConfig !== undefined) {
                    state.allSettings.loggingConfig = loggingConfig;
                }
            })
            .addCase(resetSettingsToDefault.fulfilled, (state, action) => {
                state.allSettings = action.payload;
            })
            .addCase(createProviderConfig.fulfilled, (state, action) => {
                // Full settings replacement after provider creation — preserve loggingConfig
                // for the same reason as getSettings.fulfilled above.
                const loggingConfig = state.allSettings?.loggingConfig;
                state.allSettings = action.payload;
                if (state.allSettings !== null && loggingConfig !== undefined) {
                    state.allSettings.loggingConfig = loggingConfig;
                }
            })

            // Partial updates for specific configurations
            .addCase(getModelConfig.fulfilled, (state, action) => {
                if (state.allSettings) {
                    state.allSettings.modelConfig = action.payload;
                }
            })
            .addCase(updateModelConfig.fulfilled, (state, action) => {
                if (state.allSettings) {
                    state.allSettings.modelConfig = action.payload;
                }
            })
            .addCase(updateInferenceBaseConfig.fulfilled, (state, action) => {
                if (state.allSettings) {
                    state.allSettings.inferenceBaseConfig = action.payload;
                }
            })
            .addCase(updateProviderConfig.fulfilled, (state, action) => {
                const updatedProvider = action.payload;

                // Update the provider in available configs and check if it's the current one
                if (state.allSettings) {
                    state.allSettings.availableProviderConfigs = state.allSettings.availableProviderConfigs.map((provider) =>
                        provider.providerId === updatedProvider.providerId ? updatedProvider : provider,
                    );

                    // Maintain consistency between available and current provider configs
                    if (updatedProvider.providerId === state.allSettings.currentProviderConfig.providerId) {
                        state.allSettings.currentProviderConfig = updatedProvider;
                    }
                }
            })
            .addCase(setAsCurrentProviderConfig.fulfilled, (state, action) => {
                if (state.allSettings) {
                    state.allSettings.currentProviderConfig = action.payload;
                    // Sync the active model to the newly-current provider's selected
                    // model so the editor never shows a stale model from the previous
                    // provider (which would make runs fail with a wrong/empty model).
                    state.allSettings.modelConfig.name = action.payload.selectedModel;
                }
                // Drop the previous provider's discovered models; the picker will
                // re-discover the new provider's list on its next refresh/mount.
                state.discoveredModels = [];
            })
            .addCase(getCurrentProviderConfig.fulfilled, (state, action) => {
                // Intentionally does NOT sync modelConfig.name here (unlike
                // setAsCurrentProviderConfig.fulfilled above). This action also fires
                // during app init, racing getSettings.fulfilled — modelConfig.name and
                // currentProviderConfig.selectedModel are independently-persisted
                // values that would be silently conflated by that sync (T87 plan).
                if (state.allSettings) {
                    state.allSettings.currentProviderConfig = action.payload;
                }
                state.discoveredModels = [];
            })
            .addCase(discoverCurrentProviderModels.fulfilled, (state, action) => {
                // Guard against a stale response landing after the user switched
                // providers mid-flight: only apply when the request still targets
                // the current provider.
                if (state.allSettings?.currentProviderConfig.providerId === action.meta.arg) {
                    state.discoveredModels = action.payload;
                }
            })
            .addCase(deleteProviderConfig.fulfilled, (state, action) => {
                const providerId = action.meta.arg;
                if (state.allSettings) {
                    state.allSettings.availableProviderConfigs = state.allSettings.availableProviderConfigs.filter(
                        (provider) => provider.providerId !== providerId,
                    );
                }
            })
            .addCase(addLanguage.fulfilled, (state, action) => {
                if (state.allSettings) {
                    state.allSettings.languageConfig.languages = action.payload;
                }
            })
            .addCase(removeLanguage.fulfilled, (state, action) => {
                if (state.allSettings) {
                    state.allSettings.languageConfig.languages = action.payload;
                }
            })

            // Language default updates
            .addCase(setDefaultInputLanguage.fulfilled, (state, action) => {
                const language = action.meta.arg;
                if (state.allSettings) {
                    state.allSettings.languageConfig.defaultInputLanguage = language;
                }
            })
            .addCase(setDefaultOutputLanguage.fulfilled, (state, action) => {
                const language = action.meta.arg;
                if (state.allSettings) {
                    state.allSettings.languageConfig.defaultOutputLanguage = language;
                }
            })

            // Metadata loading
            .addCase(getAppSettingsMetadata.fulfilled, (state, action) => {
                state.metadata = action.payload;
            })
            .addCase(fetchProviderPresets.fulfilled, (state, action) => {
                state.providerPresets = action.payload;
            })

            // App behavior config updates
            .addCase(getAppBehaviorConfig.fulfilled, (state, action) => {
                if (state.allSettings) {
                    state.allSettings.appBehaviorConfig = action.payload;
                }
            })
            .addCase(updateAppBehaviorConfig.fulfilled, (state, action) => {
                if (state.allSettings) {
                    state.allSettings.appBehaviorConfig = action.payload;
                }
            })

            // Logging config updates
            .addCase(getLoggingConfig.fulfilled, (state, action) => {
                if (state.allSettings) {
                    state.allSettings.loggingConfig = action.payload;
                }
            })
            .addCase(updateLoggingConfig.fulfilled, (state, action) => {
                if (state.allSettings) {
                    state.allSettings.loggingConfig = action.payload;
                }
            });
    },
});

export default settingsSlice.reducer;
