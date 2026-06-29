// frontend/src/ui/primitives/Popover.tsx
import { Popover as RadixPopover } from 'radix-ui';
import React from 'react';
import styles from './Popover.module.css';

export interface PopoverProps {
    trigger: React.ReactElement;
    children: React.ReactNode;
    align?: 'start' | 'center' | 'end';
    side?: 'top' | 'right' | 'bottom' | 'left';
}

// A non-modal popover whose content is portaled. Non-modal is required so a nested
// Radix Select can open without the Select's portal counting as an outside
// interaction that closes this popover.
export const Popover: React.FC<PopoverProps> = ({ trigger, children, align = 'start', side = 'bottom' }) => (
    <RadixPopover.Root modal={false}>
        <RadixPopover.Trigger asChild>{trigger}</RadixPopover.Trigger>
        <RadixPopover.Portal>
            <RadixPopover.Content
                className={styles.content}
                align={align}
                side={side}
                sideOffset={6}
                // Ignore pointer events that originate inside another Radix portal
                // (e.g. a Select dropdown) so opening the inner Select does not
                // dismiss this popover.
                onInteractOutside={(event) => {
                    const target = event.target as HTMLElement | null;
                    if (target?.closest('[data-radix-popper-content-wrapper]')) {
                        event.preventDefault();
                    }
                }}
            >
                {children}
            </RadixPopover.Content>
        </RadixPopover.Portal>
    </RadixPopover.Root>
);

Popover.displayName = 'Popover';
