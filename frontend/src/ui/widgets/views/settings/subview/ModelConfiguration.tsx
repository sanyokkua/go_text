import React from 'react';
import { settingsGetModelsList } from '../../../../../logic/store/cfg/settings_thunks';
import {
    defaultProviderConfig,
    setEditableModelName,
    setEditableTemperature,
    setEditableTemperatureEnabled,
    setLlmModelSelected,
} from '../../../../../logic/store/cfg/SettingsStateReducer';
import { useAppDispatch, useAppSelector } from '../../../../../logic/store/hooks';
import Button from '../../../base/Button';
import Select, { SelectItem } from '../../../base/Select';
import SettingsGroup from '../helpers/SettingsGroup';

type ModelConfigurationProps = { text?: string };

const ModelConfiguration: React.FC<ModelConfigurationProps> = () => {
    const dispatch = useAppDispatch();

    // Selectors from the new state
    const loadedSettingsEditable = useAppSelector((state) => state.settingsState.loadedSettingsEditable);
    const llmModelList = useAppSelector((state) => state.settingsState.llmModelList);
    const llmModelSelected = useAppSelector((state) => state.settingsState.llmModelSelected);
    const isLoadingSettings = useAppSelector((state) => state.settingsState.isLoadingSettings);
    const currentProviderConfig = loadedSettingsEditable.currentProviderConfig || defaultProviderConfig;

    // Model config from editable settings (with null checks)
    const isTemperatureEnabled = loadedSettingsEditable.modelConfig?.isTemperatureEnabled;
    const temperature = loadedSettingsEditable.modelConfig?.temperature || 0.5;

    // Handlers
    const handleModelSelect = (item: SelectItem) => {
        dispatch(setEditableModelName(item.itemId));
        dispatch(setLlmModelSelected(item));
    };

    const refreshModelsList = async () => {
        try {
            await dispatch(settingsGetModelsList(currentProviderConfig)).unwrap();
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (_error) {
            // Error handled by thunk
        }
    };

    const handleTemperatureEnabledChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        dispatch(setEditableTemperatureEnabled(e.currentTarget.checked));
    };

    const handleTemperatureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseInt(e.target.value);
        dispatch(setEditableTemperature(value / 100));
    };

    return (
        <SettingsGroup top={true} headerText="LLM Model Configuration">
            <SettingsGroup>
                <label htmlFor="modelSelect">Model:</label>
                <Select
                    id="modelSelect"
                    useFilter={true}
                    items={llmModelList}
                    selectedItem={llmModelSelected}
                    onSelect={handleModelSelect}
                    disabled={isLoadingSettings}
                />
                <Button
                    text="Refresh Models"
                    variant="outlined"
                    colorStyle="secondary-color"
                    size="tiny"
                    onClick={refreshModelsList}
                    disabled={isLoadingSettings}
                />
            </SettingsGroup>

            <SettingsGroup>
                <div className="settings-form-grid">
                    <label htmlFor="temperatureEnabled">Temperature Control:</label>
                    <input
                        type="checkbox"
                        id="temperatureEnabled"
                        checked={isTemperatureEnabled}
                        onChange={handleTemperatureEnabledChange}
                        disabled={isLoadingSettings}
                    />
                </div>
            </SettingsGroup>
            <SettingsGroup>
                <div className="settings-form-grid">
                    <label htmlFor="temperatureSlider">Enable Temperature</label>
                    <input
                        id="temperatureSlider"
                        type="range"
                        min="0"
                        max="100"
                        value={temperature * 100}
                        onChange={handleTemperatureChange}
                        disabled={isLoadingSettings || !isTemperatureEnabled}
                    />
                </div>
                <div className="settings-form-grid">
                    <label htmlFor="temperatureValue">Temperature:</label>
                    <span id="temperatureValue">{temperature.toFixed(2)}</span>
                </div>
            </SettingsGroup>
        </SettingsGroup>
    );
};

ModelConfiguration.displayName = 'ModelConfiguration';
export default ModelConfiguration;
