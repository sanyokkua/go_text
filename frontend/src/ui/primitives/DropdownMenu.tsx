// frontend/src/ui/primitives/DropdownMenu.tsx
import React from 'react';
import { DropdownMenu as RadixDropdown } from 'radix-ui';
import styles from './DropdownMenu.module.css';

export type DropdownMenuItem =
    | { type?: 'item'; label: string; icon?: string; onClick?: () => void; variant?: 'default' | 'danger'; disabled?: boolean }
    | { type: 'separator' };

export interface DropdownMenuProps {
    trigger: React.ReactElement;
    items: DropdownMenuItem[];
}

function renderDropdownItem(item: DropdownMenuItem, i: number): React.ReactElement {
    if (item.type === 'separator') {
        return <RadixDropdown.Separator key={`sep-${i}`} className={styles.separator} />;
    }
    const onClick = item.onClick;
    const onSelectProp = onClick ? { onSelect: () => onClick() } : {};
    const dangerClass = item.variant === 'danger' ? styles.danger : '';
    return (
        <RadixDropdown.Item
            key={item.label}
            className={`${styles.item} ${dangerClass}`}
            disabled={item.disabled ?? false}
            {...onSelectProp}
        >
            {item.icon && <span className={styles.icon}>{item.icon}</span>}
            {item.label}
        </RadixDropdown.Item>
    );
}

export const DropdownMenu: React.FC<DropdownMenuProps> = ({ trigger, items }) => (
    <RadixDropdown.Root>
        <RadixDropdown.Trigger asChild>{trigger}</RadixDropdown.Trigger>
        <RadixDropdown.Portal>
            <RadixDropdown.Content className={styles.content} sideOffset={4}>
                {items.map((item, i) => renderDropdownItem(item, i))}
            </RadixDropdown.Content>
        </RadixDropdown.Portal>
    </RadixDropdown.Root>
);

DropdownMenu.displayName = 'DropdownMenu';
