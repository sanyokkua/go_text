import React from 'react';

import { AppBarVisibilityConfig } from '../../../../../logic/adapter/models';
import { useAppDispatch, useAppSelector } from '../../../../../logic/store';
import { persistAppBarVisibility, persistUIPreferences } from '../../../../../logic/store/settings/thunks';
import { selectAppBarVisibility, selectThemeMode } from '../../../../../logic/store/ui/selectors';
import { setThemeEffective, setThemeMode, toggleAppBarElement } from '../../../../../logic/store/ui/slice';
import { ThemeMode } from '../../../../../logic/store/ui/types';
import { resolveEffectiveTheme } from '../../../../../logic/theme/init';
import { Segmented, SegmentedItem } from '../../../../primitives/Segmented';
import { Switch } from '../../../../primitives/Switch';
import styles from './AppearanceTab.module.css';

const THEME_OPTIONS: SegmentedItem[] = [
    { 'value': 'auto', 'label': '🌓 Auto', 'aria-label': 'Follow OS setting' },
    { 'value': 'light', 'label': '☀ Light', 'aria-label': 'Light theme' },
    { 'value': 'dark', 'label': '🌙 Dark', 'aria-label': 'Dark theme' },
];

interface AppBarElementRow {
    key: keyof AppBarVisibilityConfig;
    label: string;
    description: string;
}

const APP_BAR_ELEMENT_ROWS: AppBarElementRow[] = [
    { key: 'providerModelSelectors', label: 'Provider & model pickers', description: 'Hides the provider and model selectors.' },
    { key: 'languagePicker', label: 'Language picker', description: 'Hides the input/output language selector.' },
    { key: 'outputFormatToggle', label: 'Output format toggle', description: 'Hides the Plain/MD output format switch.' },
    { key: 'outputModeToggle', label: 'Output view toggle', description: 'Hides the Preview/Source/Diff view switch.' },
    { key: 'layoutToggle', label: 'Layout toggle', description: 'Hides the Side/Stacked editor layout switch.' },
    { key: 'commandPaletteButton', label: 'Command palette button', description: 'Hides the ⌘K command palette shortcut button.' },
    { key: 'historyButton', label: 'History button', description: 'Hides the history rail toggle button.' },
    { key: 'infoButton', label: 'Info button', description: 'Hides the About/info button.' },
];

const AppearanceTab: React.FC = () => {
    const dispatch = useAppDispatch();
    const themeMode = useAppSelector(selectThemeMode);
    const appBarVisibility = useAppSelector(selectAppBarVisibility);

    const handleThemeChange = (value: string) => {
        const mode = value as ThemeMode;
        const effective = resolveEffectiveTheme(mode);
        dispatch(setThemeMode(mode));
        dispatch(setThemeEffective(effective));
        void dispatch(persistUIPreferences());
    };

    const handleToggleElement = (key: keyof AppBarVisibilityConfig) => {
        dispatch(toggleAppBarElement(key));
        void dispatch(persistAppBarVisibility());
    };

    return (
        <section className={styles.root}>
            <div className={styles.section}>
                <p className={styles.sectionHeader}>Theme</p>
                <Segmented value={themeMode} onValueChange={handleThemeChange} items={THEME_OPTIONS} />
                <p className={styles.description}>
                    <strong>Auto</strong> follows your operating system and switches live when the OS changes. <strong>Light/Dark</strong> override
                    the OS. Applies instantly — no restart.
                </p>
            </div>

            <hr className={styles.divider} />

            <div className={styles.section}>
                <p className={styles.sectionHeader}>Preview</p>
                <div className={styles.previewRow}>
                    <div className={`${styles.previewCard} ${styles.previewLight}`} aria-label="Light theme preview">
                        Light · Aa <span className={styles.previewAccent}>accent</span>
                    </div>
                    <div className={`${styles.previewCard} ${styles.previewDark}`} aria-label="Dark theme preview">
                        Dark · Aa <span className={styles.previewAccent}>accent</span>
                    </div>
                </div>
            </div>

            <p className={styles.helper}>Applies instantly and persists across restarts; the chosen theme is used everywhere in the app.</p>

            <hr className={styles.divider} />

            <div className={styles.section}>
                <p className={styles.sectionHeader}>App Bar elements</p>
                <p className={styles.description}>
                    Hide App Bar controls you don&apos;t use. Each toggle applies instantly and persists across restarts.
                </p>
                <div className={styles.elementList}>
                    {APP_BAR_ELEMENT_ROWS.map((row) => (
                        <div key={row.key} className={styles.switchRow}>
                            <Switch
                                id={`appbar-visibility-${row.key}`}
                                checked={appBarVisibility[row.key]}
                                onCheckedChange={() => handleToggleElement(row.key)}
                                aria-label={row.label}
                            />
                            <label htmlFor={`appbar-visibility-${row.key}`} className={styles.switchLabel}>
                                {row.label}
                            </label>
                            <span className={styles.switchHint}>— {row.description}</span>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

AppearanceTab.displayName = 'AppearanceTab';

export default AppearanceTab;
