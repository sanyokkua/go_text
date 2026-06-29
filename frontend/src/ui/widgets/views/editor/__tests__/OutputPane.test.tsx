import { configureStore } from '@reduxjs/toolkit';
import '@testing-library/jest-dom';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import editorReducer from '../../../../../logic/store/editor/slice';
import notificationsReducer from '../../../../../logic/store/notifications/slice';
import runReducer from '../../../../../logic/store/run/slice';
import uiReducer from '../../../../../logic/store/ui/slice';
import OutputPane from '../OutputPane';

jest.mock('../../../../../logic/adapter', () => ({
    ClipboardServiceAdapter: { setText: jest.fn().mockResolvedValue(true) },
    getLogger: () => ({ logInfo: jest.fn(), logDebug: jest.fn(), logError: jest.fn() }),
}));

function makeStore(editorOverrides = {}, runOverrides = {}) {
    return configureStore({
        reducer: { editor: editorReducer, ui: uiReducer, run: runReducer, notifications: notificationsReducer },
        preloadedState: {
            editor: { inputContent: 'hello', outputContent: '', viewMode: 'preview' as const, ...editorOverrides },
            run: {
                status: 'idle' as const,
                runId: null,
                currentGroupIndex: null,
                totalGroups: null,
                currentGroupFamily: null,
                failedIndex: null,
                partialOutput: null,
                errorCode: null,
                errorMessage: null,
                ...runOverrides,
            },
        },
    });
}

describe('OutputPane', () => {
    it('shows empty state placeholder when output is empty and not running', () => {
        render(
            <Provider store={makeStore()}>
                <OutputPane />
            </Provider>,
        );
        expect(screen.getByText(/Run to preview/i)).toBeInTheDocument();
    });

    it('shows the in-pane Generating step progress indicator when run is in progress', () => {
        render(
            <Provider store={makeStore({}, { status: 'running', runId: 'r1', currentGroupIndex: 0, totalGroups: 2, currentGroupFamily: 'Proofreading' })}>
                <OutputPane />
            </Provider>,
        );
        const status = screen.getByRole('status');
        expect(status).toBeInTheDocument();
        expect(status).toHaveTextContent(/Generating/i);
        expect(status).toHaveTextContent(/Step 1 of 2/i);
    });

    it('renders output text in Source view mode', () => {
        render(
            <Provider store={makeStore({ outputContent: 'Result text', viewMode: 'source' })}>
                <OutputPane />
            </Provider>,
        );
        expect(screen.getByText('Result text')).toBeInTheDocument();
    });

    it('Copy button is disabled when output is empty', () => {
        render(
            <Provider store={makeStore()}>
                <OutputPane />
            </Provider>,
        );
        expect(screen.getByRole('button', { name: /copy/i })).toBeDisabled();
    });

    it('Copy button is enabled when output has content', () => {
        render(
            <Provider store={makeStore({ outputContent: 'some output' })}>
                <OutputPane />
            </Provider>,
        );
        expect(screen.getByRole('button', { name: /copy/i })).toBeEnabled();
    });

    it('Use as input button is disabled when output is empty', () => {
        render(
            <Provider store={makeStore()}>
                <OutputPane />
            </Provider>,
        );
        expect(screen.getByRole('button', { name: /use as input/i })).toBeDisabled();
    });

    it('does not render the Preview/Source/Diff view toggle (single source of truth lives in the AppBar)', () => {
        render(
            <Provider store={makeStore({ outputContent: 'some output' })}>
                <OutputPane />
            </Provider>,
        );
        expect(screen.queryByRole('button', { name: /source view/i })).toBeNull();
        expect(screen.queryByRole('button', { name: /preview view/i })).toBeNull();
        expect(screen.queryByRole('button', { name: /diff view/i })).toBeNull();
    });

    it('shows a read-only label reflecting the current view mode', () => {
        render(
            <Provider store={makeStore({ outputContent: 'some output', viewMode: 'source' })}>
                <OutputPane />
            </Provider>,
        );
        expect(screen.getByText(/· source/i)).toBeInTheDocument();
    });

    it('renders the header label row above the editor body containing the output', () => {
        render(
            <Provider store={makeStore({ outputContent: 'some output', viewMode: 'source' })}>
                <OutputPane />
            </Provider>,
        );
        // Header label row (label + per-pane icon buttons) sits above the editor body.
        expect(screen.getByText('Output')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /copy output/i })).toBeInTheDocument();
        expect(screen.getByText('some output')).toBeInTheDocument();
    });

    it('uses only design tokens — no hardcoded hex colors — in its stylesheet', () => {
        const cssPath = join(__dirname, '..', 'OutputPane.module.css');
        const css = readFileSync(cssPath, 'utf8');

        expect(css).not.toMatch(/#[0-9a-fA-F]{3,6}\b/);
        expect(css).toMatch(/var\(--surface-2\)/);
        expect(css).toMatch(/var\(--line\)/);
    });
});
