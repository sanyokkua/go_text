import React, { useEffect, useState } from 'react';

import { AppBehaviorConfig, AppSettingsMetadata, Settings } from '../../../../../logic/adapter/models';
import { useAppDispatch } from '../../../../../logic/store';
import { clearHistory } from '../../../../../logic/store/history/thunks';
import { enqueueNotification } from '../../../../../logic/store/notifications/slice';
import { updateAppBehaviorConfig } from '../../../../../logic/store/settings/thunks';
import { Button } from '../../../../components/Button';
import { AlertDialog } from '../../../../primitives/AlertDialog';
import { Switch } from '../../../../primitives/Switch';

interface Props {
    settings: Settings;
    metadata: AppSettingsMetadata | null;
}

const sectionHeader: React.CSSProperties = {
    fontSize: '0.8125rem',
    fontWeight: 700,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    color: 'var(--ink-3)',
    padding: 'var(--space-4) 0 var(--space-2)',
};

const fieldRow: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-3)',
    padding: 'var(--space-3) 0',
    borderBottom: '1px solid var(--line)',
};

const fieldLabel: React.CSSProperties = {
    minWidth: 220,
    color: 'var(--ink-1)',
    fontSize: '0.875rem',
    fontWeight: 500,
};

const fieldValue: React.CSSProperties = {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
};

const monoPath: React.CSSProperties = {
    fontFamily: 'var(--mono)',
    fontSize: '0.8125rem',
    color: 'var(--ink-2)',
    wordBreak: 'break-all',
};

const numberInput: React.CSSProperties = {
    width: 96,
    padding: '4px 8px',
    border: '1px solid var(--line)',
    borderRadius: 'var(--radius)',
    background: 'var(--surface)',
    color: 'var(--ink-1)',
    fontSize: '0.875rem',
};

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
        dispatch(updateAppBehaviorConfig({ ...config, enableTaskLogging: checked }))
            .catch(() => undefined);
    };

    const handleToggleHistory = (checked: boolean) => {
        dispatch(updateAppBehaviorConfig({ ...config, historyEnabled: checked }))
            .catch(() => undefined);
    };

    const handleMaxEntriesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const parsed = Number.parseInt(e.target.value, 10);
        if (!Number.isNaN(parsed)) {
            setLocalMaxEntries(parsed);
        }
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
            dispatch(enqueueNotification({
                severity: 'info',
                surface: 'toast',
                title: 'History cleared',
                message: 'All history entries have been removed.',
            }));
        } catch {
            dispatch(enqueueNotification({
                severity: 'error',
                surface: 'toast',
                title: 'Failed to clear history',
                message: 'An error occurred while clearing history. Please try again.',
            }));
        }
    };

    const isMaxEntriesDirty = localMaxEntries !== (config.historyMaxEntries ?? 500);
    const historyEnabled = config.historyEnabled ?? true;

    return (
        <section style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 0 }}>
            <p style={sectionHeader}>Task logging</p>

            <div style={fieldRow}>
                <label htmlFor="task-logging-switch" style={fieldLabel}>Enable task logging</label>
                <div style={fieldValue}>
                    <Switch
                        id="task-logging-switch"
                        checked={config.enableTaskLogging}
                        onCheckedChange={handleToggleTaskLogging}
                        aria-label="Enable task logging"
                    />
                </div>
            </div>

            <div style={{ ...fieldRow, borderBottom: 'none' }}>
                <span style={fieldLabel}>Log directory</span>
                <div style={fieldValue}>
                    <code style={monoPath}>{metadata?.logsFolder ?? '(OS default)'}</code>
                </div>
            </div>

            <p style={{ ...sectionHeader, borderTop: '1px solid var(--line)', marginTop: 'var(--space-2)' }}>History</p>

            <div style={fieldRow}>
                <label htmlFor="history-enabled-switch" style={fieldLabel}>Enable history</label>
                <div style={fieldValue}>
                    <Switch
                        id="history-enabled-switch"
                        checked={historyEnabled}
                        onCheckedChange={handleToggleHistory}
                        aria-label="Enable history"
                    />
                </div>
            </div>

            <div style={fieldRow}>
                <label htmlFor="history-max-entries" style={fieldLabel}>Max history entries</label>
                <div style={fieldValue}>
                    <input
                        id="history-max-entries"
                        type="number"
                        style={numberInput}
                        value={localMaxEntries}
                        min={10}
                        max={10000}
                        step={10}
                        disabled={!historyEnabled}
                        onChange={handleMaxEntriesChange}
                        aria-label="Maximum number of history entries"
                    />
                    <Button
                        variant="primary"
                        size="sm"
                        disabled={!isMaxEntriesDirty || savingMaxEntries || !historyEnabled}
                        onClick={() => { handleSaveMaxEntries().catch(() => undefined); }}
                    >
                        {savingMaxEntries ? 'Saving…' : 'Save'}
                    </Button>
                </div>
            </div>

            <div style={{ ...fieldRow, borderBottom: 'none' }}>
                <span style={fieldLabel}>Clear all history</span>
                <div style={fieldValue}>
                    <Button
                        variant="danger"
                        size="sm"
                        disabled={!historyEnabled}
                        onClick={() => setClearDialogOpen(true)}
                    >
                        Clear history…
                    </Button>
                </div>
            </div>

            <AlertDialog
                open={clearDialogOpen}
                onOpenChange={setClearDialogOpen}
                title="Clear history?"
                description="All history entries will be permanently deleted. This cannot be undone."
                confirmLabel="Clear history"
                variant="danger"
                onConfirm={() => { setClearDialogOpen(false); handleConfirmClear().catch(() => undefined); }}
            />
        </section>
    );
};

AppBehaviorTab.displayName = 'AppBehaviorTab';

export default AppBehaviorTab;
