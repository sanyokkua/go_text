import React from 'react';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import {
    setDisplaySelectedInputLanguage,
    setDisplaySelectedOutputLanguage
} from '../../../../store/settings/AppSettingsReducer';
import Select, { SelectItem } from '../../../base/Select';
import SettingsGroup from '../helpers/SettingsGroup';

const LanguageConfiguration: React.FC = () => {
    const dispatch = useAppDispatch();

    const displayListOfLanguages = useAppSelector((state) => state.settingsState.displayListOfLanguages);
    const displaySelectedInputLanguage = useAppSelector((state) => state.settingsState.displaySelectedInputLanguage);
    const displaySelectedOutputLanguage = useAppSelector((state) => state.settingsState.displaySelectedOutputLanguage);
    const isLoadingSettings = useAppSelector((state) => state.settingsState.isLoadingSettings);

    const handleLanguageSelect = (type: 'input' | 'output', item: SelectItem) => {
        if (type === 'input') {
            dispatch(setDisplaySelectedInputLanguage(item));
        } else {
            dispatch(setDisplaySelectedOutputLanguage(item));
        }
    };

    return (
        <SettingsGroup top={true} headerText="Default Translation Languages">
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
    );
};

LanguageConfiguration.displayName = 'LanguageConfiguration';
export default LanguageConfiguration;
