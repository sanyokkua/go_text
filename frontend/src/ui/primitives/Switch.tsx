// frontend/src/ui/primitives/Switch.tsx
import { Switch as RadixSwitch } from 'radix-ui';
import React from 'react';
import styles from './Switch.module.css';

export interface SwitchProps {
    'checked': boolean;
    'onCheckedChange': (checked: boolean) => void;
    'disabled'?: boolean;
    'id'?: string;
    'aria-label'?: string;
}

export const Switch: React.FC<SwitchProps> = ({ checked, onCheckedChange, disabled, id, 'aria-label': ariaLabel }) => (
    <RadixSwitch.Root id={id} className={styles.root} checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} aria-label={ariaLabel}>
        <RadixSwitch.Thumb className={styles.thumb} />
    </RadixSwitch.Root>
);

Switch.displayName = 'Switch';
