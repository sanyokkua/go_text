import React from 'react';

import { useAppDispatch, useAppSelector } from '../../../logic/store';
import { selectLanguageConfig, selectLanguageItems } from '../../../logic/store/settings/selectors';
import { setDefaultInputLanguage, setDefaultOutputLanguage } from '../../../logic/store/settings/thunks';
import { Popover } from '../../primitives/Popover';
import { Select } from '../../primitives/Select';
import styles from './LanguagePicker.module.css';

const LanguagePicker: React.FC = () => {
    const dispatch = useAppDispatch();
    const languageConfig = useAppSelector(selectLanguageConfig);
    const languageItems = useAppSelector(selectLanguageItems);

    if (!languageConfig || languageItems.length === 0) {
        return null;
    }

    const inputLang = languageConfig.defaultInputLanguage;
    const outputLang = languageConfig.defaultOutputLanguage;

    // One combined toolbar pill (mockup: `Lang EN → UK ▾`). It opens a popover that
    // hosts the two existing language selects; the Redux language state remains the
    // single source of truth — no duplicate state here.
    const trigger = (
        <button type="button" className={styles.pill} aria-label="Languages">
            <span className={styles.key}>Lang</span>
            <span className={styles.value}>{inputLang}</span>
            <span className={styles.arrow} aria-hidden="true">
                →
            </span>
            <span className={styles.value}>{outputLang}</span>
            <span className={styles.caret} aria-hidden="true">
                ▾
            </span>
        </button>
    );

    return (
        <Popover trigger={trigger}>
            <div className={styles.popover}>
                <label className={styles.field}>
                    <span className={styles.fieldLabel}>Input language</span>
                    <Select
                        value={inputLang}
                        onValueChange={(lang) => void dispatch(setDefaultInputLanguage(lang))}
                        items={languageItems}
                        keyLabel="In"
                    />
                </label>
                <label className={styles.field}>
                    <span className={styles.fieldLabel}>Output language</span>
                    <Select
                        value={outputLang}
                        onValueChange={(lang) => void dispatch(setDefaultOutputLanguage(lang))}
                        items={languageItems}
                        keyLabel="Out"
                    />
                </label>
            </div>
        </Popover>
    );
};

LanguagePicker.displayName = 'LanguagePicker';
export default LanguagePicker;
