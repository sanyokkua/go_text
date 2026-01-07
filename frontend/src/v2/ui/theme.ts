import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
    palette: {
        mode: 'light',
        primary: { main: '#1976d2', light: '#42a5f5', dark: '#1565c0' },
        secondary: { main: '#9c27b0', light: '#ba68c8', dark: '#7b1fa2' },
        background: { default: '#f5f5f5', paper: '#ffffff' },
        text: { primary: '#212121', secondary: '#757575' },
    },
    typography: { fontFamily: 'Roboto, sans-serif', h6: { fontWeight: 600 } },
    components: {
        MuiAppBar: { styleOverrides: { root: { boxShadow: 'inherit' } } },
        // MuiPaper: {
        //     styleOverrides: {
        //         root: { boxShadow: '0px 2px 4px -1px rgba(0,0,0,0.2), 0px 4px 5px 0px rgba(0,0,0,0.14), 0px 1px 10px 0px rgba(0,0,0,0.12)' },
        //     },
        // },
    },
});

export default theme;
