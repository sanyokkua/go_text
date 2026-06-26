import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { ThemeEffective, ThemeMode, ThemeState } from './types';

const initialState: ThemeState = {
    mode: 'auto',
    effective: 'light',
};

const themeSlice = createSlice({
    name: 'theme',
    initialState,
    reducers: {
        setMode(state, action: PayloadAction<ThemeMode>) {
            state.mode = action.payload;
        },
        setEffective(state, action: PayloadAction<ThemeEffective>) {
            state.effective = action.payload;
        },
    },
});

export const { setMode, setEffective } = themeSlice.actions;
export default themeSlice.reducer;
