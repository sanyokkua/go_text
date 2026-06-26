export type ThemeMode = 'auto' | 'light' | 'dark';
export type ThemeEffective = 'light' | 'dark';

export interface ThemeState {
    mode: ThemeMode;
    effective: ThemeEffective;
}
