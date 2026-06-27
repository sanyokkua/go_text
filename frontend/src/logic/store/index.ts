import { configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector } from 'react-redux';
import aboutReducer from './about/slice';
import actionsReducer from './actions/slice';
import editorReducer from './editor/slice';
import historyReducer from './history/slice';
import notificationsReducer from './notifications/slice';
import runReducer from './run/slice';
import settingsReducer from './settings/slice';
import stacksBuilderReducer from './stacks/builder/slice';
import stacksSavedReducer from './stacks/saved/slice';
import uiReducer from './ui/slice';

export * from './about/selectors';
export * from './actions/selectors';
export * from './editor/selectors';
export * from './history/selectors';
export * from './notifications/selectors';
export * from './run/selectors';
export * from './settings/selectors';
export * from './stacks/builder/selectors';
export * from './stacks/saved/selectors';
export * from './ui/selectors';

export const store = configureStore({
    reducer: {
        settings: settingsReducer,
        actions: actionsReducer,
        editor: editorReducer,
        stacksBuilder: stacksBuilderReducer,
        stacksSaved: stacksSavedReducer,
        run: runReducer,
        history: historyReducer,
        ui: uiReducer,
        notifications: notificationsReducer,
        about: aboutReducer,
    },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();

export default store;
