import { useState } from 'react';
import { selectBuildMode, selectHistoryOpen, selectLayout, useAppSelector } from '../../../../logic/store';
import ActionsSidebar from './ActionsSidebar';
import EditorArea from './EditorArea';
import HistoryRail from './HistoryRail';
import RunBar from './RunBar';
import SaveStackDialog from './SaveStackDialog';
import StackBuilderBar from './StackBuilderBar';

const EditorView: React.FC = () => {
    const buildMode = useAppSelector(selectBuildMode);
    const historyOpen = useAppSelector(selectHistoryOpen);
    const layout = useAppSelector(selectLayout);
    const [saveDialogOpen, setSaveDialogOpen] = useState(false);

    // In stacked layout the control bar sits BETWEEN the input and output panes as a bordered rounded
    // box (mockup §"stacked"); in side layout it sits below the panes as a top-divider bar.
    const stacked = layout === 'stacked';
    const controlBar = buildMode ? (
        <StackBuilderBar onSave={() => setSaveDialogOpen(true)} boxed={stacked} />
    ) : (
        <RunBar boxed={stacked} />
    );

    return (
        <div style={{ display: 'flex', width: '100%', height: '100%', overflow: 'hidden' }}>
            <ActionsSidebar />
            {/* Editor column: panes fill the area; in side layout the run/builder bar sits directly
                beneath the panes (only as wide as the panes — never under the sidebar). */}
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', minWidth: 0 }}>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                    <EditorArea controlBar={layout === 'stacked' ? controlBar : undefined} />
                </div>
                {layout === 'side' && controlBar}
            </div>
            {historyOpen && <HistoryRail />}
            <SaveStackDialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen} />
        </div>
    );
};

EditorView.displayName = 'EditorView';
export default EditorView;
