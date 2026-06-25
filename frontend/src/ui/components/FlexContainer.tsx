import React from 'react';

interface FlexContainerProps {
    direction?: 'row' | 'column';
    overflowHidden?: boolean;
    grow?: boolean;
    gap?: number | string;
    children?: React.ReactNode;
    style?: React.CSSProperties;
    className?: string;
    /** Accepted for backwards-compat with callers that pass sx; value is ignored. */
    sx?: Record<string, unknown>;
    [key: string]: unknown;
}

const FlexContainer: React.FC<FlexContainerProps> = ({
    direction = 'column',
    overflowHidden = true,
    grow = false,
    gap,
    children,
    style,
    className,
}) => {
    const computedStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: direction,
        ...(overflowHidden && {
            overflow: 'hidden',
            ...(direction === 'column' ? { minHeight: 0 } : { minWidth: 0 }),
        }),
        ...(grow && { flex: 1 }),
        ...(gap !== undefined && { gap: typeof gap === 'number' ? `${gap * 8}px` : gap }),
        ...style,
    };

    return (
        <div style={computedStyle} className={className}>
            {children}
        </div>
    );
};

FlexContainer.displayName = 'FlexContainer';
export default FlexContainer;
