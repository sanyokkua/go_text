import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import editorReducer from '../../../../../logic/store/editor/slice';
import uiReducer from '../../../../../logic/store/ui/slice';
import runReducer from '../../../../../logic/store/run/slice';
import actionsReducer from '../../../../../logic/store/actions/slice';
import settingsReducer from '../../../../../logic/store/settings/slice';
import notificationsReducer from '../../../../../logic/store/notifications/slice';
import RunBar from '../RunBar';

jest.mock('../../../../../logic/adapter', () => ({
    ActionHandlerAdapter: {
        processPromptChain: jest.fn().mockResolvedValue({ data: { finalText: 'result' }, error: null }),
        cancelChain: jest.fn().mockResolvedValue({ data: null, error: null }),
    },
    getLogger: () => ({ logInfo: jest.fn(), logDebug: jest.fn(), logError: jest.fn(), logWarn: jest.fn() }),
    tryUnwrap: jest.fn(),
    unwrap: jest.fn(),
}));

function makeStore(
    uiOverrides = {},
    editorOverrides = {},
    runOverrides = {},
    catalog: Array<{ id: string; name: string; category: string; directive: string }> = [],
) {
    return configureStore({
        reducer: {
            editor: editorReducer, ui: uiReducer, run: runReducer,
            actions: actionsReducer, settings: settingsReducer, notifications: notificationsReducer,
        },
        preloadedState: {
            editor: { inputContent: '', outputContent: '', viewMode: 'preview' as const, ...editorOverrides },
            ui: {
                layout: 'side' as const, sidebarCollapsed: false, historyOpen: false,
                inferenceRunning: false, currentView: 'main' as const, armedActionId: null, activeActionsTab: null,
                theme: { mode: 'auto' as const, effective: 'light' as const },
                ...uiOverrides,
            },
            run: { status: 'idle' as const, runId: null, currentGroupIndex: null, totalGroups: null, currentGroupFamily: null, failedIndex: null, partialOutput: null, errorCode: null, errorMessage: null, ...runOverrides },
            ...(catalog.length > 0 ? { actions: { catalog, catalogStatus: 'success' as const, availableModels: [], modelsStatus: 'idle' as const } } : {}),
        },
    });
}

describe('RunBar', () => {
    it('Run button is disabled when no action is armed', () => {
        render(<Provider store={makeStore()}><RunBar /></Provider>);
        expect(screen.getByRole('button', { name: /run/i })).toBeDisabled();
    });

    it('Run button is disabled when input is empty even with action armed', () => {
        render(<Provider store={makeStore({ armedActionId: 'action1' })}><RunBar /></Provider>);
        expect(screen.getByRole('button', { name: /run/i })).toBeDisabled();
    });

    it('Run button is enabled when action is armed and input is non-empty', () => {
        render(
            <Provider store={makeStore({ armedActionId: 'action1' }, { inputContent: 'hello' })}>
                <RunBar />
            </Provider>,
        );
        expect(screen.getByRole('button', { name: /run/i })).toBeEnabled();
    });

    it('Run button is disabled when inference is already running', () => {
        render(
            <Provider store={makeStore({ armedActionId: 'action1', inferenceRunning: true }, { inputContent: 'hi' })}>
                <RunBar />
            </Provider>,
        );
        expect(screen.getByRole('button', { name: /run/i })).toBeDisabled();
    });

    it('shows Cancel button while run is in progress', () => {
        render(
            <Provider store={makeStore({ armedActionId: 'action1' }, {}, { status: 'running', runId: 'r1' })}>
                <RunBar />
            </Provider>,
        );
        expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('shows action name and badge in chip when an action is armed', () => {
        render(
            <Provider store={makeStore(
                { armedActionId: 'action1' },
                { inputContent: 'hi' },
                {},
                [{ id: 'action1', name: 'Summarise', category: 'Writing', directive: '' }],
            )}>
                <RunBar />
            </Provider>,
        );
        expect(screen.getByText('Summarise')).toBeInTheDocument();
        expect(screen.getByText('1 inference')).toBeInTheDocument();
    });

    it('shows hint text in chip when no action is armed', () => {
        render(<Provider store={makeStore()}><RunBar /></Provider>);
        expect(screen.getByText(/select an action from the sidebar/i)).toBeInTheDocument();
    });
});
