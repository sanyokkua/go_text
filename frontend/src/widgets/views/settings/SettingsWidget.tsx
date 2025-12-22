import React, { useEffect } from 'react';
import { setShowSettingsView } from '../../../store/state/StateReducer';
import { settingsGetDefaultSettings, settingsGetModelsList, settingsSaveSettings } from '../../../store/cfg/settings_thunks';
import { resetEditableSettingsFromReadonly } from '../../../store/cfg/SettingsStateReducer';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import Button from '../../base/Button';
import LoadingOverlay from '../../base/LoadingOverlay';
import SettingsGroup from './helpers/SettingsGroup';
import LanguageConfiguration from './subview/LanguageConfiguration';
import ModelConfiguration from './subview/ModelConfiguration';
import OutputConfiguration from './subview/OutputConfiguration';
import ProvidersConfiguration from './subview/ProvidersConfiguration';

type SettingsWidgetProps = { onClose: () => void };
const SettingsWidget: React.FC<SettingsWidgetProps> = ({ onClose }) => {
    const dispatch = useAppDispatch();

    // Configs from new settings state
    const loadedSettingsEditable = useAppSelector((state) => state.settingsState.loadedSettingsEditable);
    const isLoadingSettings = useAppSelector((state) => state.settingsState.isLoadingSettings);
    const settingsGlobalErrorMsg = useAppSelector((state) => state.settingsState.settingsGlobalErrorMsg);
    const settingsFilePath = useAppSelector((state) => state.settingsState.settingsFilePath);
    const providerValidationSuccessMsg = useAppSelector((state) => state.settingsState.providerValidationSuccessMsg);
    const providerValidationErrorMsg = useAppSelector((state) => state.settingsState.providerValidationErrorMsg);

    useEffect(() => {
        dispatch(settingsGetModelsList(loadedSettingsEditable.currentProviderConfig)).unwrap();
    }, [loadedSettingsEditable.currentProviderConfig]);

    const handleSave = async () => {
        try {
            await dispatch(settingsSaveSettings(loadedSettingsEditable)).unwrap();
            onClose();
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (_error) {
            // Error is handled by the thunk
        }
    };

    const handleClose = async () => {
        dispatch(resetEditableSettingsFromReadonly());
        dispatch(setShowSettingsView(false));
    };

    const handleReset = async () => {
        try {
            await dispatch(settingsGetDefaultSettings()).unwrap();
            // Reload models for the default provider
            if (loadedSettingsEditable.currentProviderConfig) {
                await dispatch(settingsGetModelsList(loadedSettingsEditable.currentProviderConfig)).unwrap();
            }
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (_error) {
            // Error is handled by the thunk
        }
    };

    return (
        <div className="settings-widget-container">
            <div className="settings-widget-form-container">
                {/* Display global error messages */}
                {settingsGlobalErrorMsg && <div className="settings-error">{settingsGlobalErrorMsg}</div>}

                <SettingsGroup top={true} headerText="Settings File Path">
                    {settingsFilePath && (
                        <div>
                            <h3>{settingsFilePath}</h3>
                        </div>
                    )}
                </SettingsGroup>

                <ProvidersConfiguration />
                {/* Display provider validation messages */}
                {providerValidationSuccessMsg && <div className="settings-success">{providerValidationSuccessMsg}</div>}
                {providerValidationErrorMsg && <div className="settings-error">{providerValidationErrorMsg}</div>}

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
