import React from 'react';

interface SettingsTabsProps {
    activeTab: number;
    onChange: (event: React.SyntheticEvent, newValue: number) => void;
}

const TAB_LABELS = ['Settings Info', 'Current Provider', 'Provider Management', 'Model Config', 'Inference Config', 'Language Config', 'Factory Reset', 'App Behavior'];

const SettingsTabs: React.FC<SettingsTabsProps> = ({ activeTab, onChange }) => {
    return (
        <div style={{ width: '100%', display: 'flex', flexWrap: 'wrap', borderBottom: '1px solid var(--line)', marginBottom: 'var(--space-2)' }}>
            {TAB_LABELS.map((label, index) => (
                <button
                    key={index}
                    onClick={(e) => onChange(e, index)}
                    style={{ padding: 'var(--space-2) var(--space-3)', border: 'none', borderBottom: index === activeTab ? '2px solid var(--teal)' : '2px solid transparent', background: 'none', cursor: 'pointer', color: index === activeTab ? 'var(--teal)' : 'var(--ink-2)', fontWeight: index === activeTab ? 700 : 400, fontSize: '0.85rem', whiteSpace: 'nowrap' }}
                >
                    {label}
                </button>
            ))}
        </div>
    );
};

SettingsTabs.displayName = 'SettingsTabs';
export default SettingsTabs;
