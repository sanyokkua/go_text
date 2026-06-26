// frontend/src/ui/primitives/AlertDialog.tsx
import React from 'react';
import { AlertDialog as RadixAlertDialog } from 'radix-ui';
import { Button } from '../components/Button';
import styles from './AlertDialog.module.css';

export interface AlertDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: string;
    confirmLabel: string;
    cancelLabel?: string;
    onConfirm: () => void;
    variant?: 'default' | 'danger';
}

export const AlertDialog: React.FC<AlertDialogProps> = ({
    open,
    onOpenChange,
    title,
    description,
    confirmLabel,
    cancelLabel = 'Cancel',
    onConfirm,
    variant = 'default',
}) => (
    <RadixAlertDialog.Root open={open} onOpenChange={onOpenChange}>
        <RadixAlertDialog.Portal>
            <RadixAlertDialog.Overlay className={styles.overlay} />
            <RadixAlertDialog.Content className={styles.content}>
                <RadixAlertDialog.Title className={`${styles.title} ${variant === 'danger' ? styles.dangerTitle : ''}`}>
                    {title}
                </RadixAlertDialog.Title>
                <RadixAlertDialog.Description className={styles.description}>
                    {description}
                </RadixAlertDialog.Description>
                <div className={styles.actions}>
                    <RadixAlertDialog.Cancel asChild>
                        <Button variant="ghost" size="sm">{cancelLabel}</Button>
                    </RadixAlertDialog.Cancel>
                    <RadixAlertDialog.Action asChild>
                        <Button variant={variant === 'danger' ? 'danger' : 'primary'} size="sm" onClick={onConfirm}>
                            {confirmLabel}
                        </Button>
                    </RadixAlertDialog.Action>
                </div>
            </RadixAlertDialog.Content>
        </RadixAlertDialog.Portal>
    </RadixAlertDialog.Root>
);

AlertDialog.displayName = 'AlertDialog';
