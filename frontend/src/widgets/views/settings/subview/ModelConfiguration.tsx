import React from 'react';
import Button from '../../../base/Button';
import Select, { SelectItem } from '../../../base/Select';
import SettingsGroup from '../helpers/SettingsGroup';

type ModelConfigurationProps = { text?: string };

const ModelConfiguration: React.FC<ModelConfigurationProps> = () => {
    const providers: SelectItem[] = [
        { itemId: 'provider1', displayText: 'Provider 1' },
        { itemId: 'provider2', displayText: 'Provider 2' },
    ];
    return (
        <SettingsGroup top={true} headerText="LLM Model Configuration">
            <SettingsGroup>
                <label htmlFor="modelSelect">Model:</label>
                <Select id="modelSelect" useFilter={true} items={providers} selectedItem={providers[0]} onSelect={() => {}} disabled={false} />
                <Button text="Refresh Models List" variant="outlined" colorStyle="success-color" size="tiny" disabled={false} onClick={() => {}} />
            </SettingsGroup>
            <SettingsGroup>
                <div className="form-group checkbox-group" style={{ marginBottom: '10px' }}>
                    <input type="checkbox" id="enableTemperature" checked={true} onChange={() => {}} disabled={false} />
                    <label htmlFor="enableTemperature">Enable Temperature</label>
                </div>
                <div className={`temperature-controls ${'disabled'}`}>
                    <label htmlFor="temperature">Model Temperature:</label>
                    <input type="range" id="temperature" min="0" max="100" value={0 * 100} onChange={() => {}} disabled={false} />
                    <div className="temperature-value">{'N/A'}</div>
                </div>
            </SettingsGroup>
        </SettingsGroup>
    );
};

ModelConfiguration.displayName = 'ModelConfiguration';
export default ModelConfiguration;
