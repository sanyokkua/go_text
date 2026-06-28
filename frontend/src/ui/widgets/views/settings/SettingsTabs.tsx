import React from 'react';

import styles from './SettingsTabs.module.css';

interface SettingsTabsProps {
    activeTab: number;
    onChange: (event: React.SyntheticEvent, newValue: number) => void;
}

interface TabDef {
    label: string;
    glyph: string;
}

const TABS: TabDef[] = [
    { label: 'Providers', glyph: '🖌' },
    { label: 'Model', glyph: '⚙' },
    { label: 'Generation', glyph: '✍' },
    { label: 'Languages', glyph: '🌐' },
    { label: 'Logging', glyph: '🗒' },
    { label: 'About & data', glyph: 'ℹ' },
    { label: 'Appearance', glyph: '🎨' },
];

const SettingsTabs: React.FC<SettingsTabsProps> = ({ activeTab, onChange }) => {
    return (
        <div className={styles.nav} aria-label="Settings sections" role="tablist" aria-orientation="vertical">
            {TABS.map((tab, index) => (
                <button
                    key={tab.label}
                    role="tab"
                    aria-selected={index === activeTab}
                    onClick={(e) => onChange(e, index)}
                    className={`${styles.tab} ${index === activeTab ? styles.tabActive : ''}`}
                >
                    <span className={styles.glyph} aria-hidden="true">
                        {tab.glyph}
                    </span>
                    {tab.label}
                </button>
            ))}
        </div>
    );
};

SettingsTabs.displayName = 'SettingsTabs';
export default SettingsTabs;
