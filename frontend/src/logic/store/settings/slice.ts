/**
 * Settings Redux Slice
 *
 * Manages the settings state and defines reducers for handling settings-related actions.
 * Implements a comprehensive state management pattern with:
 * - Initial state definition
 * - Synchronous reducers (clearError)
 * - Asynchronous thunk handling via extraReducers
 * - Optimized state updates (full replacements vs. patch updates)
 * - Comprehensive error handling
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

// Initial state
const initialState: SettingsState = { allSettings: null, metadata: null };

const settingsSlice = createSlice({
    name: 'settings',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder

            // Full State Replacement (Used for Init, Reset, Create)
            .addCase(getSettings.fulfilled, (state, action) => {
                logger.logInfo('Settings loaded successfully');
                state.allSettings = action.payload;
            })
            .addCase(resetSettingsToDefault.fulfilled, (state, action) => {
                state.allSettings = action.payload;
            })
            .addCase(createProviderConfig.fulfilled, (state, action) => {
                // Assuming backend returns full settings
                state.allSettings = action.payload;
            })

            // Patch Updates (Efficient Partial Updates)
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

                // Step A: Update provider in availableProviderConfigs array
                if (state.allSettings) {
                    state.allSettings.availableProviderConfigs = state.allSettings.availableProviderConfigs.map((provider) =>
                        provider.providerId === updatedProvider.providerId ? updatedProvider : provider,
                    );

                    // Step B: Check if updated provider is the current one
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

            // Language Defaults
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

            // Metadata
            .addCase(getAppSettingsMetadata.fulfilled, (state, action) => {
                state.metadata = action.payload;
            });
    },
});

export default settingsSlice.reducer;
