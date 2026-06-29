import { useCallback, useState } from 'react';
import { apperr } from '../../../../../wailsjs/go/models';
import { getLogger } from '../../../../logic/adapter';
import {
    selectActionCatalog,
    selectAllSettings,
    selectInferenceRunning,
    selectInputContent,
    selectSavedStacks,
    useAppDispatch,
    useAppSelector,
} from '../../../../logic/store';
import { enqueueNotification } from '../../../../logic/store/notifications/slice';
import { processPromptChain } from '../../../../logic/store/run';
import { addStep, clearBuilder, setBuilderIcon, setBuilderName } from '../../../../logic/store/stacks/builder/slice';
import { deleteStack, duplicateStack } from '../../../../logic/store/stacks/saved/thunks';
import { enterBuildMode, exitBuildMode, setCurrentView, setEditingStackId } from '../../../../logic/store/ui';
import { parseError } from '../../../../logic/utils/error_utils';
import { computeInferences } from '../../../../logic/utils/stack_utils';
import { AlertDialog } from '../../../../ui/primitives/AlertDialog';
import StackCard from './StackCard';
import styles from './StacksManageView.module.css';

const logger = getLogger('StacksManageView');

const StacksManageView: React.FC = () => {
    const dispatch = useAppDispatch();
    const stacks = useAppSelector(selectSavedStacks);
    const catalog = useAppSelector(selectActionCatalog);
    const inferenceRunning = useAppSelector(selectInferenceRunning);
    const inputContent = useAppSelector(selectInputContent);
    const settings = useAppSelector(selectAllSettings);

    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
    const deleteTarget = stacks.find((s) => s.id === deleteTargetId);

    const handleBack = () => dispatch(setCurrentView('main'));

    const handleNewStack = () => {
        dispatch(clearBuilder());
        dispatch(exitBuildMode());
        dispatch(enterBuildMode());
        dispatch(setCurrentView('main'));
    };

    const handleRun = useCallback(
        async (stack: apperr.SavedStack) => {
            dispatch(setCurrentView('main'));
            try {
                const req = new apperr.ChainRequest({
                    runId: crypto.randomUUID(),
                    inputText: inputContent,
                    steps: stack.steps.map((id) => new apperr.ChainStep({ actionId: id })),
                    inputLanguageId: settings?.languageConfig?.defaultInputLanguage ?? 'auto',
                    outputLanguageId: settings?.languageConfig?.defaultOutputLanguage ?? 'auto',
                    useMarkdown: settings?.inferenceBaseConfig?.useMarkdownForOutput ?? false,
                });
                logger.logInfo(`Stacks run: ${req.runId}`);
                await dispatch(processPromptChain(req)).unwrap();
            } catch (error: unknown) {
                const err = parseError(error);
                logger.logError(`Stack run failed: ${err.message}`);
                dispatch(enqueueNotification({ message: `Run failed: ${err.message}`, severity: 'error' }));
            }
        },
        [dispatch, inputContent, settings],
    );

    const handleEdit = (stack: apperr.SavedStack) => {
        dispatch(clearBuilder());
        stack.steps.forEach((id) => dispatch(addStep(id)));
        dispatch(setBuilderName(stack.name));
        dispatch(setBuilderIcon(stack.icon));
        dispatch(setEditingStackId(stack.id));
        dispatch(enterBuildMode());
        dispatch(setCurrentView('main'));
    };

    const handleDuplicate = async (stack: apperr.SavedStack) => {
        try {
            await dispatch(duplicateStack({ id: stack.id, newName: `${stack.name} (copy)` })).unwrap();
        } catch (error: unknown) {
            const err = parseError(error);
            dispatch(enqueueNotification({ message: `Duplicate failed: ${err.message}`, severity: 'error' }));
        }
    };

    const handleConfirmDelete = async () => {
        if (!deleteTargetId) return;
        try {
            await dispatch(deleteStack(deleteTargetId)).unwrap();
            setDeleteTargetId(null);
        } catch (error: unknown) {
            const err = parseError(error);
            dispatch(enqueueNotification({ message: `Delete failed: ${err.message}`, severity: 'error' }));
        }
    };

    return (
        <div className={styles.view}>
            <header className={styles.header}>
                <button className={styles.backBtn} onClick={handleBack} type="button" aria-label="Back to Editor">
                    ‹ Editor
                </button>
                <h1 className={styles.title}>My Stacks</h1>
                <button className={styles.newBtn} onClick={handleNewStack} type="button" aria-label="+ New stack">
                    ＋ New stack
                </button>
            </header>

            <div className={styles.grid}>
                {stacks.map((stack) => {
                    const inferenceCount = computeInferences(stack.steps, catalog);
                    const actionNames = stack.steps.map((id) => catalog.find((m) => m.id === id)?.name ?? id);

                    return (
                        <StackCard
                            key={stack.id}
                            stack={stack}
                            inferenceCount={inferenceCount}
                            actionNames={actionNames}
                            inferenceRunning={inferenceRunning}
                            onRun={() => handleRun(stack)}
                            onEdit={() => handleEdit(stack)}
                            onDuplicate={() => handleDuplicate(stack)}
                            onDelete={() => setDeleteTargetId(stack.id)}
                        />
                    );
                })}

                <button className={styles.newTile} onClick={handleNewStack} type="button" aria-label="Build a new stack">
                    ＋ Build a new stack
                </button>
            </div>

            <AlertDialog
                open={deleteTargetId !== null}
                onOpenChange={(open) => {
                    if (!open) setDeleteTargetId(null);
                }}
                title="Delete stack"
                description={`Delete "${deleteTarget?.name ?? 'this stack'}"? This cannot be undone.`}
                confirmLabel="Delete"
                variant="danger"
                onConfirm={handleConfirmDelete}
            />
        </div>
    );
};

StacksManageView.displayName = 'StacksManageView';
export default StacksManageView;
