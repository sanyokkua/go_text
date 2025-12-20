import { configureStore } from '@reduxjs/toolkit';
import AppStateReducer from './app/AppStateReducer';
// import AppSettingsReducer from './settings/AppSettingsReducer';
import SettingsStateReducer from './cfg/SettingsStateReducer';

export const store = configureStore({
    reducer: {
        settingsState: SettingsStateReducer,
        appState: AppStateReducer,
    },
});

// Get the type of our store variable
export type AppStore = typeof store;
// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<AppStore['getState']>;
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = AppStore['dispatch'];
