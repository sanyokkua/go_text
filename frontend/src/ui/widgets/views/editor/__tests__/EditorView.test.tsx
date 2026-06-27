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
import stacksBuilderReducer from '../../../../../logic/store/stacks/builder/slice';
import stacksSavedReducer from '../../../../../logic/store/stacks/saved/slice';
import EditorView from '../EditorView';

jest.mock('../../../../../logic/adapter', () => ({
    ClipboardServiceAdapter: {
        getText: jest.fn().mockResolvedValue('pasted text'),
        setText: jest.fn().mockResolvedValue(true),
    },
    ActionHandlerAdapter: {
        processPromptChain: jest.fn().mockResolvedValue({ data: { finalText: 'output' }, error: null }),
        cancelChain: jest.fn().mockResolvedValue({ data: null, error: null }),
        getActionCatalog: jest.fn().mockResolvedValue({ data: [], error: null }),
    },
    StackHandlerAdapter: {
        createStack: jest.fn().mockResolvedValue({ data: null, error: null }),
        updateStack: jest.fn().mockResolvedValue({ data: null, error: null }),
        listStacks: jest.fn().mockResolvedValue({ data: [], error: null }),
    },
    getLogger: () => ({ logInfo: jest.fn(), logDebug: jest.fn(), logError: jest.fn(), logWarn: jest.fn() }),
    tryUnwrap: jest.fn(),
    unwrap: jest.fn(),
}));

function makeStore(editorOverrides = {}, uiOverrides = {}) {
    return configureStore({
        reducer: {
            editor: editorReducer, ui: uiReducer, run: runReducer,
            actions: actionsReducer, settings: settingsReducer, notifications: notificationsReducer,
            stacksBuilder: stacksBuilderReducer, stacksSaved: stacksSavedReducer,
        },
        preloadedState: {
            editor: { inputContent: '', outputContent: '', viewMode: 'preview' as const, ...editorOverrides },
            ui: {
                layout: 'side' as const, sidebarCollapsed: false, historyOpen: false,
                inferenceRunning: false, currentView: 'main' as const, armedActionId: null, activeActionsTab: null,
                buildMode: false, editingStackId: null,
                theme: { mode: 'auto' as const, effective: 'light' as const },
                ...uiOverrides,
            },
            run: { status: 'idle' as const, runId: null, currentGroupIndex: null, totalGroups: null, currentGroupFamily: null, failedIndex: null, partialOutput: null, errorCode: null, errorMessage: null },
            actions: { catalog: [], catalogStatus: 'idle' as const, availableModels: [], modelsStatus: 'idle' as const },
            stacksBuilder: { steps: [], name: '', icon: '' },
            stacksSaved: { stacks: [], status: 'idle' as const, error: null },
        },
    });
}

describe('EditorView integration', () => {
    it('renders Input and Output pane labels', () => {
        render(<Provider store={makeStore()}><EditorView /></Provider>);
        expect(screen.getByText('Input')).toBeInTheDocument();
        expect(screen.getByText('Output')).toBeInTheDocument();
    });

    it('Clear input button is disabled when input is empty', () => {
        render(<Provider store={makeStore()}><EditorView /></Provider>);
        expect(screen.getByRole('button', { name: /clear input/i })).toBeDisabled();
    });

    it('Clear input button is enabled after typing into the textarea', async () => {
        render(<Provider store={makeStore()}><EditorView /></Provider>);
        const textarea = screen.getByRole('textbox', { name: /input text/i });
        await userEvent.type(textarea, 'hello');
        expect(screen.getByRole('button', { name: /clear input/i })).toBeEnabled();
    });

    it('Output pane shows empty state when no output', () => {
        render(<Provider store={makeStore()}><EditorView /></Provider>);
        expect(screen.getByText(/run to preview/i)).toBeInTheDocument();
    });

    it('Diff view tab is disabled when output is empty', () => {
        render(<Provider store={makeStore({ inputContent: 'some text' })}><EditorView /></Provider>);
        expect(screen.getByRole('button', { name: /diff view/i })).toBeDisabled();
    });

    it('Diff view tab is enabled when both input and output exist', () => {
        render(
            <Provider store={makeStore({ inputContent: 'text', outputContent: 'result' })}>
                <EditorView />
            </Provider>,
        );
        expect(screen.getByRole('button', { name: /diff view/i })).toBeEnabled();
    });

    it('Run button is disabled when no action is armed', () => {
        render(<Provider store={makeStore({ inputContent: 'hi' })}><EditorView /></Provider>);
        expect(screen.getByRole('button', { name: /^run$/i })).toBeDisabled();
    });

    it('Run button is disabled while inferenceRunning', () => {
        render(
            <Provider store={makeStore(
                { inputContent: 'hi' },
                { armedActionId: 'action1', inferenceRunning: true },
            )}>
                <EditorView />
            </Provider>,
        );
        expect(screen.getByRole('button', { name: /^run$/i })).toBeDisabled();
    });
});
