import { configureStore } from '@reduxjs/toolkit';
import '@testing-library/jest-dom';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import editorReducer from '../../../../../logic/store/editor/slice';
import notificationsReducer from '../../../../../logic/store/notifications/slice';
import uiReducer from '../../../../../logic/store/ui/slice';
import InputPane from '../InputPane';

jest.mock('../../../../../logic/adapter', () => ({
    ClipboardServiceAdapter: { getText: jest.fn().mockResolvedValue('pasted text') },
    getLogger: () => ({ logInfo: jest.fn(), logDebug: jest.fn(), logError: jest.fn() }),
}));

function makeStore(editorOverrides = {}) {
    return configureStore({
        reducer: { editor: editorReducer, ui: uiReducer, notifications: notificationsReducer },
        preloadedState: {
            editor: { inputContent: '', outputContent: '', viewMode: 'preview' as const, ...editorOverrides },
        },
    });
}

describe('InputPane', () => {
    it('renders the header label row above the editor body containing the textarea', () => {
        render(
            <Provider store={makeStore()}>
                <InputPane />
            </Provider>,
        );

        // Header label row (label + per-pane icon buttons) sits above the editor body.
        expect(screen.getByText('Input')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /paste from clipboard/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /clear input/i })).toBeInTheDocument();

        // The textarea is the editor surface inside the body card.
        expect(screen.getByRole('textbox', { name: /input text/i })).toBeInTheDocument();
    });

    it('uses only design tokens — no hardcoded hex colors — in its stylesheet', () => {
        const cssPath = join(__dirname, '..', 'InputPane.module.css');
        const css = readFileSync(cssPath, 'utf8');

        // No 3- or 6-digit hex literals; colors must come from var(--…) tokens.
        expect(css).not.toMatch(/#[0-9a-fA-F]{3,6}\b/);
        expect(css).toMatch(/var\(--surface-2\)/);
        expect(css).toMatch(/var\(--line\)/);
    });
});
