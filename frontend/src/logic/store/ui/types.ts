export type MainView = 'main' | 'settings' | 'info';

export interface UIState {
    view: MainView;
    activeSettingsTab: number; // 0 to 4
    activeActionsTab: string; // ID of the prompt group
    isAppBusy: boolean; // Global overlay for long operations
    currentTask: string; // New: Stores the name of the currently running action
}
