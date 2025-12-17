import React from 'react';
import { AppSettings } from '../../../common/types';
import { setShowSettingsView } from '../../../store/app/AppStateReducer';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { appSettingsGetListOfModels, appSettingsResetToDefaultSettings, appSettingsSaveSettings } from '../../../store/settings/settings_thunks';
import Button from '../../base/Button';
import LoadingOverlay from '../../base/LoadingOverlay';
import LanguageConfiguration from './subview/LanguageConfiguration';
import ModelConfiguration from './subview/ModelConfiguration';
import OutputConfiguration from './subview/OutputConfiguration';
import ProvidersConfiguration from './subview/ProvidersConfiguration';

type SettingsWidgetProps = { onClose: () => void };
const SettingsWidget: React.FC<SettingsWidgetProps> = ({ onClose }) => {
    const dispatch = useAppDispatch();

    // Configs
    const availableProviderConfigs = useAppSelector((state) => state.settingsState.availableProviderConfigs);
    const currentProviderConfig = useAppSelector((state) => state.settingsState.currentProviderConfig);
    const modelConfig = useAppSelector((state) => state.settingsState.modelConfig);
    const languageConfig = useAppSelector((state) => state.settingsState.languageConfig);
    const useMarkdownForOutput = useAppSelector((state) => state.settingsState.useMarkdownForOutput);

    // Validation & Status
    // We can block global save if the CURRENT edited provider is invalid, or just loose allow save.
    // Usually "Save and Close" implies saving the valid state.
    // If the provider being edited is half-baked, maybe we just save what's in `availableProviderConfigs`?
    // But `settingsToSave` constructs the object from current state.
    // The requirement says: "If user clicked ... existing one - changes are reset... Save Provider button... it means provider finalized".
    // So `availableProviderConfigs` contains the finalized providers.
    // `currentProviderConfig` is just a draft.
    // However, the backend likely expects `currentProviderConfig` to be the *selected* one to use?
    // Actually, `currentProviderConfig` in the `AppSettings` object usually represents the ACTIVE configuration for the app to use.
    // So we should save `currentProviderConfig` as the one currently in the form (if it's valid and saved to the list? or just the current values?).
    // If we treat `currentProviderConfig` as a "draft", we might want to make sure it's also inside `availableProviderConfigs` if it's meant to be saved?
    // Or does `currentProviderConfig` just hold the active settings?
    // Let's assume `currentProviderConfig` is what the app USES efficiently.
    // AND `availableProviderConfigs` is the library of stored configs.

    // Logic: The user "selects" a provider to load it.
    // If they modify it, it's modified in `currentProviderConfig`.
    // If they click "Save Provider", it updates `availableProviderConfigs`.
    // When they click "Save and Close", we save everything.

    const isLoadingSettings = useAppSelector((state) => state.settingsState.isLoadingSettings);
    const errorMsg = useAppSelector((state) => state.settingsState.errorMsg);

    const handleSave = async () => {
        try {
            const settingsToSave: AppSettings = {
                availableProviderConfigs,
                currentProviderConfig,
                modelConfig,
                languageConfig,
                useMarkdownForOutput,
            };
            await dispatch(appSettingsSaveSettings(settingsToSave)).unwrap();
            await dispatch(appSettingsGetListOfModels()).unwrap();
            onClose();
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (error) {
            // Error is handled by the thunk
        }
    };

    const handleClose = async () => {
        dispatch(setShowSettingsView(false));
    };

    const handleReset = async () => {
        try {
            await dispatch(appSettingsResetToDefaultSettings()).unwrap();
            await dispatch(appSettingsGetListOfModels()).unwrap();
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (error) {
            // Error is handled by the thunk
        }
    };

    return (
        <div className="settings-widget-container">
            <div className="settings-widget-form-container">
                {errorMsg && <div className="settings-error">{errorMsg}</div>}

                <ProvidersConfiguration />

                <ModelConfiguration />

                <LanguageConfiguration />

                <OutputConfiguration />
            </div>

            <div className="settings-widget-confirmation-buttons-container">
                <Button
                    text="Close Settings"
                    variant="outlined"
                    colorStyle="secondary-color"
                    size="small"
                    onClick={handleClose}
                    disabled={isLoadingSettings}
                />
                <Button
                    text="Reset to Default"
                    variant="solid"
                    colorStyle="error-color"
                    size="small"
                    onClick={handleReset}
                    disabled={isLoadingSettings}
                />
                <Button
                    text="Save and Close"
                    variant="solid"
                    colorStyle="success-color"
                    size="small"
                    onClick={handleSave}
                    disabled={isLoadingSettings}
                />
            </div>

            <LoadingOverlay isLoading={isLoadingSettings} />
        </div>
    );
};

SettingsWidget.displayName = 'SettingsWidget';
export default SettingsWidget;
