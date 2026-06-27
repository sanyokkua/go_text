import React from 'react';

import ActionsSidebar from './ActionsSidebar';
import EditorArea from './EditorArea';
import RunBar from './RunBar';

const EditorView: React.FC = () => {
    return (
        <div style={{ display: 'flex', width: '100%', height: '100%', overflow: 'hidden', flexDirection: 'column' }}>
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                <ActionsSidebar />
                <div style={{ flex: 1, overflow: 'hidden', padding: 'var(--space-2)' }}>
                    <EditorArea />
                </div>
            </div>
            <RunBar />
        </div>
    );
};

EditorView.displayName = 'EditorView';
export default EditorView;
