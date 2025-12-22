import React from 'react';
import { Color, Size } from '../../../logic/common/types';

type Variant = 'solid' | 'outlined' | 'dashed' | 'filled' | 'text' | 'link';

interface ButtonProps {
    text: string;
    onClick?: () => void;
    variant?: Variant;
    size?: Size;
    colorStyle?: Color;
    danger?: boolean;
    disabled?: boolean;
    loading?: boolean;
    block?: boolean;
    type?: 'button' | 'submit' | 'reset';
}

const Button: React.FC<ButtonProps> = ({
    text,
    onClick,
    variant = 'solid',
    size = 'default',
    colorStyle = '',
    danger = false,
    disabled = false,
    loading = false,
    block = false,
    type = 'button',
}) => {
    const handle = (e: React.MouseEvent<HTMLButtonElement>) => {
        if (!disabled && !loading && onClick) {
            e.preventDefault();
            onClick();
        }
    };

    const classes = [
        'button-base',
        size !== 'default' && `button-${size}`,
        `button-${variant}`,
        danger && 'button-danger',
        disabled && 'button-disabled',
        loading && 'button-loading',
        block && 'button-block',
        colorStyle && `color-${colorStyle}`,
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <button type={type} onClick={handle} disabled={disabled || loading} className={classes}>
            {text}
        </button>
    );
};

Button.displayName = 'Button';
export default Button;
