// frontend/src/ui/components/IconButton.tsx
import React from 'react';
import styles from './IconButton.module.css';

export interface IconButtonProps {
    'on'?: boolean;
    'compact'?: boolean;
    'disabled'?: boolean;
    'aria-label': string;
    'onClick'?: () => void;
    'children': React.ReactNode;
    'className'?: string;
}

export const IconButton: React.FC<IconButtonProps> = ({
    on = false,
    compact = false,
    disabled = false,
    'aria-label': ariaLabel,
    onClick,
    children,
    className,
}) => {
    const cls = [styles.iconbtn, on ? styles.on : undefined, compact ? styles.compact : undefined, className].filter(Boolean).join(' ');
    return (
        <button type="button" className={cls} disabled={disabled} aria-label={ariaLabel} aria-pressed={on} onClick={onClick}>
            {children}
        </button>
    );
};

IconButton.displayName = 'IconButton';
