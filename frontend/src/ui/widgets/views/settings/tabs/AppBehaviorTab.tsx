import React, { useEffect, useState } from 'react';

import { openPath } from '../../../../../logic/adapter';
import { AppBehaviorConfig, AppSettingsMetadata, LoggingConfig, Settings } from '../../../../../logic/adapter/models';
import { useSettingsToast } from '../../../../../logic/hooks/useSettingsToast';
import { useAppDispatch } from '../../../../../logic/store';
import { clearHistory } from '../../../../../logic/store/history/thunks';
import { enqueueNotification } from '../../../../../logic/store/notifications/slice';
import { updateAppBehaviorConfig, updateLoggingConfig } from '../../../../../logic/store/settings/thunks';
import { Button } from '../../../../components/Button';
import { NumberStepper } from '../../../../components/NumberStepper';
import { AlertDialog } from '../../../../primitives/AlertDialog';
import { Select, SelectItem } from '../../../../primitives/Select';
import { Switch } from '../../../../primitives/Switch';
import styles from './AppBehaviorTab.module.css';

const DEFAULT_LOGGING: LoggingConfig = {
    logFileEnabled: false,
    logLevel: 'info',
    logDirectory: '',
    logMaxSizeMB: 10,
    logMaxBackups: 5,
    logMaxAgeDays: 30,
    logCompress: false,
};

const LOG_LEVEL_ITEMS: SelectItem[] = [
    { value: 'trace', label: 'Trace' },
    { value: 'debug', label: 'Debug' },
    { value: 'info', label: 'Info' },
    { value: 'warn', label: 'Warn' },
    { value: 'error', label: 'Error' },
];

interface Props {
    settings: Settings;
    metadata: AppSettingsMetadata | null;
}

const AppBehaviorTab: React.FC<Props> = ({ settings, metadata }) => {
    const dispatch = useAppDispatch();
    const runWithToast = useSettingsToast();
    const config: AppBehaviorConfig = settings.appBehaviorConfig;
    const loggingCfg: LoggingConfig = settings.loggingConfig ?? DEFAULT_LOGGING;

    const handleToggleFileLogging = (checked: boolean) => {
        void runWithToast(dispatch(updateLoggingConfig({ ...loggingCfg, logFileEnabled: checked })), {
            success: checked ? 'File logging enabled' : 'File logging disabled',
        });
    };

    const handleLogLevelChange = (level: string) => {
        void runWithToast(dispatch(updateLoggingConfig({ ...loggingCfg, logLevel: level })), {
            success: `Log level set to ${level}`,
        });
    };

    const handleMaxFileSizeChange = (size: number) => {
        void runWithToast(dispatch(updateLoggingConfig({ ...loggingCfg, logMaxSizeMB: size })), {
            success: `Max log size set to ${size} MB`,
        });
    };

    const [localMaxEntries, setLocalMaxEntries] = useState<number>(config.historyMaxEntries ?? 500);
    const [savingMaxEntries, setSavingMaxEntries] = useState(false);
    const [clearDialogOpen, setClearDialogOpen] = useState(false);

    useEffect(() => {
        setLocalMaxEntries(config.historyMaxEntries ?? 500);
    }, [config.historyMaxEntries]);

    const handleToggleTaskLogging = (checked: boolean) => {
        void runWithToast(dispatch(updateAppBehaviorConfig({ ...config, enableTaskLogging: checked })), {
            success: checked ? 'Task logging enabled' : 'Task logging disabled',
        });
    };

    const handleToggleHistory = (checked: boolean) => {
        void runWithToast(dispatch(updateAppBehaviorConfig({ ...config, historyEnabled: checked })), {
            success: checked ? 'History enabled' : 'History disabled',
        });
    };

    const handleSaveMaxEntries = async () => {
        setSavingMaxEntries(true);
        try {
            await runWithToast(dispatch(updateAppBehaviorConfig({ ...config, historyMaxEntries: localMaxEntries })), {
                success: 'History limit saved',
            });
        } finally {
            setSavingMaxEntries(false);
        }
    };

    const handleConfirmClear = async () => {
        try {
            await dispatch(clearHistory()).unwrap();
            dispatch(
                enqueueNotification({
                    severity: 'info',
                    surface: 'toast',
                    title: 'History cleared',
                    message: 'All history entries have been removed.',
                }),
            );
        } catch {
            dispatch(
                enqueueNotification({
                    severity: 'error',
                    surface: 'toast',
                    title: 'Failed to clear history',
                    message: 'An error occurred while clearing history. Please try again.',
                }),
            );
        }
    };

    const logsFolder = metadata?.logsFolder ?? '';

    const handleOpenLogs = () => {
        if (!logsFolder) return;
        void runWithToast(openPath(logsFolder), {
            success: 'Opened logs folder',
            error: "Couldn't open the logs folder.",
            errorTitle: 'Open failed',
        });
    };

    const isMaxEntriesDirty = localMaxEntries !== (config.historyMaxEntries ?? 500);
    const historyEnabled = config.historyEnabled ?? true;

    return (
        <section className={styles.root}>
            <p className={styles.sectionHeader}>Log directory (shared by task + app logs)</p>

            <div className={styles.dirRow}>
                <input className={styles.dirInput} type="text" value={logsFolder || '(OS default)'} readOnly aria-label="Log directory" />
                <Button variant="ghost" size="sm" onClick={handleOpenLogs} disabled={!logsFolder}>
                    📁 Open logs folder
                </Button>
            </div>
            <p className={styles.resolvedPath}>
                Resolved: <code>{logsFolder || '(OS default)'}</code> · app.log + tasks-*.jsonl
            </p>

            <hr className={styles.divider} />

            <p className={styles.sectionHeader}>App File Logging</p>

            <div className={styles.switchRow}>
                <Switch
                    id="file-logging-switch"
                    checked={loggingCfg.logFileEnabled}
                    onCheckedChange={handleToggleFileLogging}
                    aria-label="Enable file logging"
                />
                <label htmlFor="file-logging-switch" className={styles.switchLabel}>
                    Write logs to file
                </label>
                <span className={styles.switchHint}>— app.log in the logs folder</span>
            </div>

            <div className={styles.selectRow}>
                <span className={styles.entriesLabel}>Log level</span>
                <Select
                    value={loggingCfg.logLevel}
                    onValueChange={handleLogLevelChange}
                    items={LOG_LEVEL_ITEMS}
                    placeholder="Select level"
                    keyLabel="Level"
                    disabled={!loggingCfg.logFileEnabled}
                />
            </div>

            <div className={styles.entriesRow}>
                <span className={styles.entriesLabel}>Max file size (MB)</span>
                <NumberStepper
                    value={loggingCfg.logMaxSizeMB}
                    onChange={handleMaxFileSizeChange}
                    min={1}
                    max={100}
                    step={1}
                    disabled={!loggingCfg.logFileEnabled}
                    aria-label="Max log file size MB"
                />
            </div>

            <hr className={styles.divider} />

            <div className={styles.switchRow}>
                <Switch
                    id="task-logging-switch"
                    checked={config.enableTaskLogging}
                    onCheckedChange={handleToggleTaskLogging}
                    aria-label="Enable task logging"
                />
                <label htmlFor="task-logging-switch" className={styles.switchLabel}>
                    Task logging
                </label>
                <span className={styles.switchHint}>— saves each run&apos;s prompts &amp; result to JSONL</span>
            </div>

            <hr className={styles.divider} />

            <div className={styles.switchRow}>
                <Switch id="history-enabled-switch" checked={historyEnabled} onCheckedChange={handleToggleHistory} aria-label="Enable history" />
                <label htmlFor="history-enabled-switch" className={styles.switchLabel}>
                    History
                </label>
                <span className={styles.switchHint}>— stores past runs for the history rail</span>
            </div>

            <div className={styles.entriesRow}>
                <span className={styles.entriesLabel}>Max entries</span>
                <NumberStepper
                    value={localMaxEntries}
                    onChange={setLocalMaxEntries}
                    min={10}
                    max={10000}
                    step={10}
                    disabled={!historyEnabled}
                    aria-label="Maximum number of history entries"
                />
                <Button
                    variant="primary"
                    size="sm"
                    disabled={!isMaxEntriesDirty || savingMaxEntries || !historyEnabled}
                    onClick={() => {
                        handleSaveMaxEntries().catch(() => undefined);
                    }}
                >
                    {savingMaxEntries ? 'Saving…' : 'Save'}
                </Button>
                <Button variant="danger" size="sm" disabled={!historyEnabled} onClick={() => setClearDialogOpen(true)}>
                    Clear history…
                </Button>
            </div>

            <AlertDialog
                open={clearDialogOpen}
                onOpenChange={setClearDialogOpen}
                title="Clear history?"
                description="All history entries will be permanently deleted. This cannot be undone."
                confirmLabel="Clear history"
                variant="danger"
                onConfirm={() => {
                    setClearDialogOpen(false);
                    handleConfirmClear().catch(() => undefined);
                }}
            />
        </section>
    );
};

AppBehaviorTab.displayName = 'AppBehaviorTab';

export default AppBehaviorTab;
