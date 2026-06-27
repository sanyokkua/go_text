import { RootState } from '../index';
import { CurrentView, ThemeEffective, ThemeMode } from './types';

export const selectLayout = (state: RootState): 'side' | 'stacked' => state.ui.layout;
export const selectSidebarCollapsed = (state: RootState): boolean => state.ui.sidebarCollapsed;
export const selectHistoryOpen = (state: RootState): boolean => state.ui.historyOpen;
export const selectInferenceRunning = (state: RootState): boolean => state.ui.inferenceRunning;
export const selectThemeMode = (state: RootState): ThemeMode => state.ui.theme.mode;
export const selectEffectiveTheme = (state: RootState): ThemeEffective => state.ui.theme.effective;
export const selectCurrentView = (state: RootState): CurrentView => state.ui.currentView;
export const selectArmedActionId = (state: RootState): string | null => state.ui.armedActionId;
export const selectActiveActionsTab = (state: RootState): string | null => state.ui.activeActionsTab;

// Backward-compat alias — replaces the v2 `selectIsAppBusy` across old components
export const selectIsAppBusy = selectInferenceRunning;
