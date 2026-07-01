import React from 'react';
import { ClipboardServiceAdapter, getLogger } from '../../../../logic/adapter';
import {
    selectInferenceRunning,
    selectInputContent,
    selectOutputContent,
    selectRunProgress,
    selectRunStatus,
    selectViewMode,
    useAppDispatch,
    useAppSelector,
} from '../../../../logic/store';
import { clearOutput, useOutputAsInput } from '../../../../logic/store/editor';
import { enqueueNotification } from '../../../../logic/store/notifications/slice';
import { parseError } from '../../../../logic/utils/error_utils';
import DiffView from '../../../../ui/components/DiffView';
import MarkdownView from '../../../../ui/components/MarkdownView';
import StepProgress from '../../../../ui/components/StepProgress';
import styles from './OutputPane.module.css';

const logger = getLogger('OutputPane');

const OutputPane: React.FC = () => {
    const dispatch = useAppDispatch();
    const output = useAppSelector(selectOutputContent);
    const input = useAppSelector(selectInputContent);
    const viewMode = useAppSelector(selectViewMode);
    const inferenceRunning = useAppSelector(selectInferenceRunning);
    const runStatus = useAppSelector(selectRunStatus);
    const progress = useAppSelector(selectRunProgress);

    const isRunning = runStatus === 'running';

    const handleCopy = async () => {
        try {
            if (!output) return;
            const ok = await ClipboardServiceAdapter.setText(output);
            if (ok) {
                dispatch(enqueueNotification({ message: 'Copied to clipboard', severity: 'success' }));
            }
        } catch (error: unknown) {
            const err = parseError(error);
            logger.logError(`Copy failed: ${err.message}`);
            dispatch(enqueueNotification({ message: 'Failed to copy', severity: 'error' }));
        }
    };

    const renderBody = () => {
        if (isRunning) {
            return (
                <div className={styles.centered}>
                    <StepProgress
                        currentGroupIndex={progress?.groupIndex ?? null}
                        totalGroups={progress?.totalGroups ?? null}
                        family={progress?.family ?? null}
                    />
                </div>
            );
        }
        if (!output) {
            return <div className={styles.empty}>Run to preview →</div>;
        }
        if (viewMode === 'diff') {
            return <DiffView original={input} modified={output} />;
        }
        if (viewMode === 'source') {
            return <pre className={styles.source}>{output}</pre>;
        }
        return (
            <div className={styles.preview}>
                <MarkdownView source={output} />
            </div>
        );
    };

    const modeLabel = viewMode === 'preview' ? 'rendered' : viewMode;

    return (
        <div className={styles.pane}>
            <div className={styles.header}>
                <span className={styles.title}>
                    Output <span className={styles.subLabel}>· {modeLabel}</span>
                </span>
                <div className={styles.headerRight}>
                    <div className={styles.headerActions}>
                        <button
                            className={styles.iconBtn}
                            onClick={handleCopy}
                            disabled={!output || inferenceRunning}
                            aria-label="Copy output"
                            title="Copy output"
                        >
                            ⧉
                        </button>
                        <button
                            className={styles.iconBtn}
                            onClick={() => dispatch(useOutputAsInput())} // eslint-disable-line react-hooks/rules-of-hooks -- useOutputAsInput is a Redux action creator, not a React hook
                            disabled={!output || inferenceRunning}
                            aria-label="Use as input"
                            title="Use as input"
                        >
                            ↺
                        </button>
                        <button
                            className={styles.iconBtn}
                            onClick={() => dispatch(clearOutput())}
                            disabled={!output || inferenceRunning}
                            aria-label="Clear output"
                            title="Clear output"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            </div>
            <div className={styles.body}>{renderBody()}</div>
        </div>
    );
};

OutputPane.displayName = 'OutputPane';
export default OutputPane;
