// frontend/src/ui/primitives/Tabs.tsx
import { Tabs as RadixTabs } from 'radix-ui';
import React from 'react';
import styles from './Tabs.module.css';

export interface TabDef {
    value: string;
    label: string;
    content: React.ReactNode;
}

export interface TabsProps {
    value: string;
    onValueChange: (value: string) => void;
    tabs: TabDef[];
    orientation?: 'horizontal' | 'vertical';
}

export const Tabs: React.FC<TabsProps> = ({ value, onValueChange, tabs, orientation = 'horizontal' }) => (
    <RadixTabs.Root
        className={`${styles.root} ${orientation === 'vertical' ? styles.vertical : ''}`}
        value={value}
        onValueChange={onValueChange}
        orientation={orientation}
    >
        <RadixTabs.List className={styles.list} aria-label="Navigation tabs">
            {tabs.map((tab) => (
                <RadixTabs.Trigger key={tab.value} value={tab.value} className={styles.trigger}>
                    {tab.label}
                </RadixTabs.Trigger>
            ))}
        </RadixTabs.List>
        {tabs.map((tab) => (
            <RadixTabs.Content key={tab.value} value={tab.value} className={styles.content}>
                {tab.content}
            </RadixTabs.Content>
        ))}
    </RadixTabs.Root>
);

Tabs.displayName = 'Tabs';
