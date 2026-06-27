import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { getLogger } from '../../adapter';
import { processPromptChain } from '../run/thunks';
import { testProviderInference } from '../settings/thunks';
import { CurrentView, ThemeEffective, ThemeMode, UIState } from './types';

const logger = getLogger('UISlice');

const initialState: UIState = {
    layout: 'side',
    sidebarCollapsed: false,
    historyOpen: false,
    inferenceRunning: false,
    currentView: 'main',
    armedActionId: null,
    activeActionsTab: null,
    buildMode: false,
    editingStackId: null,
    theme: {
        mode: 'auto',
        effective: 'light',
    },
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
        setThemeMode: (state, action: PayloadAction<ThemeMode>) => {
            logger.logDebug(`Setting theme mode: ${action.payload}`);
            state.theme.mode = action.payload;
        },
        setThemeEffective: (state, action: PayloadAction<ThemeEffective>) => {
            logger.logDebug(`Setting effective theme: ${action.payload}`);
            state.theme.effective = action.payload;
        },
        setCurrentView: (state, action: PayloadAction<CurrentView>) => {
            state.currentView = action.payload;
        },
        armAction: (state, action: PayloadAction<string | null>) => {
            state.armedActionId = action.payload;
        },
        setActiveActionsTab: (state, action: PayloadAction<string | null>) => {
            state.activeActionsTab = action.payload;
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
    setLayout, toggleSidebar, setSidebarCollapsed,
    toggleHistory, setHistoryOpen,
    setThemeMode, setThemeEffective,
    setCurrentView, armAction, setActiveActionsTab,
    enterBuildMode, exitBuildMode, setEditingStackId,
} = uiSlice.actions;

// Navigation helpers — each navigates to the named view
export const navigateToSettings = () => setCurrentView('settings');
export const navigateToInfo = () => setCurrentView('info');
export const navigateToMain = () => setCurrentView('main');
export const navigateToStacks = () => setCurrentView('stacks');

export default uiSlice.reducer;
