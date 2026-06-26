import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import store from './logic/store';
import { setEffective, setMode } from './logic/store/theme/slice';
import type { ThemeMode } from './logic/store/theme/types';
import { THEME_STORAGE_KEY, initTheme, watchSystemTheme } from './logic/theme/init';
import AppLayout from './ui/AppLayout';
import './ui/styles/tokens.css';
import './ui/styles/base.css';

const raw = localStorage.getItem(THEME_STORAGE_KEY);
const storedMode: ThemeMode = raw === 'dark' || raw === 'light' ? raw : 'auto';
const effective = initTheme(storedMode);
store.dispatch(setMode(storedMode));
store.dispatch(setEffective(effective));
watchSystemTheme(storedMode, (eff) => store.dispatch(setEffective(eff)));

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(
    <React.StrictMode>
        <Provider store={store}>
            <AppLayout />
        </Provider>
    </React.StrictMode>,
);
