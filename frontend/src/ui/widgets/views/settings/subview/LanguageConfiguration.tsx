import React from 'react';
import {
    emptySelectItem,
    setEditableInputLanguage,
    setEditableOutputLanguage,
    setLanguageInputSelected,
    setLanguageOutputSelected,
} from '../../../../../logic/store/cfg/SettingsStateReducer';
import { useAppDispatch, useAppSelector } from '../../../../../logic/store/hooks';
import Select, { SelectItem } from '../../../base/Select';
import SettingsGroup from '../helpers/SettingsGroup';

const LanguageConfiguration: React.FC = () => {
    const dispatch = useAppDispatch();

    // Selectors from new state
    const languageList = useAppSelector((state) => state.settingsState.languageList) || [];
    const languageInputSelected = useAppSelector((state) => state.settingsState.languageInputSelected) || emptySelectItem;
    const languageOutputSelected = useAppSelector((state) => state.settingsState.languageOutputSelected) || emptySelectItem;
    const isLoadingSettings = useAppSelector((state) => state.settingsState.isLoadingSettings);

    const handleLanguageSelect = (type: 'input' | 'output', item: SelectItem) => {
        if (type === 'input') {
            dispatch(setEditableInputLanguage(item.itemId));
            dispatch(setLanguageInputSelected(item));
        } else {
            dispatch(setEditableOutputLanguage(item.itemId));
            dispatch(setLanguageOutputSelected(item));
        }
    };

    return (
        <SettingsGroup top={true} headerText="Default Translation Languages">
            <SettingsGroup>
                <label htmlFor="defaultInputLang">Default Input Language:</label>
                <Select
                    id="defaultInputLang"
                    items={languageList}
                    selectedItem={languageInputSelected}
                    onSelect={(item) => handleLanguageSelect('input', item)}
                    disabled={isLoadingSettings}
                />
            </SettingsGroup>
            <SettingsGroup>
                <label htmlFor="defaultOutputLang">Default Output Language:</label>
                <Select
                    id="defaultOutputLang"
                    items={languageList}
                    selectedItem={languageOutputSelected}
                    onSelect={(item) => handleLanguageSelect('output', item)}
                    disabled={isLoadingSettings}
                />
            </SettingsGroup>
        </SettingsGroup>
    );
};

LanguageConfiguration.displayName = 'LanguageConfiguration';
export default LanguageConfiguration;
