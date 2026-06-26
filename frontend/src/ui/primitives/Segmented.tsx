// frontend/src/ui/primitives/Segmented.tsx
import React from 'react';
import { ToggleGroup } from 'radix-ui';
import styles from './Segmented.module.css';

export interface SegmentedItem {
    value: string;
    label: React.ReactNode;
    'aria-label'?: string;
}

export interface SegmentedProps {
    value: string;
    onValueChange: (value: string) => void;
    items: SegmentedItem[];
    disabled?: boolean;
}

export const Segmented: React.FC<SegmentedProps> = ({ value, onValueChange, items, disabled }) => (
    <ToggleGroup.Root
        type="single"
        className={styles.root}
        value={value}
        onValueChange={(v) => { if (v) onValueChange(v); }}
        disabled={disabled}
    >
        {items.map((item) => (
            <ToggleGroup.Item
                key={item.value}
                value={item.value}
                className={styles.item}
                aria-label={item['aria-label']}
            >
                {item.label}
            </ToggleGroup.Item>
        ))}
    </ToggleGroup.Root>
);

Segmented.displayName = 'Segmented';
