import { Box, BoxProps, SxProps, Theme } from '@mui/material';
import React from 'react';

/**
 * FlexContainer Props
 * Extends BoxProps with flex layout properties
 */
interface FlexContainerProps extends BoxProps {
    direction?: 'row' | 'column';
    overflowHidden?: boolean;
    grow?: boolean;
    gap?: number | string;
}

/**
 * FlexContainer - A reusable flex container component
 *
 * Solves common flex layout issues with automatic overflow handling.
 * Key feature: Automatic minHeight/minWidth to prevent flex overflow problems.
 *
 * Use Cases:
 * - Scrollable containers within flex layouts
 * - Nested flex layouts with proper overflow handling
 * - Responsive layouts requiring flex grow behavior
 */
const FlexContainer: React.FC<FlexContainerProps> = ({ direction = 'column', overflowHidden = true, grow = false, gap, children, sx, ...props }) => {
    // Base styles with automatic overflow handling
    const baseStyles: SxProps<Theme> = {
        display: 'flex',
        flexDirection: direction,
        ...(overflowHidden && { overflow: 'hidden', ...(direction === 'column' ? { minHeight: 0 } : { minWidth: 0 }) }),
        ...(grow && { flex: 1 }),
        ...(gap !== undefined && { gap }),
    };

    // Merge with additional sx props
    const mergedStyles = sx ? { ...baseStyles, ...sx } : baseStyles;

    return (
        <Box sx={mergedStyles} {...props}>
            {children}
        </Box>
    );
};

FlexContainer.displayName = 'FlexContainer';
export default FlexContainer;
