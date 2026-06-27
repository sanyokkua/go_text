import { configureStore } from '@reduxjs/toolkit';
import '@testing-library/jest-dom';
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

    it('shows step progress spinner when run is in progress', () => {
        render(
            <Provider store={makeStore({}, { status: 'running', runId: 'r1' })}>
                <OutputPane />
            </Provider>,
        );
        expect(screen.getByRole('status')).toBeInTheDocument();
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
});
