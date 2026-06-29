// frontend/src/ui/components/IconButton.tsx
import React from 'react';
import styles from './IconButton.module.css';

export interface IconButtonProps {
    /** Toggle state. When provided, the button advertises aria-pressed and the active style. */
    'on'?: boolean;
    'compact'?: boolean;
    'disabled'?: boolean;
    'aria-label': string;
    'onClick'?: () => void;
    'children': React.ReactNode;
    'className'?: string;
}

// forwardRef is required so Radix `asChild` triggers (Tooltip, etc.) can anchor to the
// underlying <button>. Without it the ref is dropped and tooltip positioning breaks.
export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
    ({ on, compact = false, disabled = false, 'aria-label': ariaLabel, onClick, children, className, ...rest }, ref) => {
        const isToggle = on !== undefined;
        const cls = [styles.iconbtn, on ? styles.on : undefined, compact ? styles.compact : undefined, className].filter(Boolean).join(' ');
        return (
            <button
                {...rest}
                ref={ref}
                type="button"
                className={cls}
                disabled={disabled}
                aria-label={ariaLabel}
                // Only emit aria-pressed for genuine toggle buttons; action buttons
                // (settings, info, refresh, ⌘K) must not advertise a pressed state.
                aria-pressed={isToggle ? on : undefined}
                onClick={onClick}
            >
                {children}
            </button>
        );
    },
);

IconButton.displayName = 'IconButton';
