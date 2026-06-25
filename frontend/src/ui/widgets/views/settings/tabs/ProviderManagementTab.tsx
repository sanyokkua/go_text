import React from 'react';
interface ProviderManagementTabProps { settings: unknown; metadata: unknown }
const ProviderManagementTab: React.FC<ProviderManagementTabProps> = () => (
    <div style={{ padding: 'var(--space-4)', color: 'var(--ink-2)' }}>Provider Management — rebuilt in v3 UI (Phase 6)</div>
);
ProviderManagementTab.displayName = 'ProviderManagementTab';
export default ProviderManagementTab;
