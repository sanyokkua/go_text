import React from 'react';
import { apperr } from '../../../../../wailsjs/go/models';
import { getLogger } from '../../../../logic/adapter';
import {
    selectActionCatalog,
    selectAllSettings,
    selectArmedActionId,
    selectArmedStackId,
    selectInferenceRunning,
    selectInputContent,
    selectRunId,
    selectRunStatus,
    selectSavedStacks,
    useAppDispatch,
    useAppSelector,
} from '../../../../logic/store';
import { enqueueNotification } from '../../../../logic/store/notifications/slice';
import { cancelChain, processPromptChain } from '../../../../logic/store/run';
import { enterBuildMode } from '../../../../logic/store/ui';
import { parseError } from '../../../../logic/utils/error_utils';
import { computeInferences } from '../../../../logic/utils/stack_utils';
import styles from './RunBar.module.css';

const logger = getLogger('RunBar');

interface RunBarProps {
    /** When true (stacked layout), render as a fully-bordered rounded box between the panes
        (mockup `.stackbar` stacked override); otherwise a top-divider bar below the panes. */
    boxed?: boolean;
}

const RunBar: React.FC<RunBarProps> = ({ boxed = false }) => {
    const dispatch = useAppDispatch();
    const armedActionId = useAppSelector(selectArmedActionId);
    const armedStackId = useAppSelector(selectArmedStackId);
    const inputContent = useAppSelector(selectInputContent);
    const inferenceRunning = useAppSelector(selectInferenceRunning);
    const runStatus = useAppSelector(selectRunStatus);
    const runId = useAppSelector(selectRunId);
    const catalog = useAppSelector(selectActionCatalog);
    const savedStacks = useAppSelector(selectSavedStacks);
    const settings = useAppSelector(selectAllSettings);

    const isRunning = runStatus === 'running';
    const armedAction = catalog.find((a) => a.id === armedActionId) ?? null;
    const armedStack = savedStacks.find((s) => s.id === armedStackId) ?? null;
    const hasTarget = !!armedActionId || !!armedStackId;
    const canRun = hasTarget && !!inputContent.trim() && !inferenceRunning;

    // Chip meta for an armed stack — mirrors StackCard's "N steps · M inferences" wording.
    const stackMeta = ((): string => {
        if (!armedStack) return '';
        const stepCount = armedStack.steps.length;
        const inferenceCount = computeInferences(armedStack.steps, catalog);
        const stepLabel = stepCount === 1 ? '1 step' : `${stepCount} steps`;
        const infLabel = inferenceCount === 1 ? '1 inference' : `${inferenceCount} inferences`;
        return `${stepLabel} · ${infLabel}`;
    })();

    // Build the steps for the armed run-target: a single action, or every step of the armed stack.
    const buildSteps = (): apperr.ChainStep[] => {
        if (armedStack) {
            return armedStack.steps.map((id) => new apperr.ChainStep({ actionId: id }));
        }
        if (armedActionId) {
            return [new apperr.ChainStep({ actionId: armedActionId })];
        }
        return [];
    };

    const handleRun = async () => {
        const steps = buildSteps();
        if (steps.length === 0 || !inputContent.trim()) return;
        try {
            const req = new apperr.ChainRequest({
                runId: crypto.randomUUID(),
                inputText: inputContent,
                steps,
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

    const renderChip = (): React.ReactNode => {
        if (armedStack) {
            return (
                <>
                    <span className={styles.chipCheck}>✓</span>
                    <span className={styles.chipName}>{armedStack.name}</span>
                    <span className={styles.chipBadge}>{stackMeta}</span>
                </>
            );
        }
        if (armedAction) {
            return (
                <>
                    <span className={styles.chipCheck}>✓</span>
                    <span className={styles.chipName}>{armedAction.name}</span>
                    <span className={styles.chipBadge}>1 inference</span>
                </>
            );
        }
        return <span className={styles.chipHint}>Select an action from the sidebar</span>;
    };

    const barClass = [styles.bar, boxed ? styles.boxed : ''].filter(Boolean).join(' ');

    return (
        <div className={barClass}>
            <div className={styles.chip}>{renderChip()}</div>

            <div className={styles.actions}>
                {!isRunning && (
                    <button
                        className={styles.buildBtn}
                        onClick={() => {
                            dispatch(enterBuildMode());
                            logger.logInfo('Entered build mode from run bar');
                        }}
                        disabled={inferenceRunning}
                        aria-label="Build a stack"
                        type="button"
                    >
                        ＋ Build a stack
                    </button>
                )}
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
