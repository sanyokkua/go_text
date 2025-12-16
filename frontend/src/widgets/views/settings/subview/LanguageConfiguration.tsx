import React from 'react';
import Select, { SelectItem } from '../../../base/Select';
import SettingsGroup from '../helpers/SettingsGroup';

type LanguageConfigurationProps = { text?: string };

const LanguageConfiguration: React.FC<LanguageConfigurationProps> = () => {
    const providers: SelectItem[] = [
        { itemId: 'provider1', displayText: 'Provider 1' },
        { itemId: 'provider2', displayText: 'Provider 2' },
    ];
    return (
        <SettingsGroup top={true} headerText="Default Translation Languages">
            <SettingsGroup>
                <label htmlFor="defaultInputLang">Default Input Language:</label>
                <Select id="defaultInputLang" items={providers} selectedItem={providers[0]} onSelect={() => {}} disabled={false} />
            </SettingsGroup>
            <SettingsGroup>
                <label htmlFor="defaultOutputLang">Default Output Language:</label>
                <Select id="defaultOutputLang" items={providers} selectedItem={providers[0]} onSelect={() => {}} disabled={false} />
            </SettingsGroup>
        </SettingsGroup>
    );
};

LanguageConfiguration.displayName = 'LanguageConfiguration';
export default LanguageConfiguration;
