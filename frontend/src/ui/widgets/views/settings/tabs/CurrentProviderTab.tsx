import React from 'react';
interface CurrentProviderTabProps { settings: unknown; metadata: unknown }
const CurrentProviderTab: React.FC<CurrentProviderTabProps> = () => (
    <div style={{ padding: 'var(--space-4)', color: 'var(--ink-2)' }}>Current Provider — rebuilt in v3 UI (Phase 6)</div>
);
CurrentProviderTab.displayName = 'CurrentProviderTab';
export default CurrentProviderTab;
