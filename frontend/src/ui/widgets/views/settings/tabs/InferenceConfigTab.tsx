import React from 'react';
interface InferenceConfigTabProps { settings: unknown }
const InferenceConfigTab: React.FC<InferenceConfigTabProps> = () => (
    <div style={{ padding: 'var(--space-4)', color: 'var(--ink-2)' }}>Inference Config — rebuilt in v3 UI (Phase 6)</div>
);
InferenceConfigTab.displayName = 'InferenceConfigTab';
export default InferenceConfigTab;
