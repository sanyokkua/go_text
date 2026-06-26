// frontend/src/ui/primitives/Toast.tsx
import React from 'react';
import { Toast as RadixToast } from 'radix-ui';
import styles from './Toast.module.css';

export type ToastVariant = 'success' | 'error' | 'warning' | 'progress';

export interface ToastItem {
    id: string;
    variant?: ToastVariant;
    message: string;
    duration?: number;
}

export const ToastProvider: React.FC<{ children: React.ReactNode; swipeDirection?: 'right' | 'left' | 'up' | 'down' }> = ({
    children,
    swipeDirection = 'right',
}) => <RadixToast.Provider swipeDirection={swipeDirection}>{children}</RadixToast.Provider>;

ToastProvider.displayName = 'ToastProvider';

const VARIANT_ICONS: Record<ToastVariant, string> = {
    success: '✓',
    error: '⚠',
    warning: '⚠',
    progress: '◌',
};

interface SingleToastProps extends ToastItem {
    onDismiss: (id: string) => void;
}

const SingleToast: React.FC<SingleToastProps> = ({ id, variant = 'success', message, duration = 5000, onDismiss }) => (
    <RadixToast.Root
        className={`${styles.root} ${styles[variant]}`}
        duration={duration}
        onOpenChange={(open) => { if (!open) onDismiss(id); }}
        open
    >
        <RadixToast.Description className={styles.body}>
            <span className={styles.glyph} aria-hidden>{VARIANT_ICONS[variant]}</span>
            {message}
        </RadixToast.Description>
        <RadixToast.Close asChild>
            <button type="button" className={styles.close} aria-label="Dismiss notification">✕</button>
        </RadixToast.Close>
    </RadixToast.Root>
);

SingleToast.displayName = 'SingleToast';

export interface ToastRegionProps {
    items: ToastItem[];
    onDismiss: (id: string) => void;
}

export const ToastRegion: React.FC<ToastRegionProps> = ({ items, onDismiss }) => (
    <>
        {items.map((item) => (
            <SingleToast key={item.id} {...item} onDismiss={onDismiss} />
        ))}
        <RadixToast.Viewport className={styles.viewport} />
    </>
);

ToastRegion.displayName = 'ToastRegion';
