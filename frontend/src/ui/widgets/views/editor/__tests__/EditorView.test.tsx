import { configureStore } from '@reduxjs/toolkit';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import actionsReducer from '../../../../../logic/store/actions/slice';
import editorReducer from '../../../../../logic/store/editor/slice';
import historyReducer from '../../../../../logic/store/history/slice';
import notificationsReducer from '../../../../../logic/store/notifications/slice';
import runReducer from '../../../../../logic/store/run/slice';
import settingsReducer from '../../../../../logic/store/settings/slice';
import stacksBuilderReducer from '../../../../../logic/store/stacks/builder/slice';
import stacksSavedReducer from '../../../../../logic/store/stacks/saved/slice';
import uiReducer from '../../../../../logic/store/ui/slice';
import EditorView from '../EditorView';

jest.mock('../../../../../logic/adapter', () => ({
    ClipboardServiceAdapter: { getText: jest.fn().mockResolvedValue('pasted text'), setText: jest.fn().mockResolvedValue(true) },
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
    HistoryHandlerAdapter: {
        listHistory: jest.fn().mockResolvedValue({ data: [], error: null }),
        deleteHistoryEntry: jest.fn().mockResolvedValue({ data: null, error: null }),
        clearHistory: jest.fn().mockResolvedValue({ data: null, error: null }),
    },
    getLogger: () => ({ logInfo: jest.fn(), logDebug: jest.fn(), logError: jest.fn(), logWarn: jest.fn(), logWarning: jest.fn() }),
    tryUnwrap: jest.fn(),
    unwrap: jest.fn(),
}));

function makeStore(editorOverrides = {}, uiOverrides = {}) {
    return configureStore({
        reducer: {
            editor: editorReducer,
            ui: uiReducer,
            run: runReducer,
            actions: actionsReducer,
            settings: settingsReducer,
            notifications: notificationsReducer,
            stacksBuilder: stacksBuilderReducer,
            stacksSaved: stacksSavedReducer,
            history: historyReducer,
        },
        preloadedState: {
            editor: { inputContent: '', outputContent: '', viewMode: 'preview' as const, tokenEstimate: null, ...editorOverrides },
            ui: {
                layout: 'side' as const,
                sidebarCollapsed: false,
                historyOpen: false,
                inferenceRunning: false,
                currentView: 'main' as const,
                armedActionId: null,
                armedStackId: null,
                activeActionsTab: null,
                buildMode: false,
                editingStackId: null,
                activeSettingsTab: 0,
                theme: { mode: 'auto' as const, effective: 'light' as const },
                appBarVisibility: { providerModelSelectors: true, languagePicker: true, outputFormatToggle: true, outputModeToggle: true, layoutToggle: true, commandPaletteButton: true, historyButton: true, infoButton: true },
                ...uiOverrides,
            },
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
            },
            actions: { catalog: [], catalogStatus: 'idle' as const, availableModels: [], modelsStatus: 'idle' as const },
            stacksBuilder: { steps: [], name: '', icon: '' },
            stacksSaved: { stacks: [], status: 'idle' as const, error: null },
            history: { entries: [], selectedId: null, loading: false, hasMore: false, total: 0, staleAfterRun: false },
            settings: { allSettings: { appBehaviorConfig: { historyEnabled: true, historyMaxEntries: 100 } } as never, metadata: null },
        },
    });
}

describe('EditorView integration', () => {
    it('renders Input and Output pane labels', () => {
        render(
            <Provider store={makeStore()}>
                <EditorView />
            </Provider>,
        );
        expect(screen.getByText('Input')).toBeInTheDocument();
        expect(screen.getByText('Output')).toBeInTheDocument();
    });

    it('Clear input button is disabled when input is empty', () => {
        render(
            <Provider store={makeStore()}>
                <EditorView />
            </Provider>,
        );
        expect(screen.getByRole('button', { name: /clear input/i })).toBeDisabled();
    });

    it('Clear input button is enabled after typing into the textarea', async () => {
        render(
            <Provider store={makeStore()}>
                <EditorView />
            </Provider>,
        );
        const textarea = screen.getByRole('textbox', { name: /input text/i });
        await userEvent.type(textarea, 'hello');
        expect(screen.getByRole('button', { name: /clear input/i })).toBeEnabled();
    });

    it('Output pane shows empty state when no output', () => {
        render(
            <Provider store={makeStore()}>
                <EditorView />
            </Provider>,
        );
        expect(screen.getByText(/run to preview/i)).toBeInTheDocument();
    });

    it('Run button is disabled when no action is armed', () => {
        render(
            <Provider store={makeStore({ inputContent: 'hi' })}>
                <EditorView />
            </Provider>,
        );
        expect(screen.getByRole('button', { name: /^run$/i })).toBeDisabled();
    });

    it('Run button is disabled while inferenceRunning', () => {
        render(
            <Provider store={makeStore({ inputContent: 'hi' }, { armedActionId: 'action1', inferenceRunning: true })}>
                <EditorView />
            </Provider>,
        );
        expect(screen.getByRole('button', { name: /^run$/i })).toBeDisabled();
    });

    it('shows the Actions sidebar and hides the History rail when history is closed', () => {
        render(
            <Provider store={makeStore({}, { historyOpen: false })}>
                <EditorView />
            </Provider>,
        );
        expect(screen.getByRole('complementary', { name: /actions sidebar/i })).toBeInTheDocument();
        expect(screen.queryByRole('complementary', { name: /^history$/i })).not.toBeInTheDocument();
    });

    it('shows both the Actions sidebar and the History rail when history is open', () => {
        render(
            <Provider store={makeStore({}, { historyOpen: true })}>
                <EditorView />
            </Provider>,
        );
        expect(screen.getByRole('complementary', { name: /actions sidebar/i })).toBeInTheDocument();
        expect(screen.getByRole('complementary', { name: /^history$/i })).toBeInTheDocument();
    });

    it('places the run bar BETWEEN the input and output panes in stacked layout', () => {
        render(
            <Provider store={makeStore({}, { layout: 'stacked' })}>
                <EditorView />
            </Provider>,
        );
        const input = screen.getByRole('textbox', { name: /input text/i });
        const runBtn = screen.getByRole('button', { name: /^run$/i });
        const output = screen.getByText(/run to preview/i);
        const follows = (a: Element, b: Element) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
        // DOM order: input → run bar → output
        expect(follows(input, runBtn)).toBe(true);
        expect(follows(runBtn, output)).toBe(true);
    });

    it('places the run bar BELOW both panes in side layout', () => {
        render(
            <Provider store={makeStore({}, { layout: 'side' })}>
                <EditorView />
            </Provider>,
        );
        const runBtn = screen.getByRole('button', { name: /^run$/i });
        const output = screen.getByText(/run to preview/i);
        const follows = (a: Element, b: Element) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
        // DOM order: output (last pane) → run bar
        expect(follows(output, runBtn)).toBe(true);
    });
});
