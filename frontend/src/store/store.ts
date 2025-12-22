import { configureStore } from '@reduxjs/toolkit';

import SettingsStateReducer from './cfg/SettingsStateReducer';
import StateReducer from './state/StateReducer';

export const store = configureStore({ reducer: { settingsState: SettingsStateReducer, state: StateReducer } });

// Get the type of our store variable
export type AppStore = typeof store;
// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<AppStore['getState']>;
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = AppStore['dispatch'];
