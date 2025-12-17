import React from 'react';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import {
    appSettingsGetListOfModels,
} from '../../../../store/settings/settings_thunks';
import {
    setDisplaySelectedModel,
    setIsTemperatureEnabled,
    setTemperature
} from '../../../../store/settings/AppSettingsReducer';
import Button from '../../../base/Button';
import Select, { SelectItem } from '../../../base/Select';
import SettingsGroup from '../helpers/SettingsGroup';

type ModelConfigurationProps = { text?: string };

const ModelConfiguration: React.FC<ModelConfigurationProps> = () => {
    const dispatch = useAppDispatch();

    // Selectors
    const displayListOfModels = useAppSelector((state) => state.settingsState.displayListOfModels);
    const displaySelectedModel = useAppSelector((state) => state.settingsState.displaySelectedModel);
    const isLoadingSettings = useAppSelector((state) => state.settingsState.isLoadingSettings);
    const baseUrl = useAppSelector((state) => state.settingsState.currentProviderConfig.baseUrl);
    const modelsEndpoint = useAppSelector((state) => state.settingsState.currentProviderConfig.modelsEndpoint);

    const isTemperatureEnabled = useAppSelector((state) => state.settingsState.modelConfig.isTemperatureEnabled);
    const temperature = useAppSelector((state) => state.settingsState.modelConfig.temperature);

    // Handlers
    const handleModelSelect = (item: SelectItem) => {
        dispatch(setDisplaySelectedModel(item));
    };

    const refreshModelsList = () => {
        dispatch(appSettingsGetListOfModels());
    };

    const handleTemperatureEnabledChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        dispatch(setIsTemperatureEnabled(e.currentTarget.checked));
    };

    const handleTemperatureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseInt(e.target.value);
        dispatch(setTemperature(value / 100));
    };

    return (
        <SettingsGroup top={true} headerText="LLM Model Configuration">
            <SettingsGroup>
                <label htmlFor="modelSelect">Model:</label>
                <Select
                    id="modelSelect"
                    useFilter={true}
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
                <div className={`temperature-controls ${!isTemperatureEnabled ? 'disabled' : ''}`}>
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
                    <div className="temperature-value">{isTemperatureEnabled ? temperature.toFixed(2) : 'N/A'}</div>
                </div>
            </SettingsGroup>
        </SettingsGroup>
    );
};

ModelConfiguration.displayName = 'ModelConfiguration';
export default ModelConfiguration;
