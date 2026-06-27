import { Fragment } from 'react';
import { getLogger } from '../../../../logic/adapter';
import {
    selectAllSettings,
    selectBuilderFamilyGroups,
    selectBuilderInferenceCount,
    selectBuilderStepCount,
    selectInputContent,
    selectInferenceRunning,
    selectRunId,
    selectRunStatus,
    useAppDispatch,
    useAppSelector,
} from '../../../../logic/store';
import { removeStep, clearBuilder } from '../../../../logic/store/stacks/builder/slice';
import { cancelChain, processPromptChain } from '../../../../logic/store/run';
import { exitBuildMode } from '../../../../logic/store/ui';
import { enqueueNotification } from '../../../../logic/store/notifications/slice';
import { parseError } from '../../../../logic/utils/error_utils';
import { apperr } from '../../../../../wailsjs/go/models';
import styles from './StackBuilderBar.module.css';

const logger = getLogger('StackBuilderBar');

export interface StackBuilderBarProps {
    onSave: () => void;
}

const StackBuilderBar: React.FC<StackBuilderBarProps> = ({ onSave }) => {
    const dispatch = useAppDispatch();
    const familyGroups = useAppSelector(selectBuilderFamilyGroups);
    const stepCount = useAppSelector(selectBuilderStepCount);
    const inferenceCount = useAppSelector(selectBuilderInferenceCount);
    const inferenceRunning = useAppSelector(selectInferenceRunning);
    const runStatus = useAppSelector(selectRunStatus);
    const runId = useAppSelector(selectRunId);
    const inputContent = useAppSelector(selectInputContent);
    const settings = useAppSelector(selectAllSettings);
    const allSteps = familyGroups.flatMap((g) => g.steps);

    const isRunning = runStatus === 'running';
    const canRun = stepCount > 0 && !!inputContent.trim() && !inferenceRunning;

    const handleCancel = () => {
        dispatch(clearBuilder());
        dispatch(exitBuildMode());
    };

    const handleRun = async () => {
        if (!canRun) return;
        try {
            const req = new apperr.ChainRequest({
                runId: crypto.randomUUID(),
                inputText: inputContent,
                steps: allSteps.map((s) => new apperr.ChainStep({ actionId: s.id })),
                inputLanguageId: settings?.languageConfig?.defaultInputLanguage ?? 'auto',
                outputLanguageId: settings?.languageConfig?.defaultOutputLanguage ?? 'auto',
                useMarkdown: settings?.inferenceBaseConfig?.useMarkdownForOutput ?? false,
            });
            logger.logInfo(`Stack run: ${req.runId}`);
            await dispatch(processPromptChain(req)).unwrap();
        } catch (error: unknown) {
            const err = parseError(error);
            logger.logError(`Stack run failed: ${err.message}`);
            dispatch(enqueueNotification({ message: `Run failed: ${err.message}`, severity: 'error' }));
        }
    };

    const handleCancelRun = async () => {
        if (!runId) return;
        try {
            await dispatch(cancelChain(runId)).unwrap();
        } catch (error: unknown) {
            const err = parseError(error);
            logger.logError(`Cancel failed: ${err.message}`);
        }
    };

    const inferenceLabel = inferenceCount === 1 ? '1 inference' : `${inferenceCount} inferences`;

    return (
        <div className={styles.bar}>
            {/* Family group chip clusters */}
            <div className={styles.groups}>
                {familyGroups.length === 0 ? (
                    <span className={styles.emptyHint}>＋ Add step</span>
                ) : (
                    familyGroups.map((group, gi) => (
                        <Fragment key={`${group.family}-${gi}`}>
                            {gi > 0 && <span className={styles.arrow}>→</span>}
                            <div className={styles.famGroup}>
                                <span className={styles.famTitle}>{group.family}</span>
                                <div className={styles.chips}>
                                    {group.steps.map((step) => (
                                        <span key={step.id} className={styles.chip}>
                                            <span className={styles.chipLabel}>{step.name}</span>
                                            <button
                                                className={styles.chipRemove}
                                                onClick={() => dispatch(removeStep(step.flatIndex))}
                                                aria-label={`Remove ${step.name}`}
                                                type="button"
                                            >
                                                ✕
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </Fragment>
                    ))
                )}
            </div>

            {/* Live counter */}
            <span className={styles.counter}>
                ▤ {stepCount} / 5 steps · {inferenceLabel}
            </span>

            {/* Action buttons */}
            <div className={styles.actions}>
                <button
                    className={styles.cancelBtn}
                    onClick={handleCancel}
                    type="button"
                    aria-label="Cancel build"
                >
                    ✕ Cancel
                </button>
                <button
                    className={styles.saveBtn}
                    onClick={onSave}
                    disabled={stepCount === 0}
                    type="button"
                    aria-label="Save stack"
                >
                    ⊕ Save…
                </button>
                {isRunning ? (
                    <button
                        className={`${styles.runBtn} ${styles.runBtnCancel}`}
                        onClick={handleCancelRun}
                        type="button"
                        aria-label="Cancel run"
                    >
                        ✕ Cancel run
                    </button>
                ) : (
                    <button
                        className={styles.runBtn}
                        onClick={handleRun}
                        disabled={!canRun}
                        type="button"
                        aria-label="Run"
                    >
                        ▶ Run
                    </button>
                )}
            </div>
        </div>
    );
};

StackBuilderBar.displayName = 'StackBuilderBar';
export default StackBuilderBar;
