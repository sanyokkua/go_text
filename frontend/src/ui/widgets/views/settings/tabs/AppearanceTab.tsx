import React from 'react';

import { useAppDispatch, useAppSelector } from '../../../../../logic/store';
import { selectThemeMode } from '../../../../../logic/store/ui/selectors';
import { setThemeEffective, setThemeMode } from '../../../../../logic/store/ui/slice';
import { ThemeMode } from '../../../../../logic/store/ui/types';
import { THEME_STORAGE_KEY, resolveEffectiveTheme } from '../../../../../logic/theme/init';
import { Segmented, SegmentedItem } from '../../../../primitives/Segmented';

const THEME_OPTIONS: SegmentedItem[] = [
    { 'value': 'auto', 'label': '🌓 Auto', 'aria-label': 'Follow OS setting' },
    { 'value': 'light', 'label': '☀ Light', 'aria-label': 'Light theme' },
    { 'value': 'dark', 'label': '🌙 Dark', 'aria-label': 'Dark theme' },
];

const previewCard: React.CSSProperties = {
    width: 120,
    height: 80,
    borderRadius: 'var(--radius-sm, 6px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.5rem',
    fontWeight: 700,
    userSelect: 'none',
};

const AppearanceTab: React.FC = () => {
    const dispatch = useAppDispatch();
    const themeMode = useAppSelector(selectThemeMode);

    const handleThemeChange = (value: string) => {
        const mode = value as ThemeMode;
        const effective = resolveEffectiveTheme(mode);
        dispatch(setThemeMode(mode));
        dispatch(setThemeEffective(effective));
        localStorage.setItem(THEME_STORAGE_KEY, mode);
    };

    return (
        <section style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--ink-1)' }}>Theme</span>
                <Segmented value={themeMode} onValueChange={handleThemeChange} items={THEME_OPTIONS} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--ink-1)' }}>Preview</span>
                <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
                    <div
                        style={{ ...previewCard, background: '#ffffff', color: '#1a1a1a', border: '1px solid #e2e8f0' }}
                        aria-label="Light theme preview"
                    >
                        Aa
                    </div>
                    <div
                        style={{ ...previewCard, background: '#1e1e1e', color: '#e2e8f0', border: '1px solid #3a3a3a' }}
                        aria-label="Dark theme preview"
                    >
                        Aa
                    </div>
                </div>
            </div>

            <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--ink-3)' }}>Theme changes apply instantly. Auto follows the OS setting.</p>
        </section>
    );
};

AppearanceTab.displayName = 'AppearanceTab';

export default AppearanceTab;
