// frontend/src/ui/components/Card.tsx
import React from 'react';
import styles from './Card.module.css';

export interface CardProps {
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
}

export const Card: React.FC<CardProps> = ({ children, className, style }) => {
    const cls = [styles.card, className].filter(Boolean).join(' ');
    return <div className={cls} style={style}>{children}</div>;
};

Card.displayName = 'Card';
