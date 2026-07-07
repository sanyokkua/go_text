import { createSelector } from '@reduxjs/toolkit';

import { AppBarVisibilityConfig } from '../../adapter/models';
import { RootState } from '../index';
import { CurrentView, ThemeEffective, ThemeMode } from './types';

export const selectLayout = (state: RootState): 'side' | 'stacked' => state.ui.layout;
export const selectSidebarCollapsed = (state: RootState): boolean => state.ui.sidebarCollapsed;
export const selectHistoryOpen = (state: RootState): boolean => state.ui.historyOpen;
export const selectPaletteOpen = (state: RootState): boolean => state.ui.paletteOpen ?? false;
export const selectInferenceRunning = (state: RootState): boolean => state.ui.inferenceRunning;
export const selectThemeMode = (state: RootState): ThemeMode => state.ui.theme.mode;
export const selectEffectiveTheme = (state: RootState): ThemeEffective => state.ui.theme.effective;
export const selectCurrentView = (state: RootState): CurrentView => state.ui.currentView;
export const selectArmedActionId = (state: RootState): string | null => state.ui.armedActionId;
export const selectArmedStackId = (state: RootState): string | null => state.ui.armedStackId;
export const selectActiveActionsTab = (state: RootState): string | null => state.ui.activeActionsTab;

/** The single armed run-target: a stack, an action, or nothing. Action and stack are mutually exclusive. */
export type ArmedTarget = { kind: 'stack'; id: string } | { kind: 'action'; id: string } | { kind: 'none' };

export const selectArmedTarget = createSelector([selectArmedStackId, selectArmedActionId], (armedStackId, armedActionId): ArmedTarget => {
    if (armedStackId !== null) return { kind: 'stack', id: armedStackId };
    if (armedActionId !== null) return { kind: 'action', id: armedActionId };
    return { kind: 'none' };
});

export const selectBuildMode = (state: RootState): boolean => state.ui.buildMode;
export const selectEditingStackId = (state: RootState): string | null => state.ui.editingStackId;
export const selectActiveSettingsTab = (state: RootState): number => state.ui.activeSettingsTab;
export const selectAppBarVisibility = (state: RootState): AppBarVisibilityConfig => state.ui.appBarVisibility;
