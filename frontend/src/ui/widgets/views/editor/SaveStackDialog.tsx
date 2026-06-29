import { useEffect, useState } from 'react';
import { apperr } from '../../../../../wailsjs/go/models';
import { getLogger } from '../../../../logic/adapter';
import {
    selectBuilderIcon,
    selectBuilderInferenceCount,
    selectBuilderName,
    selectBuilderStepCount,
    selectBuilderSteps,
    selectEditingStackId,
    selectSavedStacks,
    useAppDispatch,
    useAppSelector,
} from '../../../../logic/store';
import { enqueueNotification } from '../../../../logic/store/notifications/slice';
import { clearBuilder, setBuilderIcon, setBuilderName } from '../../../../logic/store/stacks/builder/slice';
import { createStack, listStacks, updateStack } from '../../../../logic/store/stacks/saved/thunks';
import { exitBuildMode } from '../../../../logic/store/ui';
import { parseError } from '../../../../logic/utils/error_utils';
import { Dialog } from '../../../../ui/primitives/Dialog';
import styles from './SaveStackDialog.module.css';

const logger = getLogger('SaveStackDialog');

const ICONS = [
    // Work / dev glyphs
    '📝', '✏️', '🔧', '🐛', '🚀', '📊', '✅', '💬', '📌', '🌐',
    '🎯', '💡', '⚡', '🔍', '📋', '🎨', '📈', '🗂️', '🏷️', '🔄',
    '⚙️', '🛠️', '🔨', '📐', '📎', '🖇️', '🗃️', '📁', '📄', '🔖',
    // Symbols
    '⭐', '🔥', '💎', '🎁', '🔔', '🧩', '🧠', '🪄', '🧪', '🔬',
    '📚', '📖', '✒️', '🖊️', '🖋️', '✍️', '🗒️', '📰', '🧾', '📑',
    // Faces / people
    '😀', '😎', '🤖', '👍', '👀', '🙌', '👋', '🙏', '💪', '🫡',
    // Misc objects
    '☕', '🌟', '🌈', '🎵', '🧭', '⏱️', '⏰', '📅', '💰', '🏆',
];

function defaultName(stepCount: number): string {
    return stepCount === 1 ? 'My Stack' : `${stepCount}-Step Stack`;
}

export interface SaveStackDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const SaveStackDialog: React.FC<SaveStackDialogProps> = ({ open, onOpenChange }) => {
    const dispatch = useAppDispatch();
    const builderName = useAppSelector(selectBuilderName);
    const builderIcon = useAppSelector(selectBuilderIcon);
    const builderSteps = useAppSelector(selectBuilderSteps);
    const stepCount = useAppSelector(selectBuilderStepCount);
    const inferenceCount = useAppSelector(selectBuilderInferenceCount);
    const savedStacks = useAppSelector(selectSavedStacks);
    const editingStackId = useAppSelector(selectEditingStackId);

    const [name, setName] = useState('');
    const [icon, setIcon] = useState(ICONS[0]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (open) {
            setName(builderName || defaultName(stepCount));
            setIcon(builderIcon || ICONS[0]);
        }
    }, [open, builderName, builderIcon, stepCount]);

    const isDuplicate = savedStacks.some((s) => s.name.trim() === name.trim() && s.id !== editingStackId);
    const canSave = name.trim().length > 0 && !isDuplicate && !saving;

    const handleIconSelect = (ic: string) => {
        const trimmed = ic.trim();
        setIcon(trimmed);
        dispatch(setBuilderIcon(trimmed));
    };

    const handleSave = async () => {
        if (!canSave) return;
        setSaving(true);
        try {
            const stack = new apperr.SavedStack({
                id: editingStackId ?? '',
                name: name.trim(),
                icon,
                steps: builderSteps,
                defaultFormat: 'PlainText',
                defaultInLang: '',
                defaultOutLang: '',
                createdAt: 0,
                updatedAt: 0,
            });

            if (editingStackId) {
                await dispatch(updateStack(stack)).unwrap();
            } else {
                await dispatch(createStack(stack)).unwrap();
            }

            dispatch(setBuilderName(name.trim()));
            dispatch(clearBuilder());
            dispatch(exitBuildMode());
            await dispatch(listStacks());
            onOpenChange(false);
        } catch (error: unknown) {
            const err = parseError(error);
            logger.logError(`Save stack failed: ${err.message}`);
            dispatch(enqueueNotification({ message: `Failed to save stack: ${err.message}`, severity: 'error' }));
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        onOpenChange(false);
    };

    const inferenceLabel = inferenceCount === 1 ? '1 inference' : `${inferenceCount} inferences`;
    const stepLabel = stepCount === 1 ? '1 step' : `${stepCount} steps`;

    return (
        <Dialog open={open} onOpenChange={onOpenChange} title="⊕ Save custom stack">
            <div className={styles.body}>
                <label className={styles.fieldLabel} htmlFor="stack-name">
                    Name
                </label>
                <input
                    id="stack-name"
                    className={`${styles.nameInput} ${isDuplicate ? styles.nameInputError : ''}`}
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    aria-label="Name"
                    autoFocus
                    autoComplete="off"
                />
                {isDuplicate && <p className={styles.errorMsg}>Name already exists — choose a unique name.</p>}

                <label className={styles.fieldLabel}>Icon</label>
                <div className={styles.iconRow}>
                    <span className={styles.iconPreview} aria-hidden="true">
                        {icon}
                    </span>
                    <input
                        id="stack-icon"
                        className={styles.iconInput}
                        type="text"
                        value={icon}
                        maxLength={2}
                        onChange={(e) => handleIconSelect(e.target.value)}
                        placeholder="Any emoji"
                        aria-label="Selected icon"
                        autoComplete="off"
                    />
                </div>
                <div className={styles.iconPicker}>
                    {ICONS.map((ic) => (
                        <button
                            key={ic}
                            className={`${styles.iconOption} ${icon === ic ? styles.iconSelected : ''}`}
                            onClick={() => handleIconSelect(ic)}
                            type="button"
                            aria-label={`Icon ${ic}`}
                            aria-pressed={icon === ic}
                        >
                            {ic}
                        </button>
                    ))}
                </div>

                <p className={styles.summary}>
                    ▤ {stepLabel} · {inferenceLabel}
                </p>
            </div>

            <div className={styles.footer}>
                <button className={styles.cancelBtn} onClick={handleCancel} type="button" aria-label="Cancel">
                    Cancel
                </button>
                <button className={styles.saveBtn} onClick={handleSave} disabled={!canSave} type="button" aria-label="Save">
                    {saving ? 'Saving…' : 'Save'}
                </button>
            </div>
        </Dialog>
    );
};

SaveStackDialog.displayName = 'SaveStackDialog';
export default SaveStackDialog;
