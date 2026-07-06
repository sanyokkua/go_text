// frontend/src/ui/components/Button.tsx
import React from 'react';
import styles from './Button.module.css';

type ButtonVariant = 'primary' | 'default' | 'ghost' | 'danger';
type ButtonSize = 'default' | 'sm';

export interface ButtonProps {
    'variant'?: ButtonVariant;
    'size'?: ButtonSize;
    'disabled'?: boolean;
    'type'?: 'button' | 'submit' | 'reset';
    'onClick'?: () => void;
    'children': React.ReactNode;
    'className'?: string;
    'aria-label'?: string;
}

export const Button: React.FC<ButtonProps> = ({
    variant = 'default',
    size = 'default',
    disabled = false,
    type = 'button',
    onClick,
    children,
    className,
    'aria-label': ariaLabel,
}) => {
    const cls = [styles.btn, variant !== 'default' ? styles[variant] : undefined, size === 'sm' ? styles.sm : undefined, className]
        .filter(Boolean)
        .join(' ');
    return (
        <button type={type} className={cls} disabled={disabled} onClick={onClick} aria-label={ariaLabel}>
            {children}
        </button>
    );
};

Button.displayName = 'Button';
