import React from 'react';
import { KeyValuePair } from '../../../../common/types';
import Button from '../../../base/Button';
import Select, { SelectItem } from '../../../base/Select';
import HeaderKeyValue from '../HeaderKeyValue';
import SettingsGroup from '../helpers/SettingsGroup';
import ValidationMessages from '../helpers/ValidationMessages';

type ProvidersConfigurationProps = { text?: string };

const ProvidersConfiguration: React.FC<ProvidersConfigurationProps> = () => {
    const providers: SelectItem[] = [
        { itemId: 'provider1', displayText: 'Provider 1' },
        { itemId: 'provider2', displayText: 'Provider 2' },
    ];
    const headers: KeyValuePair[] = [
        { id: 'apiKey', key: 'Api-Key', value: 'fewfwef34' },
        { id: 'secret', key: 'Secret', value: 'someSecret' },
    ];
    return (
        <SettingsGroup top={true} headerText="LLM Provider Configuration">
            <SettingsGroup>
                <label htmlFor="providerType">Select Provider:</label>
                <Select id="providerType" items={providers} selectedItem={providers[0]} onSelect={() => {}} disabled={false} />
            </SettingsGroup>

            <Button text="Create Provider" variant="outlined" colorStyle="success-color" size="tiny" onClick={() => {}} disabled={false} />

            <SettingsGroup headerText="Configure OpenAI API Compatible provider">
                <div className="settings-form-grid">
                    <label htmlFor="providerName">Provider Name:</label>
                    <input type="text" id="providerName" value={'Hello'} onChange={() => {}} placeholder="My Custom Provider" disabled={false} />

                    <label htmlFor="baseUrl">BaseUrl:</label>
                    <input
                        type="text"
                        id="baseUrl"
                        value={'localhost:11434'}
                        onChange={() => {}}
                        placeholder="http://localhost:11434"
                        disabled={false}
                    />

                    <label htmlFor="modelsEndpoint">Models List endpoint:</label>
                    <input type="text" id="modelsEndpoint" value={'/v1/models'} onChange={() => {}} placeholder="/v1/models" disabled={false} />

                    <label htmlFor="modelsEndpoint">Chat completion endpoint:</label>
                    <input
                        type="text"
                        id="completionEndpoint"
                        value={'/v1/chat/completions'}
                        onChange={() => {}}
                        placeholder="/v1/chat/completions"
                        disabled={false}
                    />
                </div>

                <SettingsGroup headerText="Request Headers">
                    {headers.map((item) => (
                        <HeaderKeyValue key={`header-${item.id}`} value={item} onChange={() => {}} onDelete={() => {}} isDisabled={false} />
                    ))}

                    <Button text="Add additional value" variant="dashed" colorStyle="primary-color" size="tiny" onClick={() => {}} disabled={false} />
                </SettingsGroup>

                <SettingsGroup headerText="Verify Configuration of Provider">
                    <div className="settings-form-grid">
                        <label htmlFor="completionEndpointModel">Provide Model ID for verification (Optional):</label>
                        <input
                            type="text"
                            id="completionEndpointModel"
                            value={''}
                            onChange={() => {}}
                            placeholder="ChatGpt-5-mini"
                            disabled={false}
                        />
                    </div>
                    <Button text="Verify Config" variant="outlined" colorStyle="success-color" size="tiny" disabled={false} onClick={() => {}} />
                    <ValidationMessages success={'Success'} error={''} />
                </SettingsGroup>

                <div className="settings-widget-confirmation-buttons-container">
                    <Button text="Delete Provider" variant="outlined" colorStyle="error-color" size="tiny" onClick={() => {}} disabled={false} />
                    <Button text="Save Provider" variant="solid" colorStyle="success-color" size="tiny" onClick={() => {}} disabled={false} />
                </div>
            </SettingsGroup>
        </SettingsGroup>
    );
};

ProvidersConfiguration.displayName = 'ProvidersConfiguration';
export default ProvidersConfiguration;
