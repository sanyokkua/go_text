// frontend/src/ui/primitives/Select.tsx
import React from 'react';
import { Select as RadixSelect } from 'radix-ui';
import styles from './Select.module.css';

export type SelectItem =
    | { type?: 'item'; value: string; label: string; tag?: string; disabled?: boolean }
    | { type: 'separator' };

export interface SelectProps {
    value: string;
    onValueChange: (value: string) => void;
    items: SelectItem[];
    placeholder?: string;
    keyLabel?: string;
    accent?: boolean;
    disabled?: boolean;
}

export const Select: React.FC<SelectProps> = ({ value, onValueChange, items, placeholder, keyLabel, accent, disabled }) => (
    <RadixSelect.Root value={value} onValueChange={onValueChange} disabled={disabled}>
        <RadixSelect.Trigger
            className={`${styles.trigger} ${accent ? styles.accent : ''}`}
            aria-label={keyLabel ?? placeholder ?? 'Select'}
        >
            {keyLabel && <span className={styles.keyLabel}>{keyLabel}</span>}
            <RadixSelect.Value placeholder={placeholder} />
            <RadixSelect.Icon className={styles.caret}>▾</RadixSelect.Icon>
        </RadixSelect.Trigger>

        <RadixSelect.Portal>
            <RadixSelect.Content className={styles.content} position="popper" sideOffset={4}>
                <RadixSelect.ScrollUpButton className={styles.scrollBtn}>▴</RadixSelect.ScrollUpButton>
                <RadixSelect.Viewport className={styles.viewport}>
                    {items.map((item, i) => {
                        if (item.type === 'separator') {
                            const prevItem = items[i - 1];
                            const sepKey = prevItem && prevItem.type !== 'separator' ? `sep-after-${prevItem.value}` : `sep-${i}`;
                            return <RadixSelect.Separator key={sepKey} className={styles.separator} />;
                        }
                        return (
                            <RadixSelect.Item key={item.value} value={item.value} disabled={item.disabled} className={styles.item}>
                                <RadixSelect.ItemIndicator className={styles.indicator}>●</RadixSelect.ItemIndicator>
                                <RadixSelect.ItemText>{item.label}</RadixSelect.ItemText>
                                {item.tag && <span className={styles.tag}>{item.tag}</span>}
                            </RadixSelect.Item>
                        );
                    })}
                </RadixSelect.Viewport>
                <RadixSelect.ScrollDownButton className={styles.scrollBtn}>▾</RadixSelect.ScrollDownButton>
            </RadixSelect.Content>
        </RadixSelect.Portal>
    </RadixSelect.Root>
);

Select.displayName = 'Select';
