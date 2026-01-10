/**
 * Material-UI Theme Configuration
 *
 * Centralized theme definition for the application using Material-UI's createTheme.
 * Defines the visual design system including colors, typography, and component styles.
 *
 * Theme Features:
 * - Light mode color palette with primary/secondary colors
 * - Roboto font family for consistent typography
 * - Custom component styling overrides
 * - Accessible color contrast ratios
 */
import { createTheme } from '@mui/material/styles';

export const LIGHT_COLORS = {
    primary: { main: '#009688', light: '#4db6ac', dark: '#00796b' },
    secondary: { main: '#5e35b1', light: '#9575cd', dark: '#4527a0' },
    background: { default: '#e0f2f1', paper: '#b2dfdb' },
    customs: { White: 'white' },
};

export const theme = createTheme({
    palette: {
        mode: 'light',
        primary: { main: LIGHT_COLORS.primary.main, light: LIGHT_COLORS.primary.light, dark: LIGHT_COLORS.primary.dark },
        secondary: { main: LIGHT_COLORS.secondary.main, light: LIGHT_COLORS.secondary.light, dark: LIGHT_COLORS.secondary.dark },
        background: { default: LIGHT_COLORS.background.default, paper: LIGHT_COLORS.background.paper },
    },
    typography: { fontFamily: 'Roboto, sans-serif', h6: { fontWeight: 600 } },
    components: {
        MuiAppBar: { styleOverrides: { root: { boxShadow: 'inherit', backgroundColor: LIGHT_COLORS.primary.dark } } },
        MuiTabs: {
            styleOverrides: {
                root: { backgroundColor: LIGHT_COLORS.primary.dark },
                // Selected Tab Underline
                indicator: { backgroundColor: LIGHT_COLORS.customs.White },
            },
        },
        MuiTab: {
            styleOverrides: {
                root: {
                    // Text Color for NOT SELECTED tabs
                    'color': LIGHT_COLORS.customs.White,
                    'fontWeight': 'lighter',
                    '&.Mui-selected': {
                        // Text Color for SELECTED tab
                        color: LIGHT_COLORS.customs.White,
                        fontWeight: 'bold',
                    },
                },
            },
        },
        // MuiOutlinedInput: {
        //     styleOverrides: {
        //         root: {
        //             // The border color (default state)
        //             '& .MuiOutlinedInput-notchedOutline': {
        //                 //
        //                 borderColor: LIGHT_COLORS.secondary.main,
        //             },
        //             // Change border color on hover
        //             '&:hover:not(.Mui-disabled):not(.Mui-focused) .MuiOutlinedInput-notchedOutline': {
        //                 //
        //                 borderColor: LIGHT_COLORS.secondary.main,
        //             },
        //             // Change border color when focused
        //             '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
        //                 //
        //                 borderColor: LIGHT_COLORS.secondary.dark,
        //                 borderWidth: 2,
        //             },
        //         },
        //     },
        // },
        // MuiInputBase: {
        //     styleOverrides: {
        //         root: {
        //             color: LIGHT_COLORS.secondary.main, // Text inside the input
        //         },
        //     },
        // },
        // MuiInputLabel: {
        //     styleOverrides: {
        //         root: {
        //             'color': LIGHT_COLORS.secondary.main, // Default label color
        //             '&.Mui-focused': {
        //                 color: LIGHT_COLORS.secondary.dark, // Focused label color
        //             },
        //         },
        //     },
        // },
        // MuiFormHelperText: {
        //     styleOverrides: {
        //         root: {
        //             color: LIGHT_COLORS.secondary.main, // Helper text color
        //         },
        //     },
        // },
        // MuiInputAdornment: {
        //     styleOverrides: {
        //         root: {
        //             color: LIGHT_COLORS.secondary.main, // Text/icons inside adornments
        //         },
        //     },
        // },
        // MuiSelect: {
        //     styleOverrides: {
        //         icon: {
        //             color: LIGHT_COLORS.secondary.main, // Dropdown arrow color
        //         },
        //         root: {
        //             //
        //             'color': LIGHT_COLORS.secondary.main,
        //             '&.Mui-focused': { color: LIGHT_COLORS.secondary.dark },
        //         },
        //     },
        // },
        // MuiMenuItem: {
        //     styleOverrides: {
        //         root: {
        //             color: LIGHT_COLORS.secondary.main, // Dropdown items text color
        //         },
        //     },
        // },
        // MuiCheckbox: {
        //     styleOverrides: {
        //         root: {
        //             'color': LIGHT_COLORS.secondary.main, // 1. Unchecked box color
        //
        //             '&.Mui-checked': {
        //                 color: LIGHT_COLORS.secondary.main, // 2. Checked box background color
        //             },
        //
        //             '&:hover': {
        //                 backgroundColor: alpha(LIGHT_COLORS.secondary.main, 0.04), // 3. Hover state for unchecked box
        //             },
        //
        //             '&.Mui-checked:hover': {
        //                 background: alpha(LIGHT_COLORS.secondary.main, 0.08), // 4. Hover state for checked box
        //             },
        //         },
        //     },
        // },
        // MuiSlider: {
        //     styleOverrides: {
        //         root: {
        //             color: LIGHT_COLORS.secondary.main,
        //         }
        //     }
        // },
    },
});

export default theme;
