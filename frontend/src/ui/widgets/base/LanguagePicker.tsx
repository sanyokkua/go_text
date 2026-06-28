import React from 'react';

import { useAppDispatch, useAppSelector } from '../../../logic/store';
import { selectLanguageConfig, selectLanguageItems } from '../../../logic/store/settings/selectors';
import { setDefaultInputLanguage, setDefaultOutputLanguage } from '../../../logic/store/settings/thunks';
import { Select } from '../../primitives/Select';
import styles from './LanguagePicker.module.css';

const LanguagePicker: React.FC = () => {
    const dispatch = useAppDispatch();
    const languageConfig = useAppSelector(selectLanguageConfig);
    const languageItems = useAppSelector(selectLanguageItems);

    if (!languageConfig || languageItems.length === 0) {
        return null;
    }

    return (
        <div className={styles.root}>
            <Select
                value={languageConfig.defaultInputLanguage}
                onValueChange={(lang) => void dispatch(setDefaultInputLanguage(lang))}
                items={languageItems}
                keyLabel="In"
                accent
            />
            <span className={styles.arrow} aria-hidden="true">
                →
            </span>
            <Select
                value={languageConfig.defaultOutputLanguage}
                onValueChange={(lang) => void dispatch(setDefaultOutputLanguage(lang))}
                items={languageItems}
                keyLabel="Out"
                accent
            />
        </div>
    );
};

LanguagePicker.displayName = 'LanguagePicker';
export default LanguagePicker;
