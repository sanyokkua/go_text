import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { processPromptChain } from '../run/thunks';
import { testProviderInference } from '../settings/thunks';
import { CurrentView, ThemeEffective, ThemeMode, UIState } from './types';

const initialState: UIState = {
    layout: 'side',
    sidebarCollapsed: false,
    historyOpen: false,
    paletteOpen: false,
    inferenceRunning: false,
    currentView: 'main',
    armedActionId: null,
    armedStackId: null,
    activeActionsTab: null,
    activeSettingsTab: 0,
    buildMode: false,
    editingStackId: null,
    theme: { mode: 'auto', effective: 'light' },
};

const uiSlice = createSlice({
    name: 'ui',
    initialState,
    reducers: {
        setLayout: (state, action: PayloadAction<'side' | 'stacked'>) => {
            state.layout = action.payload;
        },
        toggleSidebar: (state) => {
            state.sidebarCollapsed = !state.sidebarCollapsed;
        },
        setSidebarCollapsed: (state, action: PayloadAction<boolean>) => {
            state.sidebarCollapsed = action.payload;
        },
        toggleHistory: (state) => {
            state.historyOpen = !state.historyOpen;
        },
        setHistoryOpen: (state, action: PayloadAction<boolean>) => {
            state.historyOpen = action.payload;
        },
        togglePalette: (state) => {
            state.paletteOpen = !state.paletteOpen;
        },
        setPaletteOpen: (state, action: PayloadAction<boolean>) => {
            state.paletteOpen = action.payload;
        },
        setThemeMode: (state, action: PayloadAction<ThemeMode>) => {
            state.theme.mode = action.payload;
        },
        setThemeEffective: (state, action: PayloadAction<ThemeEffective>) => {
            state.theme.effective = action.payload;
        },
        setCurrentView: (state, action: PayloadAction<CurrentView>) => {
            state.currentView = action.payload;
        },
        // Arming a single action and arming a stack are mutually exclusive run-targets.
        armAction: (state, action: PayloadAction<string | null>) => {
            state.armedActionId = action.payload;
            state.armedStackId = null;
        },
        armStack: (state, action: PayloadAction<string | null>) => {
            state.armedStackId = action.payload;
            state.armedActionId = null;
        },
        setActiveActionsTab: (state, action: PayloadAction<string | null>) => {
            state.activeActionsTab = action.payload;
        },
        setActiveSettingsTab: (state, action: PayloadAction<number>) => {
            state.activeSettingsTab = action.payload;
        },
        enterBuildMode: (state) => {
            state.buildMode = true;
            state.editingStackId = null;
        },
        exitBuildMode: (state) => {
            state.buildMode = false;
            state.editingStackId = null;
        },
        setEditingStackId: (state, action: PayloadAction<string | null>) => {
            state.editingStackId = action.payload;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(processPromptChain.pending, (state) => {
                state.inferenceRunning = true;
            })
            .addCase(processPromptChain.fulfilled, (state) => {
                state.inferenceRunning = false;
            })
            .addCase(processPromptChain.rejected, (state) => {
                state.inferenceRunning = false;
            })
            .addCase(testProviderInference.pending, (state) => {
                state.inferenceRunning = true;
            })
            .addCase(testProviderInference.fulfilled, (state) => {
                state.inferenceRunning = false;
            })
            .addCase(testProviderInference.rejected, (state) => {
                state.inferenceRunning = false;
            });
    },
});

export const {
    setLayout,
    toggleSidebar,
    setSidebarCollapsed,
    toggleHistory,
    setHistoryOpen,
    togglePalette,
    setPaletteOpen,
    setThemeMode,
    setThemeEffective,
    setCurrentView,
    armAction,
    armStack,
    setActiveActionsTab,
    setActiveSettingsTab,
    enterBuildMode,
    exitBuildMode,
    setEditingStackId,
} = uiSlice.actions;

// Navigation helpers — each navigates to the named view
export const navigateToSettings = () => setCurrentView('settings');
export const navigateToInfo = () => setCurrentView('info');
export const navigateToMain = () => setCurrentView('main');
export const navigateToStacks = () => setCurrentView('stacks');

export default uiSlice.reducer;
