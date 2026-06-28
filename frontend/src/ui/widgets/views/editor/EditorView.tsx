import { useState } from 'react';
import { selectBuildMode, selectHistoryOpen, useAppSelector } from '../../../../logic/store';
import ActionsSidebar from './ActionsSidebar';
import EditorArea from './EditorArea';
import HistoryRail from './HistoryRail';
import RunBar from './RunBar';
import SaveStackDialog from './SaveStackDialog';
import StackBuilderBar from './StackBuilderBar';

const EditorView: React.FC = () => {
    const buildMode = useAppSelector(selectBuildMode);
    const historyOpen = useAppSelector(selectHistoryOpen);
    const [saveDialogOpen, setSaveDialogOpen] = useState(false);

    return (
        <div style={{ display: 'flex', width: '100%', height: '100%', overflow: 'hidden' }}>
            <ActionsSidebar />
            {/* Editor column: panes on top, run/builder bar directly beneath them
                (only as wide as the panes — never under the sidebar). */}
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', minWidth: 0 }}>
                <div style={{ flex: 1, overflow: 'hidden', padding: 'var(--space-2)' }}>
                    <EditorArea />
                </div>
                {buildMode ? <StackBuilderBar onSave={() => setSaveDialogOpen(true)} /> : <RunBar />}
            </div>
            {historyOpen && <HistoryRail />}
            <SaveStackDialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen} />
        </div>
    );
};

EditorView.displayName = 'EditorView';
export default EditorView;
