// frontend/src/ui/components/Badge.tsx
import React from 'react';
import styles from './Badge.module.css';

export interface BadgeProps {
    variant?: 'default' | 'ok';
    children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({ variant = 'default', children }) => {
    const cls = [styles.badge, variant !== 'default' ? styles[variant] : undefined].filter(Boolean).join(' ');
    return <span className={cls}>{children}</span>;
};

Badge.displayName = 'Badge';
