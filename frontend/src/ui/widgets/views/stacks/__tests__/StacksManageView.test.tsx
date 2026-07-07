import { configureStore } from '@reduxjs/toolkit';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Provider } from 'react-redux';
import actionsReducer from '../../../../../logic/store/actions/slice';
import editorReducer from '../../../../../logic/store/editor/slice';
import notificationsReducer from '../../../../../logic/store/notifications/slice';
import runReducer from '../../../../../logic/store/run/slice';
import settingsReducer from '../../../../../logic/store/settings/slice';
import stacksBuilderReducer from '../../../../../logic/store/stacks/builder/slice';
import stacksSavedReducer from '../../../../../logic/store/stacks/saved/slice';
import uiReducer from '../../../../../logic/store/ui/slice';
import StacksManageView from '../StacksManageView';

jest.mock('../../../../../logic/adapter', () => ({
    StackHandlerAdapter: {
        listStacks: jest.fn().mockResolvedValue({ data: [], error: null }),
        deleteStack: jest.fn().mockResolvedValue({ data: null, error: null }),
        duplicateStack: jest
            .fn()
            .mockResolvedValue({
                data: {
                    id: 'dup-1',
                    name: 'My Pipeline (copy)',
                    icon: '📝',
                    steps: ['proofread'],
                    defaultFormat: 'PlainText',
                    defaultInLang: '',
                    defaultOutLang: '',
                    createdAt: 0,
                    updatedAt: 0,
                },
                error: null,
            }),
    },
    ActionHandlerAdapter: {
        processPromptChain: jest.fn().mockResolvedValue({ data: { finalText: 'result' }, error: null }),
        cancelChain: jest.fn().mockResolvedValue({ data: null, error: null }),
    },
    getLogger: () => ({ logInfo: jest.fn(), logDebug: jest.fn(), logError: jest.fn(), logWarn: jest.fn() }),
    unwrap: jest.fn((res: { data: unknown; error: unknown }) => {
        if (res.error) throw res.error;
        return res.data;
    }),
    tryUnwrap: jest.fn(),
}));

const MOCK_STACK = {
    id: 'stack-1',
    name: 'My Pipeline',
    icon: '📝',
    steps: ['proofread', 'tone-formal'],
    defaultFormat: 'PlainText',
    defaultInLang: '',
    defaultOutLang: '',
    createdAt: 0,
    updatedAt: 0,
};

const PROOFREAD = {
    id: 'proofread',
    name: 'Proofread',
    category: 'Writing',
    family: 'rewrite',
    directive: '',
    orderRank: 10,
    exclusivityGroup: 'proofread',
    mergeable: true,
    terminal: false,
    requires: [],
};
const TONE = {
    id: 'tone-formal',
    name: 'Formal',
    category: 'Writing',
    family: 'rewrite',
    directive: '',
    orderRank: 30,
    exclusivityGroup: 'tone',
    mergeable: true,
    terminal: false,
    requires: [],
};

interface StoreOverrides {
    stacks?: object[];
    inferenceRunning?: boolean;
    inputContent?: string;
}

function makeStore(overrides: StoreOverrides = {}) {
    return configureStore({
        reducer: {
            stacksSaved: stacksSavedReducer,
            stacksBuilder: stacksBuilderReducer,
            ui: uiReducer,
            run: runReducer,
            editor: editorReducer,
            actions: actionsReducer,
            settings: settingsReducer,
            notifications: notificationsReducer,
        },
        preloadedState: {
            stacksSaved: { stacks: (overrides.stacks ?? [MOCK_STACK]) as never, status: 'idle' as const, error: null },
            stacksBuilder: { steps: [], name: '', icon: '' },
            ui: {
                layout: 'side' as const,
                sidebarCollapsed: false,
                historyOpen: false,
                inferenceRunning: overrides.inferenceRunning ?? false,
                currentView: 'stacks' as const,
                armedActionId: null,
                armedStackId: null,
                activeActionsTab: null,
                buildMode: false,
                editingStackId: null,
                activeSettingsTab: 0,
                theme: { mode: 'auto' as const, effective: 'light' as const },
                appBarVisibility: { providerModelSelectors: true, languagePicker: true, outputFormatToggle: true, outputModeToggle: true, layoutToggle: true, commandPaletteButton: true, historyButton: true, infoButton: true },
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
            editor: { inputContent: overrides.inputContent ?? 'some text', outputContent: '', viewMode: 'preview' as const, tokenEstimate: null },
            actions: { catalog: [PROOFREAD, TONE], catalogStatus: 'idle' as const, availableModels: [], modelsStatus: 'idle' as const },
            notifications: { queue: [] },
        },
    });
}

describe('StacksManageView', () => {
    it('renders "My Stacks" heading', () => {
        render(
            <Provider store={makeStore()}>
                <StacksManageView />
            </Provider>,
        );
        expect(screen.getByRole('heading', { name: /my stacks/i })).toBeInTheDocument();
    });

    it('renders a back button to return to editor', () => {
        render(
            <Provider store={makeStore()}>
                <StacksManageView />
            </Provider>,
        );
        expect(screen.getByRole('button', { name: /editor/i })).toBeInTheDocument();
    });

    it('clicking back navigates to main view', async () => {
        const store = makeStore();
        render(
            <Provider store={store}>
                <StacksManageView />
            </Provider>,
        );
        await userEvent.click(screen.getByRole('button', { name: /editor/i }));
        expect(store.getState().ui.currentView).toBe('main');
    });

    it('renders a card for each saved stack', () => {
        render(
            <Provider store={makeStore()}>
                <StacksManageView />
            </Provider>,
        );
        expect(screen.getByText('My Pipeline')).toBeInTheDocument();
    });

    it('shows empty state with only the Build tile when no stacks exist', () => {
        render(
            <Provider store={makeStore({ stacks: [] })}>
                <StacksManageView />
            </Provider>,
        );
        expect(screen.getByRole('button', { name: /build a new stack/i })).toBeInTheDocument();
        expect(screen.queryByText('My Pipeline')).not.toBeInTheDocument();
    });

    it('card Run button is disabled when inferenceRunning', () => {
        render(
            <Provider store={makeStore({ inferenceRunning: true })}>
                <StacksManageView />
            </Provider>,
        );
        expect(screen.getByRole('button', { name: /run my pipeline/i })).toBeDisabled();
    });

    it('clicking Edit loads steps into builder and navigates to main in build mode', async () => {
        const store = makeStore();
        render(
            <Provider store={store}>
                <StacksManageView />
            </Provider>,
        );
        await userEvent.click(screen.getByRole('button', { name: /edit my pipeline/i }));
        expect(store.getState().ui.buildMode).toBe(true);
        expect(store.getState().ui.currentView).toBe('main');
        expect(store.getState().stacksBuilder.steps).toEqual(['proofread', 'tone-formal']);
        expect(store.getState().ui.editingStackId).toBe('stack-1');
    });

    it('clicking New stack button enters build mode and navigates to main', async () => {
        const store = makeStore();
        render(
            <Provider store={store}>
                <StacksManageView />
            </Provider>,
        );
        await userEvent.click(screen.getByRole('button', { name: /\+ new stack/i }));
        expect(store.getState().ui.buildMode).toBe(true);
        expect(store.getState().ui.currentView).toBe('main');
    });
});

describe('StacksManageView responsive grid CSS', () => {
    // jsdom cannot evaluate media queries, so assert the breakpoints exist in the module source.
    const css = readFileSync(join(__dirname, '..', 'StacksManageView.module.css'), 'utf8');

    it('reduces to two columns under 900px', () => {
        expect(css).toMatch(/@media\s*\(max-width:\s*900px\)/);
        expect(css).toMatch(/grid-template-columns:\s*repeat\(2,\s*1fr\)/);
    });

    it('reduces to one column under 600px', () => {
        expect(css).toMatch(/@media\s*\(max-width:\s*600px\)/);
    });
});
