import { RootState } from '../index';
import { MainView } from './types';

// Basic selectors
export const selectCurrentView = (state: RootState): MainView => state.ui.view;

export const selectActiveSettingsTab = (state: RootState): number => state.ui.activeSettingsTab;

export const selectActiveActionsTab = (state: RootState): string => state.ui.activeActionsTab;

export const selectIsAppBusy = (state: RootState): boolean => state.ui.isAppBusy;

// Derived selectors
export const selectIsSettingsView = (state: RootState): boolean => state.ui.view === 'settings';

export const selectIsMainView = (state: RootState): boolean => state.ui.view === 'main';

export const selectIsAppReady = (state: RootState): boolean => !state.ui.isAppBusy;
