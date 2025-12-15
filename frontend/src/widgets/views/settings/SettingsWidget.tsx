import React, { ReactNode } from 'react';
import { AppSettings, KeyValuePair } from '../../../common/types';
import { setShowSettingsView } from '../../../store/app/AppStateReducer';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import {
    addDisplayHeader,
    removeDisplayHeader,
    setBaseUrl,
    setCompletionEndpoint,
    setCompletionEndpointModel,
    setDisplaySelectedInputLanguage,
    setDisplaySelectedModel,
    setDisplaySelectedOutputLanguage,
    setModelsEndpoint,
    setTemperature,
    setIsTemperatureEnabled,
    setUseMarkdownForOutput,
    updateHeader,
} from '../../../store/settings/AppSettingsReducer';
import {
    appSettingsGetListOfModels,
    appSettingsResetToDefaultSettings,
    appSettingsSaveSettings,
    appSettingsValidateCompletionRequest,
    appSettingsValidateModelsRequest,
} from '../../../store/settings/settings_thunks';
import Button from '../../base/Button';
import LoadingOverlay from '../../base/LoadingOverlay';
import Select, { SelectItem } from '../../base/Select';
import HeaderKeyValue from './HeaderKeyValue';

const ValidationMessages: React.FC<{ success: string; error: string }> = ({ success, error }) => {
    return (
        <>
            {success && <span className="validation-success">{success}</span>}
            {error && <span className="validation-error">{error}</span>}
        </>
    );
};
const SettingsGroup: React.FC<{ children: ReactNode; top?: boolean }> = ({ children, top = false }) => {
    if (top) {
        return <div className="form-group-top">{children}</div>;
    }
    return <div className="form-group">{children}</div>;
};

type SettingsWidgetProps = { onClose: () => void };
const SettingsWidget: React.FC<SettingsWidgetProps> = ({ onClose }) => {
    const dispatch = useAppDispatch();
    const displayListOfLanguages = useAppSelector((state) => state.settingsState.displayListOfLanguages);
    const displaySelectedInputLanguage = useAppSelector((state) => state.settingsState.displaySelectedInputLanguage);
    const displaySelectedOutputLanguage = useAppSelector((state) => state.settingsState.displaySelectedOutputLanguage);
    const displayListOfModels = useAppSelector((state) => state.settingsState.displayListOfModels);
    const displaySelectedModel = useAppSelector((state) => state.settingsState.displaySelectedModel);
    const displayHeaders = useAppSelector((state) => state.settingsState.displayHeaders);
    const headers = useAppSelector((state) => state.settingsState.headers);
    const modelName = useAppSelector((state) => state.settingsState.modelName);
    const baseUrl = useAppSelector((state) => state.settingsState.baseUrl);
    const baseUrlSuccessMsg = useAppSelector((state) => state.settingsState.baseUrlSuccessMsg);
    const baseUrlValidationErr = useAppSelector((state) => state.settingsState.baseUrlValidationErr);
    const modelsEndpoint = useAppSelector((state) => state.settingsState.modelsEndpoint);
    const modelsEndpointSuccessMsg = useAppSelector((state) => state.settingsState.modelsEndpointSuccessMsg);
    const modelsEndpointValidationErr = useAppSelector((state) => state.settingsState.modelsEndpointValidationErr);
    const completionEndpoint = useAppSelector((state) => state.settingsState.completionEndpoint);
    const completionEndpointModel = useAppSelector((state) => state.settingsState.completionEndpointModel);
    const completionEndpointSuccessMsg = useAppSelector((state) => state.settingsState.completionEndpointSuccessMsg);
    const completionEndpointValidationErr = useAppSelector((state) => state.settingsState.completionEndpointValidationErr);
    const defaultInputLanguage = useAppSelector((state) => state.settingsState.defaultInputLanguage);
    const defaultOutputLanguage = useAppSelector((state) => state.settingsState.defaultOutputLanguage);
    const languages = useAppSelector((state) => state.settingsState.languages);
    const temperature = useAppSelector((state) => state.settingsState.temperature);
    const isTemperatureEnabled = useAppSelector((state) => state.settingsState.isTemperatureEnabled);
    const useMarkdownForOutput = useAppSelector((state) => state.settingsState.useMarkdownForOutput);
    const isLoadingSettings = useAppSelector((state) => state.settingsState.isLoadingSettings);
    const errorMsg = useAppSelector((state) => state.settingsState.errorMsg);

    const handleBaseUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        dispatch(setBaseUrl(e.target.value));
    };

    const handleHeaderChange = (obj: KeyValuePair) => {
        dispatch(updateHeader(obj));
    };
    const handleHeaderDelete = (obj: KeyValuePair) => {
        dispatch(removeDisplayHeader(obj.id));
    };
    const handleAddHeader = () => {
        dispatch(addDisplayHeader());
    };

    const handleModelsEndpointChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        dispatch(setModelsEndpoint(e.target.value));
    };
    const handleCompletionEndpointChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        dispatch(setCompletionEndpoint(e.target.value));
    };
    const handleCompletionEndpointModelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        dispatch(setCompletionEndpointModel(e.target.value));
    };

    const handleModelSelect = (item: SelectItem) => {
        dispatch(setDisplaySelectedModel(item));
    };
    const handleTemperatureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseInt(e.target.value);
        dispatch(setTemperature(value / 100));
    };
    const handleTemperatureEnabledChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        dispatch(setIsTemperatureEnabled(e.currentTarget.checked));
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

    const refreshModelsList = async () => {
        dispatch(appSettingsGetListOfModels());
    };

    const testModelsEndpointConnection = async () => {
        dispatch(appSettingsValidateModelsRequest({ baseUrl, endpoint: modelsEndpoint, headers }));
    };
    const testCompletionEndpointConnection = async () => {
        dispatch(appSettingsValidateCompletionRequest({ baseUrl, endpoint: completionEndpoint, headers, modelName: completionEndpointModel }));
    };

    const handleSave = async () => {
        try {
            const settingsToSave: AppSettings = {
                baseUrl,
                headers,
                modelsEndpoint,
                completionEndpoint,
                modelName,
                temperature,
                isTemperatureEnabled,
                defaultInputLanguage,
                defaultOutputLanguage,
                languages,
                useMarkdownForOutput,
            };
            await dispatch(appSettingsSaveSettings(settingsToSave)).unwrap();
            await dispatch(appSettingsGetListOfModels()).unwrap();
            onClose();
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
        } catch (error) {
            // Error is handled by the thunk
        }
    };

    return (
        <div className="settings-widget-container">
            <div className="settings-widget-form-container">
                {errorMsg && <div className="settings-error">{errorMsg}</div>}

                <SettingsGroup top={true}>
                    <h2>LLM Provider Configuration</h2>
                    <SettingsGroup>
                        <label htmlFor="baseUrl">LLM BaseUrl:</label>
                        <input
                            type="text"
                            id="baseUrl"
                            value={baseUrl}
                            onChange={handleBaseUrlChange}
                            placeholder="http://localhost:11434"
                            disabled={isLoadingSettings}
                        />
                        <ValidationMessages success={baseUrlSuccessMsg} error={baseUrlValidationErr} />
                    </SettingsGroup>
                    <SettingsGroup>
                        <h3 className="section-title">Request Headers</h3>
                        {displayHeaders.map((item) => (
                            <HeaderKeyValue
                                key={`header-${item.id}`}
                                value={item}
                                onChange={handleHeaderChange}
                                onDelete={handleHeaderDelete}
                                isDisabled={isLoadingSettings}
                            />
                        ))}
                        <Button
                            text="Add additional value"
                            variant="dashed"
                            colorStyle="primary-color"
                            size="tiny"
                            onClick={handleAddHeader}
                            disabled={isLoadingSettings}
                        />
                    </SettingsGroup>

                    <SettingsGroup>
                        <label htmlFor="modelsEndpoint">Get Models List endpoint (OpenAI Compatible):</label>
                        <input
                            type="text"
                            id="modelsEndpoint"
                            value={modelsEndpoint}
                            onChange={handleModelsEndpointChange}
                            placeholder="/v1/models"
                            disabled={isLoadingSettings}
                        />
                        <ValidationMessages success={modelsEndpointSuccessMsg} error={modelsEndpointValidationErr} />
                        <Button
                            text="Test Models Endpoint Request"
                            variant="outlined"
                            colorStyle="success-color"
                            size="tiny"
                            disabled={!modelsEndpoint || modelsEndpoint.trim() === '' || isLoadingSettings}
                            onClick={testModelsEndpointConnection}
                        />
                    </SettingsGroup>

                    <SettingsGroup>
                        <label htmlFor="completionEndpoint">Create chat completion endpoint (OpenAI Compatible):</label>
                        <input
                            type="text"
                            id="completionEndpoint"
                            value={completionEndpoint}
                            onChange={handleCompletionEndpointChange}
                            placeholder="/v1/chat/completions"
                            disabled={isLoadingSettings}
                        />
                        <label htmlFor="completionEndpointModel">Provide Model ID for completion test:</label>
                        <input
                            type="text"
                            id="completionEndpointModel"
                            value={completionEndpointModel}
                            onChange={handleCompletionEndpointModelChange}
                            placeholder="ChatGpt-5-mini"
                            disabled={isLoadingSettings}
                        />
                        <ValidationMessages success={completionEndpointSuccessMsg} error={completionEndpointValidationErr} />
                        <Button
                            text="Test Completion Endpoint Request"
                            variant="outlined"
                            colorStyle="success-color"
                            size="tiny"
                            disabled={
                                !completionEndpoint ||
                                completionEndpoint.trim() === '' ||
                                !completionEndpointModel ||
                                completionEndpointModel.trim() === '' ||
                                isLoadingSettings
                            }
                            onClick={testCompletionEndpointConnection}
                        />
                    </SettingsGroup>
                </SettingsGroup>

                <SettingsGroup top={true}>
                    <h2>LLM Model Configuration</h2>
                    <SettingsGroup>
                        <label htmlFor="modelSelect">Model:</label>
                        <Select
                            id="modelSelect"
                            items={displayListOfModels}
                            selectedItem={displaySelectedModel}
                            onSelect={handleModelSelect}
                            disabled={isLoadingSettings}
                        />
                        <Button
                            text="Refresh Models List"
                            variant="outlined"
                            colorStyle="success-color"
                            size="tiny"
                            disabled={!baseUrl || baseUrl.trim() === '' || !modelsEndpoint || modelsEndpoint.trim() === '' || isLoadingSettings}
                            onClick={refreshModelsList}
                        />
                    </SettingsGroup>
                    <SettingsGroup>
                        <div className="form-group checkbox-group" style={{ marginBottom: '10px' }}>
                            <input
                                type="checkbox"
                                id="enableTemperature"
                                checked={isTemperatureEnabled}
                                onChange={handleTemperatureEnabledChange}
                                disabled={isLoadingSettings}
                            />
                            <label htmlFor="enableTemperature">Enable Temperature</label>
                        </div>
                        <label htmlFor="temperature">Model Temperature:</label>
                        <input
                            type="range"
                            id="temperature"
                            min="0"
                            max="100"
                            value={temperature * 100}
                            onChange={handleTemperatureChange}
                            disabled={isLoadingSettings || !isTemperatureEnabled}
                        />
                        <div className="temperature-value">{temperature.toFixed(2)}</div>
                    </SettingsGroup>
                </SettingsGroup>

                <SettingsGroup top={true}>
                    <h2>Default Translation Languages</h2>
                    <SettingsGroup>
                        <label htmlFor="defaultInputLang">Default Input Language:</label>
                        <Select
                            id="defaultInputLang"
                            items={displayListOfLanguages}
                            selectedItem={displaySelectedInputLanguage}
                            onSelect={(item) => handleLanguageSelect('input', item)}
                            disabled={isLoadingSettings}
                        />
                    </SettingsGroup>
                    <SettingsGroup>
                        <label htmlFor="defaultOutputLang">Default Output Language:</label>
                        <Select
                            id="defaultOutputLang"
                            items={displayListOfLanguages}
                            selectedItem={displaySelectedOutputLanguage}
                            onSelect={(item) => handleLanguageSelect('output', item)}
                            disabled={isLoadingSettings}
                        />
                    </SettingsGroup>
                </SettingsGroup>

                <SettingsGroup top={true}>
                    <h2>Output Defaults</h2>
                    <div className="form-group checkbox-group">
                        <input
                            type="checkbox"
                            id="useMarkdown"
                            checked={useMarkdownForOutput}
                            onChange={handleMarkdownToggle}
                            disabled={isLoadingSettings}
                        />
                        <label htmlFor="useMarkdown">Use Markdown for plaintext Output</label>
                    </div>
                </SettingsGroup>
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
