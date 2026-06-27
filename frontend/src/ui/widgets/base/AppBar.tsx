import React from 'react';

import { getLogger } from '../../../logic/adapter';
import {
    selectCurrentView,
    selectInferenceRunning,
    selectLayout,
    selectSidebarCollapsed,
    selectViewMode,
    useAppDispatch,
    useAppSelector,
} from '../../../logic/store';
import { setViewMode } from '../../../logic/store/editor';
import { setCurrentView, setLayout, toggleSidebar } from '../../../logic/store/ui';
import { Segmented } from '../../primitives/Segmented';

const logger = getLogger('AppBar');

const AppBar: React.FC = () => {
    const dispatch = useAppDispatch();
    const view = useAppSelector(selectCurrentView);
    const layout = useAppSelector(selectLayout);
    const viewMode = useAppSelector(selectViewMode);
    const sidebarCollapsed = useAppSelector(selectSidebarCollapsed);
    const inferenceRunning = useAppSelector(selectInferenceRunning);

    const isMain = view === 'main';

    return (
        <header
            style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 var(--space-3)',
                background: 'var(--teal-dark)',
                color: 'var(--white)',
                gap: 'var(--space-2)',
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexShrink: 0 }}>
                {isMain && (
                    <button
                        aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                        aria-pressed={!sidebarCollapsed}
                        onClick={() => { dispatch(toggleSidebar()); logger.logInfo('Sidebar toggled'); }}
                        style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '1.1rem' }}
                    >
                        ☰
                    </button>
                )}
                {!isMain && (
                    <button
                        aria-label="Back to editor"
                        onClick={() => { dispatch(setCurrentView('main')); logger.logInfo('Navigated to main'); }}
                        style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '0.875rem' }}
                    >
                        ‹ Editor
                    </button>
                )}
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Text Processor</span>
            </div>

            {isMain && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <Segmented
                        value={viewMode}
                        onValueChange={(v) => dispatch(setViewMode(v as typeof viewMode))}
                        items={[
                            { value: 'preview', label: 'Preview' },
                            { value: 'source', label: 'Source' },
                            { value: 'diff', label: 'Diff' },
                        ]}
                        disabled={inferenceRunning}
                    />
                    <Segmented
                        value={layout}
                        onValueChange={(v) => dispatch(setLayout(v as typeof layout))}
                        items={[
                            { value: 'side', label: '⊞ Side' },
                            { value: 'stacked', label: '⊟ Stacked' },
                        ]}
                        disabled={inferenceRunning}
                    />
                </div>
            )}

            <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexShrink: 0 }}>
                {isMain && (
                    <button
                        aria-label="About and info"
                        onClick={() => { dispatch(setCurrentView('info')); logger.logInfo('Navigated to info'); }}
                        style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '1rem' }}
                    >
                        ℹ
                    </button>
                )}
                <button
                    aria-label={isMain ? 'Open settings' : 'Close'}
                    onClick={() => { dispatch(setCurrentView(isMain ? 'settings' : 'main')); }}
                    style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '1rem' }}
                >
                    {isMain ? '⚙' : '✕'}
                </button>
            </div>
        </header>
    );
};

AppBar.displayName = 'AppBar';
export default AppBar;
