// frontend/src/ui/components/Chip.tsx
import React from 'react';
import styles from './Chip.module.css';

export interface ChipProps {
    variant?: 'default' | 'accent' | 'purple';
    onRemove?: () => void;
    children: React.ReactNode;
}

export const Chip: React.FC<ChipProps> = ({ variant = 'default', onRemove, children }) => {
    const cls = [styles.chip, variant !== 'default' ? styles[variant] : undefined].filter(Boolean).join(' ');
    return (
        <span className={cls}>
            {children}
            {onRemove && (
                <button type="button" className={styles.remove} onClick={onRemove} aria-label="Remove">
                    ✕
                </button>
            )}
        </span>
    );
};

Chip.displayName = 'Chip';
