import React, { useState } from 'react';

import { ClipboardServiceAdapter } from '../../../../../logic/adapter';
import { useSettingsToast } from '../../../../../logic/hooks/useSettingsToast';
import { useAppDispatch, useAppSelector } from '../../../../../logic/store';
import { enqueueNotification } from '../../../../../logic/store/notifications/slice';
import { selectSettingsMetadata } from '../../../../../logic/store/settings/selectors';
import { resetSettingsToDefault } from '../../../../../logic/store/settings/thunks';
import { Button } from '../../../../components/Button';
import { AlertDialog } from '../../../../primitives/AlertDialog';
import styles from './MetadataTab.module.css';

const MetadataTab: React.FC = () => {
    const dispatch = useAppDispatch();
    const runWithToast = useSettingsToast();
    const metadata = useAppSelector(selectSettingsMetadata);
    const [resetDialogOpen, setResetDialogOpen] = useState(false);

    const handleCopyPath = async (path: string) => {
        try {
            await ClipboardServiceAdapter.setText(path);
            dispatch(enqueueNotification({ severity: 'info', surface: 'toast', title: 'Copied', message: 'Path copied to clipboard.' }));
        } catch {
            dispatch(
                enqueueNotification({ severity: 'error', surface: 'toast', title: 'Copy failed', message: 'Could not write to the clipboard.' }),
            );
        }
    };

    const handleConfirmReset = async () => {
        await runWithToast(dispatch(resetSettingsToDefault()), {
            success: 'All settings have been restored to defaults.',
            successTitle: 'Settings reset',
        });
    };

    const settingsFile = metadata?.settingsFile ?? '—';
    const logsFolder = metadata?.logsFolder ?? '—';

    return (
        <section className={styles.root}>
            <div className={styles.appHeader}>
                <h2 className={styles.appName}>GoText</h2>
                <span className={styles.versionBadge}>{metadata?.appVersion ?? '—'}</span>
                <span className={styles.stack}>Wails · Go · React + Radix</span>
            </div>

            <p className={styles.sectionHeader}>Data &amp; file locations</p>

            <div className={styles.fieldRow}>
                <span className={styles.fieldLabel}>Database</span>
                <code className={styles.monoPath}>{settingsFile}</code>
                <Button
                    variant="ghost"
                    size="sm"
                    aria-label="Copy database path"
                    onClick={() => {
                        handleCopyPath(settingsFile).catch(() => undefined);
                    }}
                >
                    ⧉
                </Button>
            </div>

            <div className={`${styles.fieldRow} ${styles.fieldRowLast}`}>
                <span className={styles.fieldLabel}>Logs folder</span>
                <code className={styles.monoPath}>{logsFolder}</code>
                <Button
                    variant="ghost"
                    size="sm"
                    aria-label="Copy logs folder path"
                    onClick={() => {
                        handleCopyPath(logsFolder).catch(() => undefined);
                    }}
                >
                    ⧉
                </Button>
            </div>

            <p className={styles.sectionHeader}>Danger zone</p>

            <div className={styles.dangerZone}>
                <p className={styles.dangerText}>
                    Factory reset wipes all settings, providers, stacks &amp; history, then re-seeds defaults. This cannot be undone.
                </p>
                <Button variant="danger" size="sm" onClick={() => setResetDialogOpen(true)}>
                    Factory reset…
                </Button>
            </div>

            <AlertDialog
                open={resetDialogOpen}
                onOpenChange={setResetDialogOpen}
                title="Factory reset?"
                description="All settings will be wiped and restored to defaults. Are you sure?"
                confirmLabel="Reset everything"
                variant="danger"
                onConfirm={() => {
                    setResetDialogOpen(false);
                    handleConfirmReset().catch(() => undefined);
                }}
            />
        </section>
    );
};

MetadataTab.displayName = 'MetadataTab';

export default MetadataTab;
