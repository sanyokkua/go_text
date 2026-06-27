import React from 'react';
import { ClipboardServiceAdapter, getLogger } from '../../../../logic/adapter';
import {
    selectHasDiff, selectInputContent, selectInferenceRunning,
    selectOutputContent, selectRunProgress, selectRunStatus, selectViewMode,
    useAppDispatch, useAppSelector,
} from '../../../../logic/store';
import { clearOutput, setViewMode, useOutputAsInput } from '../../../../logic/store/editor';
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
    const hasDiff = useAppSelector(selectHasDiff);

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

    return (
        <div className={styles.pane}>
            <div className={styles.header}>
                <span className={styles.title}>Output</span>
                <div className={styles.viewTabs}>
                    {(['preview', 'source', 'diff'] as const).map((mode) => (
                        <button
                            key={mode}
                            className={`${styles.viewTab} ${viewMode === mode ? styles.viewTabActive : ''}`}
                            onClick={() => dispatch(setViewMode(mode))}
                            disabled={inferenceRunning || (mode === 'diff' && !hasDiff)}
                            aria-disabled={inferenceRunning || (mode === 'diff' && !hasDiff)}
                            aria-label={`${mode} view`}
                        >
                            {mode.charAt(0).toUpperCase() + mode.slice(1)}
                        </button>
                    ))}
                </div>
            </div>
            <div className={styles.body}>{renderBody()}</div>
            <div className={styles.footer}>
                <button
                    className={styles.btn}
                    onClick={handleCopy}
                    disabled={!output || inferenceRunning}
                    aria-label="Copy output"
                >
                    Copy
                </button>
                <button
                    className={styles.btn}
                    onClick={() => dispatch(useOutputAsInput())}
                    disabled={!output || inferenceRunning}
                    aria-label="Use as input"
                >
                    Use as input
                </button>
                <button
                    className={styles.btn}
                    onClick={() => dispatch(clearOutput())}
                    disabled={!output || inferenceRunning}
                    aria-label="Clear output"
                >
                    Clear
                </button>
            </div>
        </div>
    );
};

OutputPane.displayName = 'OutputPane';
export default OutputPane;
