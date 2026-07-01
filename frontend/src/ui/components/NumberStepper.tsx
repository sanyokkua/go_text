import React from 'react';

import styles from './NumberStepper.module.css';

interface NumberStepperProps {
    'value': number;
    'onChange': (next: number) => void;
    'min': number;
    'max': number;
    'step'?: number;
    'disabled'?: boolean;
    'aria-label': string;
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

/**
 * Numeric input flanked by −/+ buttons. Mirrors the mockup's "− value +" stepper.
 * Out-of-range typed input is clamped to [min, max] on change; non-numeric input is ignored.
 */
export const NumberStepper: React.FC<NumberStepperProps> = ({ value, onChange, min, max, step = 1, disabled = false, 'aria-label': ariaLabel }) => {
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
        const parsed = Number.parseInt(e.target.value, 10);
        if (!Number.isNaN(parsed)) {
            onChange(clamp(parsed, min, max));
        }
    };

    return (
        <div className={styles.stepper}>
            <button
                type="button"
                className={styles.stepBtn}
                onClick={() => onChange(clamp(value - step, min, max))}
                disabled={disabled || value <= min}
                aria-label={`Decrease ${ariaLabel}`}
            >
                −
            </button>
            <input
                type="number"
                className={styles.input}
                value={value}
                min={min}
                max={max}
                step={step}
                disabled={disabled}
                onChange={handleInputChange}
                aria-label={ariaLabel}
            />
            <button
                type="button"
                className={styles.stepBtn}
                onClick={() => onChange(clamp(value + step, min, max))}
                disabled={disabled || value >= max}
                aria-label={`Increase ${ariaLabel}`}
            >
                +
            </button>
        </div>
    );
};

NumberStepper.displayName = 'NumberStepper';
