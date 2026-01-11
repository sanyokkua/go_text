/**
 * Redux Store Configuration
 *
 * Centralized state management for the application using Redux Toolkit.
 * Defines the root store, typed hooks, and exports all reducers.
 *
 * Store Structure:
 * - settings: Application configuration and provider management
 * - actions: Prompt groups and action processing state
 * - editor: Input/output text content and editing state
 * - ui: User interface state (views, tabs, busy indicators)
 * - notifications: User notification system
 */
import { configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector } from 'react-redux';
import actionsReducer from './actions/slice';
import editorReducer from './editor/slice';
import notificationsReducer from './notifications/slice';
import settingsReducer from './settings/slice';
import uiReducer from './ui/slice';

// Export selectors from all store modules
export * from './actions/selectors';
export * from './editor/selectors';
export * from './notifications/selectors';
export * from './settings/selectors';
export * from './ui/selectors';

// Configure the Redux store

export const store = configureStore({
    reducer: { settings: settingsReducer, actions: actionsReducer, editor: editorReducer, ui: uiReducer, notifications: notificationsReducer },
});

// Infer the RootState and AppDispatch types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Create typed hooks for use throughout the app
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();

// Export the store for use in the app
export default store;
