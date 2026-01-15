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
    getAppSettingsMetadata,
    getSettings,
    removeLanguage,
    resetSettingsToDefault,
    setAsCurrentProviderConfig,
    setDefaultInputLanguage,
    setDefaultOutputLanguage,
    updateInferenceBaseConfig,
    updateModelConfig,
    updateProviderConfig,
} from './thunks';
import { SettingsState } from './types';

const logger = getLogger('SettingsSlice');

const initialState: SettingsState = { allSettings: null, metadata: null };

const settingsSlice = createSlice({
    name: 'settings',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            // Full state replacement operations
            .addCase(getSettings.fulfilled, (state, action) => {
                logger.logInfo('Settings loaded successfully');
                state.allSettings = action.payload;
            })
            .addCase(resetSettingsToDefault.fulfilled, (state, action) => {
                state.allSettings = action.payload;
            })
            .addCase(createProviderConfig.fulfilled, (state, action) => {
                // Full settings replacement after provider creation
                state.allSettings = action.payload;
            })

            // Partial updates for specific configurations
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
            });
    },
});

export default settingsSlice.reducer;
