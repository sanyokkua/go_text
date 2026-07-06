import React from 'react';
import { apperr } from '../../../../../wailsjs/go/models';
import styles from './HistoryEntryCard.module.css';

export interface HistoryEntryCardProps {
    entry: apperr.HistoryEntry;
    isSelected: boolean;
    onRestore: () => void;
    onDelete: () => void;
}

function formatTimeAgo(createdAt: number): string {
    const diffMs = Date.now() - createdAt * 1000;
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return `${Math.floor(diffHr / 24)}d ago`;
}

function buildPreview(entry: apperr.HistoryEntry): string {
    const input = entry.inputText.slice(0, 60).replace(/\s+/g, ' ').trim();
    const output = entry.outputText.slice(0, 60).replace(/\s+/g, ' ').trim();
    if (!input && !output) return '—';
    if (!output) return input;
    return `${input}… → ${output}…`;
}

const statusModifier = (status: string): string | null => {
    if (status === 'partial') return styles.partial;
    if (status !== 'success') return styles.error;
    return null;
};

const badgeClass = (status: string): string => {
    if (status === 'success') return `${styles.badge} ${styles.success}`;
    return [styles.badge, statusModifier(status)].filter(Boolean).join(' ');
};

const metaTextClass = (status: string): string => [styles.metaText, statusModifier(status)].filter(Boolean).join(' ');

const HistoryEntryCard: React.FC<HistoryEntryCardProps> = ({ entry, isSelected, onRestore, onDelete }) => {
    const infLabel = `${entry.inferences} INF`;
    const cardClass = [styles.card, isSelected && styles.selected].filter(Boolean).join(' ');

    return (
        <div className={cardClass}>
            <div className={styles.header}>
                <span className={styles.title} title={entry.title}>
                    {entry.title}
                </span>
                <span className={badgeClass(entry.status)} aria-label={`${infLabel} · ${entry.status}`}>
                    {infLabel}
                </span>
            </div>

            <p className={styles.preview}>{buildPreview(entry)}</p>

            <div className={styles.meta}>
                <span className={styles.metaText}>{formatTimeAgo(entry.createdAt)}</span>
                <span className={styles.metaSep} aria-hidden="true">
                    ·
                </span>
                <span className={metaTextClass(entry.status)}>{entry.status}</span>
                <span className={styles.metaSep} aria-hidden="true">
                    ·
                </span>
                <button
                    className={styles.actionBtn}
                    type="button"
                    aria-label={`Restore entry ${entry.title}`}
                    onClick={(e) => {
                        e.stopPropagation();
                        onRestore();
                    }}
                >
                    ↺ restore
                </button>
                <span className={styles.metaSep} aria-hidden="true">
                    ·
                </span>
                <button
                    className={styles.actionBtn}
                    type="button"
                    aria-label={`Delete entry ${entry.title}`}
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete();
                    }}
                >
                    🗑
                </button>
            </div>
        </div>
    );
};

HistoryEntryCard.displayName = 'HistoryEntryCard';
export default HistoryEntryCard;
