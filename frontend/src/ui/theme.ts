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

export const theme = createTheme({
    palette: {
        mode: 'light',
        primary: { main: '#009688', light: '#4db6ac', dark: '#00796b' },
        secondary: { main: '#455a64', light: '#607d8b', dark: '#37474f' },
        background: { default: '#E0F2F1', paper: '#B2DFDB' },
    },
    typography: { fontFamily: 'Roboto, sans-serif', h6: { fontWeight: 600 } },
    components: {
        MuiAppBar: { styleOverrides: { root: { boxShadow: 'inherit', backgroundColor: '#00796b' } } },
        MuiTabs: {
            styleOverrides: {
                root: { backgroundColor: '#009688' },
                // Selected Tab Underline
                indicator: { backgroundColor: 'white' },
            },
        },
        MuiTab: {
            styleOverrides: {
                root: {
                    // Text Color for NOT SELECTED tabs
                    'color': 'black',
                    '&.Mui-selected': {
                        // Text Color for SELECTED tab
                        color: 'white',
                        fontWeight: 'bold',
                    },
                },
            },
        },
    },
});

export default theme;
