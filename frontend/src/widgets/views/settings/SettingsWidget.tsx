import React, { ReactNode } from 'react';
import { AppSettings, KeyValuePair } from '../../../common/types';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import {
    addDisplayHeader,
    removeDisplayHeader,
    setBaseUrl,
    setDisplaySelectedInputLanguage,
    setDisplaySelectedModel,
    setDisplaySelectedOutputLanguage,
    setTemperature,
    setUseMarkdownForOutput,
    updateHeader,
} from '../../../store/settings/AppSettingsReducer';
import {
    appSettingsGetListOfModels,
    appSettingsResetToDefaultSettings,
    appSettingsSaveSettings,
    appSettingsValidateUrlAndHeaders,
} from '../../../store/settings/settings_thunks';
import Button from '../../base/Button';
import Select, { SelectItem } from '../../base/Select';
import HeaderKeyValue from './HeaderKeyValue';

const Divider: React.FC = () => {
    return (
        <div className="form-group">
            <hr className="tab-buttons-container-underline" />
        </div>
    );
};

const SettingsGroup: React.FC<{ children: ReactNode }> = ({ children }) => {
    return <div className="form-group">{children}</div>;
};

type SettingsWidgetProps = { onClose: () => void };
const SettingsWidget: React.FC<SettingsWidgetProps> = ({ onClose }) => {
    const dispatch = useAppDispatch();
    const {
        displayListOfLanguages,
        displaySelectedInputLanguage,
        displaySelectedOutputLanguage,
        displayListOfModels,
        displaySelectedModel,
        displayHeaders,
        headers,
        modelName,
        baseUrl,
        defaultInputLanguage,
        defaultOutputLanguage,
        languages,
        temperature,
        useMarkdownForOutput,
        isLoadingSettings,
        errorMsg,
        isSettingsValid,
    } = useAppSelector((state) => state.settingsState);

    const handleHeaderChange = (obj: KeyValuePair) => {
        dispatch(updateHeader(obj));
    };

    const handleHeaderDelete = (obj: KeyValuePair) => {
        dispatch(removeDisplayHeader(obj.id));
    };

    const handleAddHeader = () => {
        dispatch(addDisplayHeader());
    };

    const handleBaseUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        dispatch(setBaseUrl(e.target.value));
    };

    const handleTemperatureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseInt(e.target.value);
        dispatch(setTemperature(value / 100));
    };

    const handleModelSelect = (item: SelectItem) => {
        dispatch(setDisplaySelectedModel(item));
    };

    const handleLanguageSelect = (type: 'input' | 'output', item: SelectItem) => {
        if (type === 'input') {
            dispatch(setDisplaySelectedInputLanguage(item));
        } else {
            dispatch(setDisplaySelectedOutputLanguage(item));
        }
    };

    const handleMarkdownToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
        dispatch(setUseMarkdownForOutput(e.currentTarget.checked));
    };

    const testConnection = async () => {
        dispatch(appSettingsValidateUrlAndHeaders({ baseUrl, headers }));
    };

    const saveSettings = () => {
        const settingsToSave: AppSettings = {
            baseUrl,
            headers,
            modelName,
            temperature,
            defaultInputLanguage,
            defaultOutputLanguage,
            languages,
            useMarkdownForOutput,
        };
        return dispatch(appSettingsSaveSettings(settingsToSave));
    };

    const saveSettingsAndLoadModels = async () => {
        try {
            await saveSettings().unwrap();
            await dispatch(appSettingsGetListOfModels()).unwrap();
        } catch (error) {
            // Error is handled by the thunk
        }
    };

    const handleSave = async () => {
        try {
            await saveSettings().unwrap();
            await dispatch(appSettingsGetListOfModels()).unwrap();
            onClose();
        } catch (error) {
            // Error is handled by the thunk
        }
    };

    const handleReset = async () => {
        try {
            await dispatch(appSettingsResetToDefaultSettings()).unwrap();
        } catch (error) {
            // Error is handled by the thunk
        }
    };

    if (isLoadingSettings) {
        return <div className="settings-widget-loading">Loading settings...</div>;
    }

    return (
        <div className="settings-widget-container">
            <div className="settings-widget-form-container">
                {errorMsg && <div className="settings-error">{errorMsg}</div>}

                <SettingsGroup>
                    <h2>LLM Provider Configuration</h2>
                    <SettingsGroup>
                        <label htmlFor="baseUrl">LLM BaseUrl:</label>
                        <input
                            type="text"
                            id="baseUrl"
                            value={baseUrl}
                            onChange={handleBaseUrlChange}
                            placeholder="http://localhost:11434"
                        />
                    </SettingsGroup>
                    <SettingsGroup>
                        <h3 className="section-title">Request Headers</h3>
                        {displayHeaders.map((item) => (
                            <HeaderKeyValue
                                key={`header-${item.id}`}
                                value={item}
                                onChange={handleHeaderChange}
                                onDelete={handleHeaderDelete}
                            />
                        ))}
                        <Button
                            text="Add additional value"
                            variant="dashed"
                            colorStyle="primary-color"
                            size="tiny"
                            onClick={handleAddHeader}
                        />
                    </SettingsGroup>
                    <SettingsGroup>
                        <Button
                            text={isLoadingSettings ? 'Testing connection...' : 'Test Connection'}
                            variant="outlined"
                            colorStyle={'success-color'}
                            onClick={testConnection}
                            size="small"
                            disabled={isLoadingSettings || baseUrl.trim() === ''}
                        />
                        <Button
                            text={'Save Settings and Load Models'}
                            variant="solid"
                            colorStyle={'success-color'}
                            onClick={saveSettingsAndLoadModels}
                            size="small"
                            disabled={isLoadingSettings || baseUrl.trim() === '' || !isSettingsValid}
                        />
                        {isSettingsValid && <span className="validation-success">Connection successful!</span>}
                        {!isSettingsValid && errorMsg && <span className="validation-error">{errorMsg}</span>}
                    </SettingsGroup>
                </SettingsGroup>

                <Divider />

                <SettingsGroup>
                    <h2>LLM Model Configuration</h2>
                    <SettingsGroup>
                        <label htmlFor="modelSelect">Model:</label>
                        <Select
                            id="modelSelect"
                            items={displayListOfModels}
                            selectedItem={displaySelectedModel}
                            onSelect={handleModelSelect}
                        />
                    </SettingsGroup>
                    <SettingsGroup>
                        <label htmlFor="temperature">Model Temperature:</label>
                        <input
                            type="range"
                            id="temperature"
                            min="0"
                            max="100"
                            value={temperature * 100}
                            onChange={handleTemperatureChange}
                        />
                        <div className="temperature-value">{temperature.toFixed(2)}</div>
                    </SettingsGroup>
                </SettingsGroup>

                <Divider />

                <SettingsGroup>
                    <h2>Default Translation Languages</h2>
                    <SettingsGroup>
                        <label htmlFor="defaultInputLang">Default Input Language:</label>
                        <Select
                            id="defaultInputLang"
                            items={displayListOfLanguages}
                            selectedItem={displaySelectedInputLanguage}
                            onSelect={(item) => handleLanguageSelect('input', item)}
                        />
                    </SettingsGroup>
                    <SettingsGroup>
                        <label htmlFor="defaultOutputLang">Default Output Language:</label>
                        <Select
                            id="defaultOutputLang"
                            items={displayListOfLanguages}
                            selectedItem={displaySelectedOutputLanguage}
                            onSelect={(item) => handleLanguageSelect('output', item)}
                        />
                    </SettingsGroup>
                </SettingsGroup>

                <Divider />

                <SettingsGroup>
                    <h2>Output Defaults</h2>
                    <div className="form-group checkbox-group">
                        <input
                            type="checkbox"
                            id="useMarkdown"
                            checked={useMarkdownForOutput}
                            onChange={handleMarkdownToggle}
                        />
                        <label htmlFor="useMarkdown">Use Markdown for plaintext Output</label>
                    </div>
                </SettingsGroup>
            </div>

            <div className="settings-widget-confirmation-buttons-container">
                <Button
                    text="Reset to Default"
                    variant="outlined"
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
        </div>
    );
};

SettingsWidget.displayName = 'SettingsWidget';
export default SettingsWidget;
