// backward-compat re-exports — theme is now part of the ui slice
export { setThemeEffective as setEffective, setThemeMode as setMode } from '../ui/slice';
export { selectEffectiveTheme, selectThemeMode } from '../ui/selectors';
export * from './types';
