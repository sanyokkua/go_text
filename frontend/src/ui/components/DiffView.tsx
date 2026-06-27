import { FC, useMemo } from 'react';
import { diffWords } from 'diff';
import { ClipboardServiceAdapter, getLogger } from '../../logic/adapter';
import styles from './DiffView.module.css';

const logger = getLogger('DiffView');

interface DiffViewProps {
    original: string;
    modified: string;
}

const DiffView: FC<DiffViewProps> = ({ original, modified }) => {
    const parts = useMemo(() => diffWords(original, modified), [original, modified]);

    const addedCount = useMemo(
        () => parts.filter((p) => p.added).reduce((n, p) => n + (p.value.trim().split(/\s+/).filter(Boolean).length), 0),
        [parts],
    );

    const removedCount = useMemo(
        () => parts.filter((p) => p.removed).reduce((n, p) => n + (p.value.trim().split(/\s+/).filter(Boolean).length), 0),
        [parts],
    );

    const handleCopyClean = async () => {
        try {
            await ClipboardServiceAdapter.setText(modified);
        } catch (err: unknown) {
            logger.logError(`Copy clean failed: ${String(err)}`);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.body}>
                {parts.map((part, i) => {
                    if (part.added) return <span key={i} className="ins">{part.value}</span>;
                    if (part.removed) return <span key={i} className="del">{part.value}</span>;
                    return <span key={i}>{part.value}</span>;
                })}
            </div>
            <div className={styles.footer}>
                <span className={styles.added}>+{addedCount} added</span>
                <span className={styles.removed}>−{removedCount} removed</span>
                <button
                    className={styles.copyClean}
                    onClick={handleCopyClean}
                    disabled={!modified}
                    aria-label="Copy clean output"
                >
                    ⧉ Copy clean
                </button>
            </div>
        </div>
    );
};

DiffView.displayName = 'DiffView';
export default DiffView;
