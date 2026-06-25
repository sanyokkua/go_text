import React from 'react';
interface LanguageConfigTabProps {
    settings: unknown;
}
const LanguageConfigTab: React.FC<LanguageConfigTabProps> = () => (
    <div style={{ padding: 'var(--space-4)', color: 'var(--ink-2)' }}>Language Config — rebuilt in v3 UI (Phase 6)</div>
);
LanguageConfigTab.displayName = 'LanguageConfigTab';
export default LanguageConfigTab;
