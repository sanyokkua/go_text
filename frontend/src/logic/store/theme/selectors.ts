import type { RootState } from '../index';
import type { ThemeEffective, ThemeMode } from './types';

export const selectThemeMode = (state: RootState): ThemeMode => state.theme.mode;

export const selectEffectiveTheme = (state: RootState): ThemeEffective => state.theme.effective;
