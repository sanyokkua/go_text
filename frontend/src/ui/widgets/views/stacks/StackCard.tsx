import { DropdownMenu } from '../../../../ui/primitives/DropdownMenu';
import { apperr } from '../../../../../wailsjs/go/models';
import styles from './StackCard.module.css';

export interface StackCardProps {
    stack: apperr.SavedStack;
    inferenceCount: number;
    actionNames: string[];
    inferenceRunning: boolean;
    onRun: () => void;
    onEdit: () => void;
    onDuplicate: () => void;
    onDelete: () => void;
}

const StackCard: React.FC<StackCardProps> = ({
    stack, inferenceCount, actionNames, inferenceRunning, onRun, onEdit, onDuplicate, onDelete,
}) => {
    const stepsSummary = actionNames.join(' · ');
    const stepLabel = stack.steps.length === 1 ? '1 step' : `${stack.steps.length} steps`;
    const infLabel = inferenceCount === 1 ? '1 inference' : `${inferenceCount} inferences`;

    return (
        <div className={styles.card}>
            <div className={styles.top}>
                <span className={styles.icon}>{stack.icon}</span>
                <span className={styles.name}>{stack.name}</span>
            </div>
            <p className={styles.summary} title={stepsSummary}>{stepsSummary || '—'}</p>
            <div className={styles.badges}>
                <span className={styles.badge}>{stepLabel}</span>
                <span className={styles.badge}>{infLabel}</span>
            </div>
            <div className={styles.actions}>
                <button
                    className={styles.runBtn}
                    onClick={onRun}
                    disabled={inferenceRunning}
                    type="button"
                    aria-label={`Run ${stack.name}`}
                >
                    ▶ Run
                </button>
                <button
                    className={styles.editBtn}
                    onClick={onEdit}
                    type="button"
                    aria-label={`Edit ${stack.name}`}
                >
                    ✎ Edit
                </button>
                <DropdownMenu
                    trigger={
                        <button className={styles.menuBtn} type="button" aria-label={`More options for ${stack.name}`}>
                            ⋮
                        </button>
                    }
                    items={[
                        { label: 'Duplicate', icon: '⧉', onClick: onDuplicate },
                        { type: 'separator' },
                        { label: 'Delete', icon: '🗑', variant: 'danger', onClick: onDelete },
                    ]}
                />
            </div>
        </div>
    );
};

StackCard.displayName = 'StackCard';
export default StackCard;
