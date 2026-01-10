/**
 * UI Constants and Common Styles
 * Centralized location for shared UI constants, styles, and configurations
 */

/**
 * Height constants for consistent layout calculations
 */
export const UI_HEIGHTS = { APP_BAR: '6vh', STATUS_BAR: '4vh', ACTIONS_PANEL: '30vh' };

/**
 * Common flex container styles
 */
export const FLEX_STYLES = {
    /**
     * Flex column container with overflow handling
     * Prevents flex item overflow issues
     */
    COLUMN_OVERFLOW: {
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        minHeight: 0, // Critical for flex children to respect height constraints
    },

    /**
     * Flex container that takes remaining space
     */
    FLEX_GROW: {
        flex: 1,
        minHeight: 0, // Important for flex children
        overflow: 'hidden',
    },
};


/**
 * Height calculation utilities
 */
export const HEIGHT_UTILS = {
    /**
     * Calculate the main content area height
     * @returns CSS calc string for content area height
     */
    contentAreaHeight: (): string => {
        return `calc(100vh - ${UI_HEIGHTS.APP_BAR} - ${UI_HEIGHTS.STATUS_BAR})`;
    },

    /**
     * Calculate the editors area height
     * @returns CSS calc string for editors height
     */
    editorsHeight: (): string => {
        return `calc(${HEIGHT_UTILS.contentAreaHeight()} - ${UI_HEIGHTS.ACTIONS_PANEL})`;
    },
};

/**
 * Common spacing values
 */
export const SPACING = { STANDARD: 2, SMALL: 1, LARGE: 3 };
