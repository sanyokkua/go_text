export type ThemeMode = 'auto' | 'light' | 'dark';
export type ThemeEffective = 'light' | 'dark';

export type CurrentView = 'main' | 'settings' | 'info';

export interface ThemeSubState {
    mode: ThemeMode;
    effective: ThemeEffective;
}

export interface UIState {
    layout: 'side' | 'stacked';
    sidebarCollapsed: boolean;
    historyOpen: boolean;
    inferenceRunning: boolean;
    currentView: CurrentView;
    armedActionId: string | null;
    activeActionsTab: string | null;
    theme: ThemeSubState;
}
