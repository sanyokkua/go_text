import 'katex/dist/katex.min.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { apperr } from '../wailsjs/go/models';
import store from './logic/store';
import { notifyError } from './logic/store/notifications/slice';
import { setEffective, setMode } from './logic/store/theme/slice';
import type { ThemeMode } from './logic/store/theme/types';
import { THEME_STORAGE_KEY, initTheme, watchSystemTheme } from './logic/theme/init';
import AppLayout from './ui/AppLayout';
import RootErrorBoundary from './ui/RootErrorBoundary';
import './ui/styles/base.css';
import './ui/styles/markdown.css';
import './ui/styles/tokens.css';

const raw = localStorage.getItem(THEME_STORAGE_KEY);
const storedMode: ThemeMode = raw === 'dark' || raw === 'light' ? raw : 'auto';
const effective = initTheme(storedMode);
store.dispatch(setMode(storedMode));
store.dispatch(setEffective(effective));
watchSystemTheme(storedMode, (eff) => store.dispatch(setEffective(eff)));

// Global catch-all for uncaught errors — must sit before render
const internalWire = (): apperr.WireError =>
    apperr.WireError.createFrom({
        code: apperr.ErrorCode.CodeInternal,
        title: 'Something went wrong',
        message: 'An unexpected error occurred. Please try again.',
        retryable: true,
    });

window.addEventListener('error', () => {
    store.dispatch(notifyError(internalWire()));
});

window.addEventListener('unhandledrejection', () => {
    store.dispatch(notifyError(internalWire()));
});

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(
    <React.StrictMode>
        <Provider store={store}>
            <RootErrorBoundary>
                <AppLayout />
            </RootErrorBoundary>
        </Provider>
    </React.StrictMode>,
);
