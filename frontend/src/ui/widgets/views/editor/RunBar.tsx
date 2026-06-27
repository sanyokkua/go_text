import React from 'react';
import { apperr } from '../../../../../wailsjs/go/models';
import { getLogger } from '../../../../logic/adapter';
import {
    selectActionCatalog,
    selectAllSettings,
    selectArmedActionId,
    selectInferenceRunning,
    selectInputContent,
    selectRunId,
    selectRunStatus,
    useAppDispatch,
    useAppSelector,
} from '../../../../logic/store';
import { enqueueNotification } from '../../../../logic/store/notifications/slice';
import { cancelChain, processPromptChain } from '../../../../logic/store/run';
import { parseError } from '../../../../logic/utils/error_utils';
import styles from './RunBar.module.css';

const logger = getLogger('RunBar');

const RunBar: React.FC = () => {
    const dispatch = useAppDispatch();
    const armedActionId = useAppSelector(selectArmedActionId);
    const inputContent = useAppSelector(selectInputContent);
    const inferenceRunning = useAppSelector(selectInferenceRunning);
    const runStatus = useAppSelector(selectRunStatus);
    const runId = useAppSelector(selectRunId);
    const catalog = useAppSelector(selectActionCatalog);
    const settings = useAppSelector(selectAllSettings);

    const isRunning = runStatus === 'running';
    const armedAction = catalog.find((a) => a.id === armedActionId) ?? null;
    const canRun = !!armedActionId && !!inputContent.trim() && !inferenceRunning;

    const handleRun = async () => {
        if (!armedActionId || !inputContent.trim()) return;
        try {
            const req = new apperr.ChainRequest({
                runId: crypto.randomUUID(),
                inputText: inputContent,
                steps: [new apperr.ChainStep({ actionId: armedActionId })],
                inputLanguageId: settings?.languageConfig?.defaultInputLanguage ?? 'auto',
                outputLanguageId: settings?.languageConfig?.defaultOutputLanguage ?? 'auto',
                useMarkdown: settings?.inferenceBaseConfig?.useMarkdownForOutput ?? false,
            });
            logger.logInfo(`Starting run: ${req.runId}`);
            await dispatch(processPromptChain(req)).unwrap();
        } catch (error: unknown) {
            const err = parseError(error);
            logger.logError(`Run failed: ${err.message}`);
            dispatch(enqueueNotification({ message: `Run failed: ${err.message}`, severity: 'error' }));
        }
    };

    const handleCancel = async () => {
        if (!runId) return;
        try {
            await dispatch(cancelChain(runId)).unwrap();
        } catch (error: unknown) {
            const err = parseError(error);
            logger.logError(`Cancel failed: ${err.message}`);
        }
    };

    return (
        <div className={styles.bar}>
            <div className={styles.chip}>
                {armedAction ? (
                    <>
                        <span className={styles.chipCheck}>✓</span>
                        <span className={styles.chipName}>{armedAction.name}</span>
                        <span className={styles.chipBadge}>1 inference</span>
                    </>
                ) : (
                    <span className={styles.chipHint}>Select an action from the sidebar</span>
                )}
            </div>

            <div className={styles.actions}>
                {isRunning ? (
                    <button className={`${styles.runBtn} ${styles.cancelBtn}`} onClick={handleCancel} aria-label="Cancel run" type="button">
                        ✕ Cancel
                    </button>
                ) : (
                    <button className={styles.runBtn} onClick={handleRun} disabled={!canRun} aria-label="Run" type="button">
                        ▶ Run
                    </button>
                )}
            </div>
        </div>
    );
};

RunBar.displayName = 'RunBar';
export default RunBar;
