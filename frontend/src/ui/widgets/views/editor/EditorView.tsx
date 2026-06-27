import { useState } from 'react';
import { selectBuildMode, useAppSelector } from '../../../../logic/store';
import ActionsSidebar from './ActionsSidebar';
import EditorArea from './EditorArea';
import RunBar from './RunBar';
import SaveStackDialog from './SaveStackDialog';
import StackBuilderBar from './StackBuilderBar';

const EditorView: React.FC = () => {
    const buildMode = useAppSelector(selectBuildMode);
    const [saveDialogOpen, setSaveDialogOpen] = useState(false);

    return (
        <div style={{ display: 'flex', width: '100%', height: '100%', overflow: 'hidden', flexDirection: 'column' }}>
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                <ActionsSidebar />
                <div style={{ flex: 1, overflow: 'hidden', padding: 'var(--space-2)' }}>
                    <EditorArea />
                </div>
            </div>
            {buildMode ? (
                <StackBuilderBar onSave={() => setSaveDialogOpen(true)} />
            ) : (
                <RunBar />
            )}
            <SaveStackDialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen} />
        </div>
    );
};

EditorView.displayName = 'EditorView';
export default EditorView;
