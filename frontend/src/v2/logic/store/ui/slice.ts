import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { getLogger } from '../../adapter';
import { MainView, UIState } from './types';

const logger = getLogger('UISlice');

// Initial state
const initialState: UIState = { view: 'main', activeSettingsTab: 0, activeActionsTab: '', isAppBusy: false };

const uiSlice = createSlice({
    name: 'ui',
    initialState,
    reducers: {
        toggleSettingsView: (state) => {
            const newView = state.view === 'main' ? 'settings' : 'main';
            logger.logInfo(`Toggling view to: ${newView}`);
            state.view = newView;
        },
        setView: (state, action: PayloadAction<MainView>) => {
            logger.logInfo(`Setting view to: ${action.payload}`);
            state.view = action.payload;
        },
        setActiveSettingsTab: (state, action: PayloadAction<number>) => {
            logger.logDebug(`Setting active settings tab to: ${action.payload}`);
            state.activeSettingsTab = action.payload;
        },
        setActiveActionsTab: (state, action: PayloadAction<string>) => {
            logger.logDebug(`Setting active actions tab to: ${action.payload}`);
            state.activeActionsTab = action.payload;
        },
        setAppBusy: (state, action: PayloadAction<boolean>) => {
            logger.logInfo(`Setting app busy state to: ${action.payload}`);
            state.isAppBusy = action.payload;
        },
    },
    extraReducers: (builder) => {
        // No async thunks for UI - all updates are synchronous
    },
});

export const { toggleSettingsView, setView, setActiveSettingsTab, setActiveActionsTab, setAppBusy } = uiSlice.actions;

export default uiSlice.reducer;
