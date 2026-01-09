/**
 * Application Entry Point
 * 
 * Initializes the React application and mounts it to the DOM.
 * Sets up the Redux store provider and renders the root AppLayout component.
 * 
 * Key responsibilities:
 * - Loads Roboto font styles for Material-UI typography
 * - Creates React root and mounts the application
 * - Wraps the app with Redux Provider for state management
 * - Enables React.StrictMode for development-time checks
 */
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import store from './logic/store';
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
