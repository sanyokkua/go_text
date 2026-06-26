// frontend/src/ui/primitives/ScrollArea.tsx
import React from 'react';
import { ScrollArea as RadixScrollArea } from 'radix-ui';
import styles from './ScrollArea.module.css';

export interface ScrollAreaProps {
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
}

export const ScrollArea: React.FC<ScrollAreaProps> = ({ children, className, style }) => (
    <RadixScrollArea.Root className={`${styles.root} ${className ?? ''}`} style={style}>
        <RadixScrollArea.Viewport className={styles.viewport}>
            {children}
        </RadixScrollArea.Viewport>
        <RadixScrollArea.Scrollbar className={styles.scrollbar} orientation="vertical">
            <RadixScrollArea.Thumb className={styles.thumb} />
        </RadixScrollArea.Scrollbar>
        <RadixScrollArea.Scrollbar className={`${styles.scrollbar} ${styles.horizontal}`} orientation="horizontal">
            <RadixScrollArea.Thumb className={styles.thumb} />
        </RadixScrollArea.Scrollbar>
        <RadixScrollArea.Corner />
    </RadixScrollArea.Root>
);

ScrollArea.displayName = 'ScrollArea';
