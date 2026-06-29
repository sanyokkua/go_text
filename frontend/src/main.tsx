import 'katex/dist/katex.min.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { apperr } from '../wailsjs/go/models';
import store from './logic/store';
import { notifyError } from './logic/store/notifications/slice';
import { setEffective, setMode } from './logic/store/theme/slice';
import type { ThemeMode } from './logic/store/theme/types';
import { initTheme } from './logic/theme/init';
import AppLayout from './ui/AppLayout';
import RootErrorBoundary from './ui/RootErrorBoundary';
import './ui/styles/base.css';
import './ui/styles/markdown.css';
import './ui/styles/tokens.css';

// First paint uses 'auto' (OS theme); the persisted theme is applied a moment
// later when initializeSettingsState → getUIPreferences resolves from the backend.
const initialMode: ThemeMode = 'auto';
const effective = initTheme(initialMode);
store.dispatch(setMode(initialMode));
store.dispatch(setEffective(effective));

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
