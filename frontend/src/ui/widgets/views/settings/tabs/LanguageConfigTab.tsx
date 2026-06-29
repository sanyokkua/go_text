import React, { useState } from 'react';

import { Settings } from '../../../../../logic/adapter/models';
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
    const { languages, defaultInputLanguage, defaultOutputLanguage } = settings.languageConfig;

    const [newLanguage, setNewLanguage] = useState('');

    const handleAdd = () => {
        const trimmed = newLanguage.trim();
        if (!trimmed) return;
        dispatch(addLanguage(trimmed));
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
                                    onClick: () => dispatch(setDefaultInputLanguage(lang)),
                                    disabled: lang === defaultInputLanguage,
                                },
                                {
                                    label: 'Set as default output',
                                    onClick: () => dispatch(setDefaultOutputLanguage(lang)),
                                    disabled: lang === defaultOutputLanguage,
                                },
                                { type: 'separator' },
                                { label: 'Remove', variant: 'danger', onClick: () => dispatch(removeLanguage(lang)) },
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
