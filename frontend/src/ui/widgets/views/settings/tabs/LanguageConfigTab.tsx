import React, { useState } from 'react';

import { Settings } from '../../../../../logic/adapter/models';
import { useAppDispatch } from '../../../../../logic/store';
import { addLanguage, removeLanguage, setDefaultInputLanguage, setDefaultOutputLanguage } from '../../../../../logic/store/settings/thunks';
import { Button } from '../../../../components/Button';
import { DropdownMenu } from '../../../../primitives/DropdownMenu';

const inputBadge: React.CSSProperties = {
    background: 'color-mix(in srgb, var(--teal) 15%, transparent)',
    border: '1px solid var(--teal)',
    color: 'var(--teal)',
    fontSize: '0.7rem',
    padding: '1px 5px',
    borderRadius: 999,
    whiteSpace: 'nowrap',
};

const outputBadge: React.CSSProperties = {
    background: 'color-mix(in srgb, var(--purple, #9c27b0) 15%, transparent)',
    border: '1px solid var(--purple, #9c27b0)',
    color: 'var(--purple, #9c27b0)',
    fontSize: '0.7rem',
    padding: '1px 5px',
    borderRadius: 999,
    whiteSpace: 'nowrap',
};

const langRow: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    padding: 'var(--space-2) var(--space-3)',
    borderBottom: '1px solid var(--line)',
};

const langName: React.CSSProperties = { flex: 1, fontSize: '0.875rem', color: 'var(--ink-1)' };

const triggerButton: React.CSSProperties = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '2px 6px',
    borderRadius: 'var(--radius)',
    color: 'var(--ink-2)',
    fontSize: '1.1rem',
    lineHeight: 1,
};

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
        <section style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                <input
                    type="text"
                    value={newLanguage}
                    onChange={(e) => setNewLanguage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Add language…"
                    aria-label="New language"
                    style={{
                        flex: 1,
                        padding: '6px 10px',
                        border: '1px solid var(--line)',
                        borderRadius: 'var(--radius)',
                        background: 'var(--surface)',
                        color: 'var(--ink-1)',
                        fontSize: '0.875rem',
                    }}
                />
                <Button variant="primary" size="sm" onClick={handleAdd} disabled={!newLanguage.trim()}>
                    Add
                </Button>
            </div>

            <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
                {languages.length === 0 && (
                    <p style={{ padding: 'var(--space-4)', color: 'var(--ink-3)', fontSize: '0.875rem', margin: 0 }}>No languages configured.</p>
                )}
                {languages.map((lang) => (
                    <div key={lang} style={langRow}>
                        <span style={langName}>{lang}</span>
                        {lang === defaultInputLanguage && <span style={inputBadge}>default input</span>}
                        {lang === defaultOutputLanguage && <span style={outputBadge}>default output</span>}
                        <DropdownMenu
                            trigger={
                                <button type="button" style={triggerButton} aria-label={`Options for ${lang}`}>
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
        </section>
    );
};

LanguageConfigTab.displayName = 'LanguageConfigTab';

export default LanguageConfigTab;
