import React, { useState } from 'react';

import { Settings } from '../../../../../logic/adapter/models';
import { useSettingsToast } from '../../../../../logic/hooks/useSettingsToast';
import { useAppDispatch } from '../../../../../logic/store';
import { addLanguage, removeLanguage, setDefaultInputLanguage, setDefaultOutputLanguage } from '../../../../../logic/store/settings/thunks';
import { Button } from '../../../../components/Button';
import { DropdownMenu } from '../../../../primitives/DropdownMenu';
import styles from './LanguageConfigTab.module.css';

interface Props {
    settings: Settings;
}

const LanguageConfigTab: React.FC<Props> = ({ settings }) => {
    const dispatch = useAppDispatch();
    const runWithToast = useSettingsToast();
    const { languages, defaultInputLanguage, defaultOutputLanguage } = settings.languageConfig;

    const [newLanguage, setNewLanguage] = useState('');

    const handleAdd = () => {
        const trimmed = newLanguage.trim();
        if (!trimmed) return;
        void runWithToast(dispatch(addLanguage(trimmed)), { success: `Language "${trimmed}" added` });
        setNewLanguage('');
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') handleAdd();
    };

    return (
        <section className={styles.root}>
            <div className={styles.addRow}>
                <input
                    type="text"
                    value={newLanguage}
                    onChange={(e) => setNewLanguage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="add a language…"
                    aria-label="New language"
                    className={styles.addInput}
                />
                <Button variant="primary" size="sm" onClick={handleAdd} disabled={!newLanguage.trim()}>
                    + Add
                </Button>
            </div>

            <div className={styles.langList}>
                {languages.length === 0 && (
                    <p className={styles.emptyMsg}>No languages configured.</p>
                )}
                {languages.map((lang) => (
                    <div key={lang} className={styles.langRow}>
                        <span className={styles.langName}>{lang}</span>
                        {lang === defaultInputLanguage && <span className={styles.inputBadge}>default input</span>}
                        {lang === defaultOutputLanguage && <span className={styles.outputBadge}>default output</span>}
                        <DropdownMenu
                            trigger={
                                <button type="button" className={styles.triggerBtn} aria-label={`Options for ${lang}`}>
                                    ⋮
                                </button>
                            }
                            items={[
                                {
                                    label: 'Set as default input',
                                    onClick: () =>
                                        void runWithToast(dispatch(setDefaultInputLanguage(lang)), {
                                            success: `Default input language set to "${lang}"`,
                                        }),
                                    disabled: lang === defaultInputLanguage,
                                },
                                {
                                    label: 'Set as default output',
                                    onClick: () =>
                                        void runWithToast(dispatch(setDefaultOutputLanguage(lang)), {
                                            success: `Default output language set to "${lang}"`,
                                        }),
                                    disabled: lang === defaultOutputLanguage,
                                },
                                { type: 'separator' },
                                {
                                    label: 'Remove',
                                    variant: 'danger',
                                    onClick: () => void runWithToast(dispatch(removeLanguage(lang)), { success: `Language "${lang}" removed` }),
                                },
                            ]}
                        />
                    </div>
                ))}
            </div>

            <p className={styles.helper}>
                Row menu (⋮): set as default input · set as default output · remove. Defaults shown as badges.
            </p>
        </section>
    );
};

LanguageConfigTab.displayName = 'LanguageConfigTab';

export default LanguageConfigTab;
