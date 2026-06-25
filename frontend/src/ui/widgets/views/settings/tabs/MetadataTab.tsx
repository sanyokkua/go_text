import React from 'react';
interface MetadataTabProps {
    metadata: { settingsFolder: string; settingsFile: string };
}
const MetadataTab: React.FC<MetadataTabProps> = ({ metadata }) => (
    <div style={{ padding: 'var(--space-4)' }}>
        <h3>Settings Info</h3>
        <p>
            <strong>Folder:</strong> <code style={{ fontFamily: 'var(--mono)' }}>{metadata.settingsFolder}</code>
        </p>
        <p>
            <strong>File:</strong> <code style={{ fontFamily: 'var(--mono)' }}>{metadata.settingsFile}</code>
        </p>
    </div>
);
MetadataTab.displayName = 'MetadataTab';
export default MetadataTab;
