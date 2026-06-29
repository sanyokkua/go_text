import React, { useEffect, useState } from 'react';

import { openExternal } from '../../../../../logic/adapter';
import { AppBehaviorConfig, AppSettingsMetadata, Settings } from '../../../../../logic/adapter/models';
import { useAppDispatch } from '../../../../../logic/store';
import { clearHistory } from '../../../../../logic/store/history/thunks';
import { enqueueNotification } from '../../../../../logic/store/notifications/slice';
import { updateAppBehaviorConfig } from '../../../../../logic/store/settings/thunks';
import { Button } from '../../../../components/Button';
import { NumberStepper } from '../../../../components/NumberStepper';
import { AlertDialog } from '../../../../primitives/AlertDialog';
import { Switch } from '../../../../primitives/Switch';
import styles from './AppBehaviorTab.module.css';

interface Props {
    settings: Settings;
    metadata: AppSettingsMetadata | null;
}

const AppBehaviorTab: React.FC<Props> = ({ settings, metadata }) => {
    const dispatch = useAppDispatch();
    const config: AppBehaviorConfig = settings.appBehaviorConfig;

    const [localMaxEntries, setLocalMaxEntries] = useState<number>(config.historyMaxEntries ?? 500);
    const [savingMaxEntries, setSavingMaxEntries] = useState(false);
    const [clearDialogOpen, setClearDialogOpen] = useState(false);

    useEffect(() => {
        setLocalMaxEntries(config.historyMaxEntries ?? 500);
    }, [config.historyMaxEntries]);

    const handleToggleTaskLogging = (checked: boolean) => {
        dispatch(updateAppBehaviorConfig({ ...config, enableTaskLogging: checked })).catch(() => undefined);
    };

    const handleToggleHistory = (checked: boolean) => {
        dispatch(updateAppBehaviorConfig({ ...config, historyEnabled: checked })).catch(() => undefined);
    };

    const handleSaveMaxEntries = async () => {
        setSavingMaxEntries(true);
        try {
            await dispatch(updateAppBehaviorConfig({ ...config, historyMaxEntries: localMaxEntries })).unwrap();
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
        if (logsFolder) {
            openExternal(`file://${logsFolder}`);
        }
    };

    const isMaxEntriesDirty = localMaxEntries !== (config.historyMaxEntries ?? 500);
    const historyEnabled = config.historyEnabled ?? true;

    return (
        <section className={styles.root}>
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
