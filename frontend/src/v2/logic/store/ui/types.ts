export type MainView = 'main' | 'settings';

export interface UIState {
    view: MainView;
    activeSettingsTab: number; // 0 to 4
    activeActionsTab: string; // ID of the prompt group
    isAppBusy: boolean; // Global overlay for long operations
}
