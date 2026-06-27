import React, { useState } from 'react';

import { ClipboardServiceAdapter } from '../../../../../logic/adapter';
import { useAppDispatch, useAppSelector } from '../../../../../logic/store';
import { enqueueNotification } from '../../../../../logic/store/notifications/slice';
import { selectSettingsMetadata } from '../../../../../logic/store/settings/selectors';
import { resetSettingsToDefault } from '../../../../../logic/store/settings/thunks';
import { Button } from '../../../../components/Button';
import { AlertDialog } from '../../../../primitives/AlertDialog';

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

const fieldLabel: React.CSSProperties = { minWidth: 120, color: 'var(--ink-1)', fontSize: '0.875rem', fontWeight: 500, flexShrink: 0 };

const monoPath: React.CSSProperties = { fontFamily: 'var(--mono)', fontSize: '0.8125rem', color: 'var(--ink-2)', wordBreak: 'break-all', flex: 1 };

const MetadataTab: React.FC = () => {
    const dispatch = useAppDispatch();
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
        try {
            await dispatch(resetSettingsToDefault()).unwrap();
            dispatch(
                enqueueNotification({
                    severity: 'info',
                    surface: 'toast',
                    title: 'Settings reset',
                    message: 'All settings have been restored to defaults.',
                }),
            );
        } catch {
            dispatch(
                enqueueNotification({
                    severity: 'error',
                    surface: 'toast',
                    title: 'Reset failed',
                    message: 'An error occurred during factory reset. Please try again.',
                }),
            );
        }
    };

    const settingsFile = metadata?.settingsFile ?? '—';
    const logsFolder = metadata?.logsFolder ?? '—';

    return (
        <section style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 0 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-3)', paddingBottom: 'var(--space-3)' }}>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--ink-1)' }}>GoText</h2>
                <span
                    style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: 'var(--teal)',
                        border: '1px solid var(--teal)',
                        borderRadius: 'var(--radius)',
                        padding: '1px 8px',
                        fontFamily: 'var(--mono)',
                    }}
                >
                    {metadata?.appVersion ?? '—'}
                </span>
            </div>
            <p style={{ margin: '0 0 var(--space-4)', fontSize: '0.8125rem', color: 'var(--ink-3)' }}>Wails · Go · React</p>

            <p style={sectionHeader}>Data &amp; file locations</p>

            <div style={fieldRow}>
                <span style={fieldLabel}>Database</span>
                <code style={monoPath}>{settingsFile}</code>
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

            <div style={{ ...fieldRow, borderBottom: 'none' }}>
                <span style={fieldLabel}>Logs folder</span>
                <code style={monoPath}>{logsFolder}</code>
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

            <p style={{ ...sectionHeader, borderTop: '1px solid var(--line)', marginTop: 'var(--space-2)' }}>Danger zone</p>

            <div
                style={{
                    border: '1px solid color-mix(in srgb, var(--red, #e53e3e) 40%, transparent)',
                    borderRadius: 'var(--radius)',
                    padding: 'var(--space-4)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--space-3)',
                }}
            >
                <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--ink-2)' }}>
                    Factory reset clears all settings, providers, stacks, and history, then reseeds defaults. This cannot be undone.
                </p>
                <div>
                    <Button variant="danger" size="sm" onClick={() => setResetDialogOpen(true)}>
                        Factory reset…
                    </Button>
                </div>
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
