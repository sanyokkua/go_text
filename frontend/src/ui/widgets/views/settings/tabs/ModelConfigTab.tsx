import React from 'react';
interface ModelConfigTabProps { settings: unknown }
const ModelConfigTab: React.FC<ModelConfigTabProps> = () => (
    <div style={{ padding: 'var(--space-4)', color: 'var(--ink-2)' }}>Model Config — rebuilt in v3 UI (Phase 6)</div>
);
ModelConfigTab.displayName = 'ModelConfigTab';
export default ModelConfigTab;
