// frontend/src/ui/primitives/Tooltip.tsx
import { Tooltip as RadixTooltip } from 'radix-ui';
import React from 'react';
import styles from './Tooltip.module.css';

export const TooltipProvider: React.FC<{ children: React.ReactNode; delayDuration?: number }> = ({ children, delayDuration = 200 }) => (
    <RadixTooltip.Provider delayDuration={delayDuration}>{children}</RadixTooltip.Provider>
);

TooltipProvider.displayName = 'TooltipProvider';

export interface TooltipProps {
    content: string;
    children: React.ReactElement;
    side?: 'top' | 'right' | 'bottom' | 'left';
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children, side = 'bottom' }) => (
    <RadixTooltip.Root>
        <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
        <RadixTooltip.Portal>
            <RadixTooltip.Content className={styles.content} side={side} sideOffset={6}>
                {content}
                <RadixTooltip.Arrow className={styles.arrow} />
            </RadixTooltip.Content>
        </RadixTooltip.Portal>
    </RadixTooltip.Root>
);

Tooltip.displayName = 'Tooltip';
