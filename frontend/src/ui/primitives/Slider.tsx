// frontend/src/ui/primitives/Slider.tsx
import React from 'react';
import { Slider as RadixSlider } from 'radix-ui';
import styles from './Slider.module.css';

export interface SliderProps {
    value: number[];
    onValueChange: (value: number[]) => void;
    min?: number;
    max?: number;
    step?: number;
    disabled?: boolean;
}

export const Slider: React.FC<SliderProps> = ({ value, onValueChange, min = 0, max = 100, step = 1, disabled }) => (
    <RadixSlider.Root
        className={styles.root}
        value={value}
        onValueChange={onValueChange}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
    >
        <RadixSlider.Track className={styles.track}>
            <RadixSlider.Range className={styles.range} />
        </RadixSlider.Track>
        <RadixSlider.Thumb className={styles.thumb} aria-label="Value" />
    </RadixSlider.Root>
);

Slider.displayName = 'Slider';
