import { createSlice } from '@reduxjs/toolkit';
import { getLogger } from '../../adapter';
import {
    addLanguage,
    createProviderConfig,
    deleteProviderConfig,
    getAppSettingsMetadata,
    getSettings,
    initializeSettingsState,
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
const initialState: SettingsState = { allSettings: null, metadata: null, loading: false, saving: false, error: null };

const settingsSlice = createSlice({
    name: 'settings',
    initialState,
    reducers: {
        // Synchronous reducers can be added here if needed
        clearError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            // Initialization
            .addCase(initializeSettingsState.pending, (state) => {
                logger.logInfo('Initializing settings state...');
                state.loading = true;
                state.error = null;
            })
            .addCase(initializeSettingsState.fulfilled, (state) => {
                logger.logInfo('Settings state initialized successfully');
                state.loading = false;
            })
            .addCase(initializeSettingsState.rejected, (state, action) => {
                logger.logError(`Failed to initialize settings: ${action.payload || 'Unknown error'}`);
                state.loading = false;
                state.error = action.payload || 'Failed to initialize settings';
            })

            // Full State Replacement (Used for Init, Reset, Create)
            .addCase(getSettings.fulfilled, (state, action) => {
                logger.logInfo('Settings loaded successfully');
                state.allSettings = action.payload;
                state.loading = false;
                state.error = null;
            })
            .addCase(resetSettingsToDefault.fulfilled, (state, action) => {
                state.allSettings = action.payload;
                state.loading = false;
                state.error = null;
            })
            .addCase(createProviderConfig.fulfilled, (state, action) => {
                // Assuming backend returns full settings
                state.allSettings = action.payload;
                state.saving = false;
                state.error = null;
            })

            // Patch Updates (Efficient Partial Updates)
            .addCase(updateModelConfig.fulfilled, (state, action) => {
                if (state.allSettings) {
                    state.allSettings.modelConfig = action.payload;
                }
                state.saving = false;
                state.error = null;
            })
            .addCase(updateInferenceBaseConfig.fulfilled, (state, action) => {
                if (state.allSettings) {
                    state.allSettings.inferenceBaseConfig = action.payload;
                }
                state.saving = false;
                state.error = null;
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
                state.saving = false;
                state.error = null;
            })
            .addCase(setAsCurrentProviderConfig.fulfilled, (state, action) => {
                if (state.allSettings) {
                    state.allSettings.currentProviderConfig = action.payload;
                }
                state.saving = false;
                state.error = null;
            })
            .addCase(deleteProviderConfig.fulfilled, (state, action) => {
                const providerId = action.meta.arg;
                if (state.allSettings) {
                    state.allSettings.availableProviderConfigs = state.allSettings.availableProviderConfigs.filter(
                        (provider) => provider.providerId !== providerId,
                    );
                }
                state.saving = false;
                state.error = null;
            })
            .addCase(addLanguage.fulfilled, (state, action) => {
                if (state.allSettings) {
                    state.allSettings.languageConfig.languages = action.payload;
                }
                state.saving = false;
                state.error = null;
            })
            .addCase(removeLanguage.fulfilled, (state, action) => {
                if (state.allSettings) {
                    state.allSettings.languageConfig.languages = action.payload;
                }
                state.saving = false;
                state.error = null;
            })

            // Language Defaults
            .addCase(setDefaultInputLanguage.fulfilled, (state, action) => {
                const language = action.meta.arg;
                if (state.allSettings) {
                    state.allSettings.languageConfig.defaultInputLanguage = language;
                }
                state.saving = false;
                state.error = null;
            })
            .addCase(setDefaultOutputLanguage.fulfilled, (state, action) => {
                const language = action.meta.arg;
                if (state.allSettings) {
                    state.allSettings.languageConfig.defaultOutputLanguage = language;
                }
                state.saving = false;
                state.error = null;
            })

            // Metadata
            .addCase(getAppSettingsMetadata.fulfilled, (state, action) => {
                state.metadata = action.payload;
                state.loading = false;
                state.error = null;
            })

            // Handle pending states for update operations
            .addCase(createProviderConfig.pending, (state) => {
                state.saving = true;
                state.error = null;
            })
            .addCase(updateModelConfig.pending, (state) => {
                state.saving = true;
                state.error = null;
            })
            .addCase(updateInferenceBaseConfig.pending, (state) => {
                state.saving = true;
                state.error = null;
            })
            .addCase(updateProviderConfig.pending, (state) => {
                state.saving = true;
                state.error = null;
            })
            .addCase(setAsCurrentProviderConfig.pending, (state) => {
                state.saving = true;
                state.error = null;
            })
            .addCase(deleteProviderConfig.pending, (state) => {
                state.saving = true;
                state.error = null;
            })
            .addCase(addLanguage.pending, (state) => {
                state.saving = true;
                state.error = null;
            })
            .addCase(removeLanguage.pending, (state) => {
                state.saving = true;
                state.error = null;
            })
            .addCase(setDefaultInputLanguage.pending, (state) => {
                state.saving = true;
                state.error = null;
            })
            .addCase(setDefaultOutputLanguage.pending, (state) => {
                state.saving = true;
                state.error = null;
            })
            // Error handling for all thunks - add individual rejected cases
            .addCase(getSettings.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload || 'Failed to get settings';
            })
            .addCase(resetSettingsToDefault.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload || 'Failed to reset settings';
            })
            .addCase(createProviderConfig.rejected, (state, action) => {
                state.saving = false;
                state.error = action.payload || 'Failed to create provider config';
            })
            .addCase(updateModelConfig.rejected, (state, action) => {
                state.saving = false;
                state.error = action.payload || 'Failed to update model config';
            })
            .addCase(updateInferenceBaseConfig.rejected, (state, action) => {
                state.saving = false;
                state.error = action.payload || 'Failed to update inference base config';
            })
            .addCase(updateProviderConfig.rejected, (state, action) => {
                state.saving = false;
                state.error = action.payload || 'Failed to update provider config';
            })
            .addCase(setAsCurrentProviderConfig.rejected, (state, action) => {
                state.saving = false;
                state.error = action.payload || 'Failed to set current provider config';
            })
            .addCase(deleteProviderConfig.rejected, (state, action) => {
                state.saving = false;
                state.error = action.payload || 'Failed to delete provider config';
            })
            .addCase(addLanguage.rejected, (state, action) => {
                state.saving = false;
                state.error = action.payload || 'Failed to add language';
            })
            .addCase(removeLanguage.rejected, (state, action) => {
                state.saving = false;
                state.error = action.payload || 'Failed to remove language';
            })
            .addCase(setDefaultInputLanguage.rejected, (state, action) => {
                state.saving = false;
                state.error = action.payload || 'Failed to set default input language';
            })
            .addCase(setDefaultOutputLanguage.rejected, (state, action) => {
                state.saving = false;
                state.error = action.payload || 'Failed to set default output language';
            })
            .addCase(getAppSettingsMetadata.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload || 'Failed to get app settings metadata';
            });
    },
});

export const { clearError } = settingsSlice.actions;
export default settingsSlice.reducer;
