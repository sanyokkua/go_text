import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import store from './logic/store';
import './ui/styles/tokens.css';
import './ui/styles/base.css';
import AppLayout from './ui/AppLayout';

const container = document.getElementById('root');
const root = createRoot(container!);

root.render(
    <React.StrictMode>
        <Provider store={store}>
            <AppLayout />
        </Provider>
    </React.StrictMode>,
);
