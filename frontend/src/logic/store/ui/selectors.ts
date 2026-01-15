import { RootState } from '../index';
import { MainView } from './types';

export const selectCurrentView = (state: RootState): MainView => state.ui.view;
export const selectActiveSettingsTab = (state: RootState): number => state.ui.activeSettingsTab;
export const selectActiveActionsTab = (state: RootState): string => state.ui.activeActionsTab;
export const selectIsAppBusy = (state: RootState): boolean => state.ui.isAppBusy;
export const selectCurrentTask = (state: RootState): string => state.ui.currentTask;
