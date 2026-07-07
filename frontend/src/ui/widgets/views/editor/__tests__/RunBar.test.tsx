import { configureStore } from '@reduxjs/toolkit';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import actionsReducer from '../../../../../logic/store/actions/slice';
import editorReducer from '../../../../../logic/store/editor/slice';
import notificationsReducer from '../../../../../logic/store/notifications/slice';
import runReducer from '../../../../../logic/store/run/slice';
import settingsReducer from '../../../../../logic/store/settings/slice';
import stacksSavedReducer from '../../../../../logic/store/stacks/saved/slice';
import uiReducer from '../../../../../logic/store/ui/slice';
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
    catalog: Array<{
        id: string;
        name: string;
        category: string;
        family: string;
        directive: string;
        orderRank: number;
        exclusivityGroup: string;
        mergeable: boolean;
        terminal: boolean;
        requires: string[];
    }> = [],
    stacks: object[] = [],
) {
    return configureStore({
        reducer: {
            editor: editorReducer,
            ui: uiReducer,
            run: runReducer,
            actions: actionsReducer,
            settings: settingsReducer,
            stacksSaved: stacksSavedReducer,
            notifications: notificationsReducer,
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
                appBarVisibility: {
                    providerModelSelectors: true,
                    languagePicker: true,
                    outputFormatToggle: true,
                    outputModeToggle: true,
                    layoutToggle: true,
                    commandPaletteButton: true,
                    historyButton: true,
                    infoButton: true,
                },
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
                ...runOverrides,
            },
            actions: {
                catalog,
                catalogStatus: catalog.length > 0 ? ('success' as const) : ('idle' as const),
                availableModels: [],
                modelsStatus: 'idle' as const,
            },
            stacksSaved: { stacks: stacks as never, status: 'idle' as const, error: null },
        },
    });
}

const MOCK_STACK = {
    id: 'stack-1',
    name: 'My Pipeline',
    icon: '📝',
    steps: ['proofread', 'summarize'],
    defaultFormat: 'PlainText',
    defaultInLang: '',
    defaultOutLang: '',
    createdAt: 0,
    updatedAt: 0,
};

const STACK_CATALOG = [
    {
        id: 'proofread',
        name: 'Proofread',
        category: 'Writing',
        family: 'rewrite',
        directive: '',
        orderRank: 10,
        exclusivityGroup: '',
        mergeable: false,
        terminal: false,
        requires: [],
    },
    {
        id: 'summarize',
        name: 'Summarize',
        category: 'Writing',
        family: 'text',
        directive: '',
        orderRank: 20,
        exclusivityGroup: '',
        mergeable: false,
        terminal: false,
        requires: [],
    },
];

describe('RunBar', () => {
    it('Run button is disabled when no action is armed', () => {
        render(
            <Provider store={makeStore()}>
                <RunBar />
            </Provider>,
        );
        expect(screen.getByRole('button', { name: /run/i })).toBeDisabled();
    });

    it('Run button is disabled when input is empty even with action armed', () => {
        render(
            <Provider store={makeStore({ armedActionId: 'action1' })}>
                <RunBar />
            </Provider>,
        );
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
            <Provider
                store={makeStore({ armedActionId: 'action1' }, { inputContent: 'hi' }, {}, [
                    {
                        id: 'action1',
                        name: 'Summarise',
                        category: 'Writing',
                        family: 'text',
                        directive: '',
                        orderRank: 0,
                        exclusivityGroup: '',
                        mergeable: false,
                        terminal: false,
                        requires: [],
                    },
                ])}
            >
                <RunBar />
            </Provider>,
        );
        expect(screen.getByText('Summarise')).toBeInTheDocument();
        expect(screen.getByText('1 inference')).toBeInTheDocument();
    });

    it('shows hint text in chip when no action is armed', () => {
        render(
            <Provider store={makeStore()}>
                <RunBar />
            </Provider>,
        );
        expect(screen.getByText(/select an action from the sidebar/i)).toBeInTheDocument();
    });

    it('shows the stack name and step/inference meta when a stack is armed', () => {
        render(
            <Provider store={makeStore({ armedStackId: 'stack-1' }, { inputContent: 'hi' }, {}, STACK_CATALOG, [MOCK_STACK])}>
                <RunBar />
            </Provider>,
        );
        expect(screen.getByText('My Pipeline')).toBeInTheDocument();
        expect(screen.getByText('2 steps · 2 inferences')).toBeInTheDocument();
    });

    it('Run button is enabled when a stack is armed and input is non-empty', () => {
        render(
            <Provider store={makeStore({ armedStackId: 'stack-1' }, { inputContent: 'hello' }, {}, STACK_CATALOG, [MOCK_STACK])}>
                <RunBar />
            </Provider>,
        );
        expect(screen.getByRole('button', { name: /run/i })).toBeEnabled();
    });

    it('clicking Run with an armed stack dispatches a chain request with the stack steps', async () => {
        const { ActionHandlerAdapter } = jest.requireMock('../../../../../logic/adapter');
        render(
            <Provider store={makeStore({ armedStackId: 'stack-1' }, { inputContent: 'hello' }, {}, STACK_CATALOG, [MOCK_STACK])}>
                <RunBar />
            </Provider>,
        );

        await userEvent.click(screen.getByRole('button', { name: /run/i }));

        expect(ActionHandlerAdapter.processPromptChain).toHaveBeenCalledTimes(1);
        const req = ActionHandlerAdapter.processPromptChain.mock.calls[0][0];
        expect(req.steps.map((s: { actionId: string }) => s.actionId)).toEqual(['proofread', 'summarize']);
    });
});
