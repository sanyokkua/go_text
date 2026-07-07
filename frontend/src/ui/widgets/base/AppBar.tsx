import { ChevronLeft, History, Info, PanelLeft, Settings, X } from 'lucide-react';
import React from 'react';

import { getLogger } from '../../../logic/adapter';
import {
    selectAppBarVisibility,
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
import { persistUIPreferences, updateInferenceBaseConfig } from '../../../logic/store/settings/thunks';
import { setCurrentView, setHistoryOpen, setLayout, setSidebarCollapsed, togglePalette } from '../../../logic/store/ui';
import { IconButton } from '../../components/IconButton';
import { Segmented } from '../../primitives/Segmented';
import { Tooltip } from '../../primitives/Tooltip';
import styles from './AppBar.module.css';
import LanguagePicker from './LanguagePicker';
import ModelPicker from './ModelPicker';
import ProviderPicker from './ProviderPicker';

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
    const appBarVisibility = useAppSelector(selectAppBarVisibility);

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
                                dispatch(setSidebarCollapsed(!sidebarCollapsed));
                                void dispatch(persistUIPreferences());
                                logger.logInfo('Sidebar toggled');
                            }}
                            className={styles.sidebarBtn}
                        >
                            <PanelLeft size={16} />
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
                        <ChevronLeft size={16} />
                        <span>Editor</span>
                    </button>
                )}

                <span className={styles.logo} aria-hidden="true">
                    G
                </span>
                <span className={styles.wordmark}>GoText</span>

                {isMain && appBarVisibility.providerModelSelectors && (
                    <>
                        <ProviderPicker />
                        <ModelPicker />
                    </>
                )}
                {isMain && appBarVisibility.languagePicker && <LanguagePicker />}
            </div>

            <div className={styles.right}>
                {isMain && appBarVisibility.outputFormatToggle && (
                    <Segmented
                        value={formatValue}
                        onValueChange={handleFormatChange}
                        items={[
                            { value: 'plain', label: 'Plain' },
                            { value: 'md', label: 'MD' },
                        ]}
                        disabled={inferenceRunning}
                    />
                )}
                {isMain && appBarVisibility.outputModeToggle && (
                    <Segmented
                        value={viewMode}
                        onValueChange={(v) => {
                            dispatch(setViewMode(v as typeof viewMode));
                            void dispatch(persistUIPreferences());
                        }}
                        items={[
                            { value: 'preview', label: 'Preview' },
                            { value: 'source', label: 'Source' },
                            { value: 'diff', label: 'Diff' },
                        ]}
                        disabled={inferenceRunning}
                    />
                )}
                {isMain && appBarVisibility.layoutToggle && (
                    <Segmented
                        value={layout}
                        onValueChange={(v) => {
                            dispatch(setLayout(v as typeof layout));
                            void dispatch(persistUIPreferences());
                        }}
                        items={[
                            { value: 'side', label: '⊞ Side' },
                            { value: 'stacked', label: '⊟ Stacked' },
                        ]}
                        disabled={inferenceRunning}
                    />
                )}
                {isMain && appBarVisibility.commandPaletteButton && (
                    <Tooltip content="Command palette (⌘K)" side="bottom">
                        <IconButton
                            aria-label="Open command palette"
                            disabled={inferenceRunning}
                            onClick={() => {
                                dispatch(togglePalette());
                                logger.logInfo('Command palette toggled');
                            }}
                        >
                            <span className={styles.cmdkLabel}>⌘K</span>
                        </IconButton>
                    </Tooltip>
                )}
                {isMain && appBarVisibility.historyButton && (
                    <Tooltip content={historyEnabled ? 'Toggle history' : 'History is disabled in Settings'} side="bottom">
                        <IconButton
                            aria-label="Toggle history rail"
                            on={historyOpen}
                            disabled={!historyEnabled}
                            onClick={() => {
                                dispatch(setHistoryOpen(!historyOpen));
                                void dispatch(persistUIPreferences());
                                logger.logInfo('History toggled');
                            }}
                        >
                            <History size={16} />
                        </IconButton>
                    </Tooltip>
                )}
                {isMain && appBarVisibility.infoButton && (
                    <Tooltip content="About GoText" side="bottom">
                        <IconButton
                            aria-label="About and info"
                            onClick={() => {
                                dispatch(setCurrentView('info'));
                                logger.logInfo('Navigated to info');
                            }}
                        >
                            <Info size={16} />
                        </IconButton>
                    </Tooltip>
                )}
                <Tooltip content={isMain ? 'Settings' : 'Close'} side="bottom">
                    <IconButton
                        aria-label={isMain ? 'Open settings' : 'Close'}
                        onClick={() => {
                            dispatch(setCurrentView(isMain ? 'settings' : 'main'));
                        }}
                    >
                        {isMain ? <Settings size={16} /> : <X size={16} />}
                    </IconButton>
                </Tooltip>
            </div>
        </header>
    );
};

AppBar.displayName = 'AppBar';
export default AppBar;
