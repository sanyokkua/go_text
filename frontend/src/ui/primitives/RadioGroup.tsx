// frontend/src/ui/primitives/RadioGroup.tsx
import React from 'react';
import { Label, RadioGroup as RadixRadioGroup } from 'radix-ui';
import styles from './RadioGroup.module.css';

export interface RadioGroupItem {
    value: string;
    label: string;
    disabled?: boolean;
}

export interface RadioGroupProps {
    value: string;
    onValueChange: (value: string) => void;
    items: RadioGroupItem[];
    disabled?: boolean;
}

export const RadioGroup: React.FC<RadioGroupProps> = ({ value, onValueChange, items, disabled }) => (
    <RadixRadioGroup.Root className={styles.root} value={value} onValueChange={onValueChange} disabled={disabled}>
        {items.map((item) => (
            <div key={item.value} className={styles.row}>
                <RadixRadioGroup.Item value={item.value} id={`rg-${item.value}`} className={styles.item} disabled={item.disabled} aria-label={item.label}>
                    <RadixRadioGroup.Indicator className={styles.indicator} />
                </RadixRadioGroup.Item>
                <Label.Root htmlFor={`rg-${item.value}`} className={styles.label}>
                    {item.label}
                </Label.Root>
            </div>
        ))}
    </RadixRadioGroup.Root>
);

RadioGroup.displayName = 'RadioGroup';
