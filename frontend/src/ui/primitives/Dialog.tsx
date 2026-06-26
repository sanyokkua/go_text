// frontend/src/ui/primitives/Dialog.tsx
import React from 'react';
import { Dialog as RadixDialog } from 'radix-ui';
import styles from './Dialog.module.css';

export interface DialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title?: string;
    description?: string;
    children: React.ReactNode;
}

export const Dialog: React.FC<DialogProps> = ({ open, onOpenChange, title, description, children }) => (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
        <RadixDialog.Portal>
            <RadixDialog.Overlay className={styles.overlay} />
            <RadixDialog.Content className={styles.content}>
                {title && <RadixDialog.Title className={styles.title}>{title}</RadixDialog.Title>}
                {description && <RadixDialog.Description className={styles.description}>{description}</RadixDialog.Description>}
                {children}
            </RadixDialog.Content>
        </RadixDialog.Portal>
    </RadixDialog.Root>
);

Dialog.displayName = 'Dialog';
