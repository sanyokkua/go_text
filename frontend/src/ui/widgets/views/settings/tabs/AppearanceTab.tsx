import React from 'react';

import { useAppDispatch, useAppSelector } from '../../../../../logic/store';
import { selectThemeMode } from '../../../../../logic/store/ui/selectors';
import { setThemeEffective, setThemeMode } from '../../../../../logic/store/ui/slice';
import { ThemeMode } from '../../../../../logic/store/ui/types';
import { THEME_STORAGE_KEY, resolveEffectiveTheme } from '../../../../../logic/theme/init';
import { Segmented, SegmentedItem } from '../../../../primitives/Segmented';
import styles from './AppearanceTab.module.css';

const THEME_OPTIONS: SegmentedItem[] = [
    { 'value': 'auto', 'label': '🌓 Auto', 'aria-label': 'Follow OS setting' },
    { 'value': 'light', 'label': '☀ Light', 'aria-label': 'Light theme' },
    { 'value': 'dark', 'label': '🌙 Dark', 'aria-label': 'Dark theme' },
];

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
        <section className={styles.root}>
            <div className={styles.section}>
                <p className={styles.sectionHeader}>Theme</p>
                <Segmented value={themeMode} onValueChange={handleThemeChange} items={THEME_OPTIONS} />
                <p className={styles.description}>
                    <strong>Auto</strong> follows your operating system and switches live when the OS changes. <strong>Light/Dark</strong> override the
                    OS. Applies instantly — no restart.
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

            <p className={styles.helper}>
                Applies instantly and persists (<code>ui.theme</code>); the chosen theme is used everywhere in the app.
            </p>
        </section>
    );
};

AppearanceTab.displayName = 'AppearanceTab';

export default AppearanceTab;
