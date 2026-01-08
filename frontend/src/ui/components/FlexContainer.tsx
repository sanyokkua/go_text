import { Box, BoxProps, SxProps, Theme } from '@mui/material';
import React from 'react';

/**
 * FlexContainer Props
 * Extends BoxProps with additional flex-specific properties
 */
interface FlexContainerProps extends BoxProps {
    /**
     * Flex direction - defaults to 'column'
     */
    direction?: 'row' | 'column';

    /**
     * Whether to handle overflow by hiding it - defaults to true
     */
    overflowHidden?: boolean;

    /**
     * Whether the container should grow to fill available space - defaults to false
     */
    grow?: boolean;

    /**
     * Gap between flex items
     */
    gap?: number | string;
}

/**
 * FlexContainer - A reusable flex container component
 * Handles common flex layout patterns with proper overflow management
 *
 * Features:
 * - Automatic minHeight/minWidth handling to prevent flex overflow issues
 * - Configurable direction (row/column)
 * - Overflow management
 * - Flex grow behavior
 * - Gap spacing
 * - Full Box component props support
 */
const FlexContainer: React.FC<FlexContainerProps> = ({ direction = 'column', overflowHidden = true, grow = false, gap, children, sx, ...props }) => {
    // Base styles
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
