import React, { useEffect } from 'react';
import { settingsGetDefaultSettings, settingsGetModelsList, settingsSaveSettings } from '../../../../logic/store/cfg/settings_thunks';
import { resetEditableSettingsFromReadonly } from '../../../../logic/store/cfg/SettingsStateReducer';
import { useAppDispatch, useAppSelector } from '../../../../logic/store/hooks';
import { setShowSettingsView } from '../../../../logic/store/state/StateReducer';
import Button from '../../base/Button';
import LoadingOverlay from '../../base/LoadingOverlay';
import SettingsGroup from './helpers/SettingsGroup';
import LanguageConfiguration from './subview/LanguageConfiguration';
import ModelConfiguration from './subview/ModelConfiguration';
import OutputConfiguration from './subview/OutputConfiguration';
import ProvidersConfiguration from './subview/ProvidersConfiguration';
import { copyToClipboard } from '../../../../logic/store/state/state_thunks';

type SettingsWidgetProps = { onClose: () => void };
const SettingsWidget: React.FC<SettingsWidgetProps> = ({ onClose }) => {
    const dispatch = useAppDispatch();

    // Configs from new settings state
    const loadedSettingsEditable = useAppSelector((state) => state.settingsState.loadedSettingsEditable);
    const isLoadingSettings = useAppSelector((state) => state.settingsState.isLoadingSettings);
    const settingsGlobalErrorMsg = useAppSelector((state) => state.settingsState.settingsGlobalErrorMsg);
    const settingsFilePath = useAppSelector((state) => state.settingsState.settingsFilePath);

    useEffect(() => {
        dispatch(settingsGetModelsList(loadedSettingsEditable.currentProviderConfig)).unwrap();
    }, [dispatch, loadedSettingsEditable.currentProviderConfig]);

    const handleSave = async () => {
        try {
            await dispatch(settingsSaveSettings(loadedSettingsEditable)).unwrap();
            onClose();
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (_error) {
            // The thunk handles error
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
            // The thunk handles error
        }
    };

    const handleCopyPath = async ()=> {
        try {
            await dispatch(copyToClipboard(settingsFilePath)).unwrap();
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (_error){
            // The thunk handles error
        }
    }

    return (
        <div className="settings-widget-container">
            <div className="settings-widget-form-container">
                {/* Display global error messages */}
                {settingsGlobalErrorMsg && <div className="settings-error">{settingsGlobalErrorMsg}</div>}

                <SettingsGroup top={true} headerText="Settings File Path">
                    <div className="settings-form-grid">
                        <strong>Settings File can be found by the following path:</strong>
                        <p>{settingsFilePath}</p>
                    </div>
                    <Button text={"Copy Path to the Settings"} disabled={isLoadingSettings} colorStyle="primary-color" variant="outlined" onClick={handleCopyPath}/>
                </SettingsGroup>

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
