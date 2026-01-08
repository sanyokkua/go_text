import { configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector, useStore } from 'react-redux';
import actionsReducer from './actions/slice';
import clipboardReducer from './clipboard/slice';
import editorReducer from './editor/slice';
import notificationsReducer from './notifications/slice';
import settingsReducer from './settings/slice';
import uiReducer from './ui/slice';

// Configure the Redux store

export const store = configureStore({
    reducer: {
        settings: settingsReducer,
        actions: actionsReducer,
        editor: editorReducer,
        ui: uiReducer,
        notifications: notificationsReducer,
        clipboard: clipboardReducer,
    },
});

// Infer the RootState and AppDispatch types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export type AppStore = typeof store;

// Create typed hooks for use throughout the app
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
export const useAppStore = useStore.withTypes<AppStore>();

// Export the store for use in the app
export default store;
