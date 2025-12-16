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

    // Flattened values for convenience in UI logic
    const providerType = currentProviderConfig.providerType;

    // Validation & Status
    const baseUrlValidationErr = useAppSelector((state) => state.settingsState.baseUrlValidationErr);
    const isLoadingSettings = useAppSelector((state) => state.settingsState.isLoadingSettings);
    const errorMsg = useAppSelector((state) => state.settingsState.errorMsg);

    const handleSave = async () => {
        // Block saving if verification failed for predefined providers (if needed, currently loose)
        if (providerType !== 'custom' && baseUrlValidationErr) {
            return;
        }

        try {
            const settingsToSave: AppSettings = {
                availableProviderConfigs,
                currentProviderConfig, // Redux state has the latest edits
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
