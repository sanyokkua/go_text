import React from 'react';

import { getLogger } from '../../../logic/adapter';
import {
    selectAppBehaviorConfig,
    selectCurrentView,
    selectHistoryOpen,
    selectInferenceBaseConfig,
    selectInferenceRunning,
    selectLayout,
    selectSidebarCollapsed,
    selectViewMode,
    useAppDispatch,
    useAppSelector,
} from '../../../logic/store';
import { setViewMode } from '../../../logic/store/editor';
import { updateInferenceBaseConfig } from '../../../logic/store/settings/thunks';
import { setCurrentView, setLayout, toggleHistory, toggleSidebar } from '../../../logic/store/ui';
import { Segmented } from '../../primitives/Segmented';
import { Tooltip } from '../../primitives/Tooltip';
import LanguagePicker from './LanguagePicker';
import ModelPicker from './ModelPicker';
import ProviderPicker from './ProviderPicker';
import styles from './AppBar.module.css';

const logger = getLogger('AppBar');

const AppBar: React.FC = () => {
    const dispatch = useAppDispatch();
    const view = useAppSelector(selectCurrentView);
    const layout = useAppSelector(selectLayout);
    const viewMode = useAppSelector(selectViewMode);
    const sidebarCollapsed = useAppSelector(selectSidebarCollapsed);
    const inferenceRunning = useAppSelector(selectInferenceRunning);
    const historyOpen = useAppSelector(selectHistoryOpen);
    const appBehavior = useAppSelector(selectAppBehaviorConfig);
    const inferenceBaseConfig = useAppSelector(selectInferenceBaseConfig);

    const isMain = view === 'main';
    const historyEnabled = appBehavior?.historyEnabled ?? true;
    const formatValue = inferenceBaseConfig?.useMarkdownForOutput ? 'md' : 'plain';

    const handleFormatChange = (v: string): void => {
        if (!inferenceBaseConfig) return;
        void dispatch(updateInferenceBaseConfig({ ...inferenceBaseConfig, useMarkdownForOutput: v === 'md' }));
    };

    return (
        <header className={styles.bar}>
            <div className={styles.left}>
                {isMain && (
                    <Tooltip content={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} side="bottom">
                        <button
                            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                            aria-pressed={!sidebarCollapsed}
                            onClick={() => {
                                dispatch(toggleSidebar());
                                logger.logInfo('Sidebar toggled');
                            }}
                            className={styles.sidebarBtn}
                        >
                            ☰
                        </button>
                    </Tooltip>
                )}
                {!isMain && (
                    <button
                        aria-label="Back to editor"
                        onClick={() => {
                            dispatch(setCurrentView('main'));
                            logger.logInfo('Navigated to main');
                        }}
                        className={styles.backBtn}
                    >
                        ‹ Editor
                    </button>
                )}

                <span className={styles.wordmark}>GoText</span>

                {isMain && (
                    <>
                        <div className={styles.separator} aria-hidden="true" />
                        <ProviderPicker />
                        <ModelPicker />
                        <LanguagePicker />
                    </>
                )}
            </div>

            <div className={styles.spacer} />

            <div className={styles.right}>
                {isMain && (
                    <>
                        <Segmented
                            value={formatValue}
                            onValueChange={handleFormatChange}
                            items={[
                                { value: 'plain', label: 'Plain' },
                                { value: 'md', label: 'MD' },
                            ]}
                            disabled={inferenceRunning}
                        />
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
                        <Tooltip content={historyEnabled ? 'Toggle history' : 'History is disabled in Settings'} side="bottom">
                            <button
                                aria-label="Toggle history rail"
                                aria-pressed={historyOpen}
                                disabled={!historyEnabled}
                                data-active={historyOpen}
                                onClick={() => {
                                    dispatch(toggleHistory());
                                    logger.logInfo('History toggled');
                                }}
                                className={styles.historyBtn}
                            >
                                🕘
                            </button>
                        </Tooltip>
                        <Tooltip content="About GoText" side="bottom">
                            <button
                                aria-label="About and info"
                                onClick={() => {
                                    dispatch(setCurrentView('info'));
                                    logger.logInfo('Navigated to info');
                                }}
                                className={styles.iconBtn}
                            >
                                ℹ
                            </button>
                        </Tooltip>
                    </>
                )}
                <Tooltip content={isMain ? 'Settings' : 'Close'} side="bottom">
                    <button
                        aria-label={isMain ? 'Open settings' : 'Close'}
                        onClick={() => {
                            dispatch(setCurrentView(isMain ? 'settings' : 'main'));
                        }}
                        className={styles.iconBtn}
                    >
                        {isMain ? '⚙' : '✕'}
                    </button>
                </Tooltip>
            </div>
        </header>
    );
};

AppBar.displayName = 'AppBar';
export default AppBar;
