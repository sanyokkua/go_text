import React, { useEffect, useState } from 'react';
import { apperr } from '../../../../../wailsjs/go/models';
import { getLogger } from '../../../../logic/adapter';
import {
    selectActionCatalog,
    selectAppBehaviorConfig,
    selectHistoryEntries,
    selectHistoryLoading,
    selectSelectedHistoryId,
    useAppDispatch,
    useAppSelector,
} from '../../../../logic/store';
import { setInputContent, setOutputContent } from '../../../../logic/store/editor';
import { clearHistory, clearHistorySelection, deleteHistoryEntry, listHistory, selectHistoryEntry } from '../../../../logic/store/history';
import { enqueueNotification } from '../../../../logic/store/notifications/slice';
import { armAction } from '../../../../logic/store/ui';
import { parseError } from '../../../../logic/utils/error_utils';
import { AlertDialog } from '../../../primitives/AlertDialog';
import { ScrollArea } from '../../../primitives/ScrollArea';
import HistoryEntryCard from './HistoryEntryCard';
import styles from './HistoryRail.module.css';

const logger = getLogger('HistoryRail');

const PAGE_LIMIT = 100;

const HistoryRail: React.FC = () => {
    const dispatch = useAppDispatch();
    const entries = useAppSelector(selectHistoryEntries);
    const selectedId = useAppSelector(selectSelectedHistoryId);
    const loading = useAppSelector(selectHistoryLoading);
    const appBehavior = useAppSelector(selectAppBehaviorConfig);
    const catalog = useAppSelector(selectActionCatalog);

    const [clearDialogOpen, setClearDialogOpen] = useState(false);

    const historyEnabled = appBehavior?.historyEnabled ?? true;
    const maxEntries = appBehavior?.historyMaxEntries ?? 100;

    useEffect(() => {
        logger.logInfo('HistoryRail mounted — loading history');
        dispatch(listHistory({ page: PAGE_LIMIT, pageSize: 0 }));
    }, [dispatch]);

    const handleRestore = (entry: apperr.HistoryEntry) => {
        dispatch(setInputContent(entry.inputText));
        dispatch(setOutputContent(entry.outputText));
        dispatch(selectHistoryEntry(entry.id));
        logger.logInfo(`Restored history entry: ${entry.id}`);

        if (entry.kind === 'single' && entry.applied.length > 0) {
            const actionId = entry.applied[0].id;
            const existsInCatalog = catalog.some((a) => a.id === actionId);
            if (existsInCatalog) {
                dispatch(armAction(actionId));
            } else {
                dispatch(enqueueNotification({
                    message: `Action "${entry.applied[0].name}" is no longer available — content restored without re-arming.`,
                    severity: 'warning',
                }));
            }
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await dispatch(deleteHistoryEntry(id)).unwrap();
            logger.logInfo(`Deleted history entry: ${id}`);
            if (selectedId === id) {
                dispatch(clearHistorySelection());
            }
        } catch (error: unknown) {
            const err = parseError(error);
            logger.logError(`Delete history entry failed: ${err.message}`);
            dispatch(enqueueNotification({ message: `Failed to delete entry: ${err.message}`, severity: 'error' }));
        }
    };

    const handleClearConfirm = async () => {
        try {
            await dispatch(clearHistory()).unwrap();
            setClearDialogOpen(false);
            logger.logInfo('History cleared');
        } catch (error: unknown) {
            const err = parseError(error);
            logger.logError(`Clear history failed: ${err.message}`);
            dispatch(enqueueNotification({ message: `Failed to clear history: ${err.message}`, severity: 'error' }));
        }
    };

    const renderList = () => {
        if (!historyEnabled) {
            return (
                <p className={styles.empty}>
                    History is disabled.<br />Enable it in Settings → Logging.
                </p>
            );
        }
        if (loading) {
            return <p className={styles.empty}>Loading…</p>;
        }
        if (entries.length === 0) {
            return <p className={styles.empty}>No runs yet.</p>;
        }
        return entries.map((entry) => (
            <HistoryEntryCard
                key={entry.id}
                entry={entry}
                isSelected={selectedId === entry.id}
                onRestore={() => handleRestore(entry)}
                onDelete={() => handleDelete(entry.id)}
            />
        ));
    };

    return (
        <aside className={styles.rail} aria-label="History">
            <div className={styles.header}>
                <strong className={styles.headerTitle}>History</strong>
                <span className={styles.maxBadge}>{maxEntries} max</span>
                <button
                    className={styles.clearBtn}
                    type="button"
                    aria-label="Clear all history"
                    disabled={entries.length === 0}
                    onClick={() => setClearDialogOpen(true)}
                >
                    Clear
                </button>
            </div>

            <div className={styles.listArea}>
                <ScrollArea style={{ height: '100%' }}>
                    <div aria-label="History entries">
                        {renderList()}
                    </div>
                </ScrollArea>
            </div>

            <AlertDialog
                open={clearDialogOpen}
                onOpenChange={setClearDialogOpen}
                title="Clear history"
                description="Remove all history entries? This cannot be undone."
                confirmLabel="Clear all"
                variant="danger"
                onConfirm={handleClearConfirm}
            />
        </aside>
    );
};

HistoryRail.displayName = 'HistoryRail';
export default HistoryRail;
