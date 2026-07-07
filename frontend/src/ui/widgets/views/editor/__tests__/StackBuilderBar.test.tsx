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
import stacksBuilderReducer from '../../../../../logic/store/stacks/builder/slice';
import stacksSavedReducer from '../../../../../logic/store/stacks/saved/slice';
import uiReducer from '../../../../../logic/store/ui/slice';
import StackBuilderBar from '../StackBuilderBar';

jest.mock('../../../../../logic/adapter', () => ({
    ActionHandlerAdapter: {
        processPromptChain: jest.fn().mockResolvedValue({ data: { finalText: 'result' }, error: null }),
        cancelChain: jest.fn().mockResolvedValue({ data: null, error: null }),
    },
    getLogger: () => ({ logInfo: jest.fn(), logDebug: jest.fn(), logError: jest.fn(), logWarn: jest.fn() }),
    tryUnwrap: jest.fn(),
    unwrap: jest.fn(),
}));

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
const SUMMARIZE = {
    id: 'summarize',
    name: 'Summarize',
    category: 'Condense',
    family: 'summarize',
    directive: '',
    orderRank: 40,
    exclusivityGroup: '',
    mergeable: false,
    terminal: true,
    requires: [],
};
const TRANSLATE = {
    id: 'translate',
    name: 'Translate',
    category: 'Language',
    family: 'translate',
    directive: '',
    orderRank: 50,
    exclusivityGroup: '',
    mergeable: false,
    terminal: true,
    requires: [],
};

interface StoreOverrides {
    steps?: string[];
    inferenceRunning?: boolean;
    runStatus?: string;
    runId?: string;
    inputContent?: string;
    catalog?: object[];
}

function makeStore(overrides: StoreOverrides = {}) {
    return configureStore({
        reducer: {
            ui: uiReducer,
            run: runReducer,
            editor: editorReducer,
            actions: actionsReducer,
            stacksBuilder: stacksBuilderReducer,
            stacksSaved: stacksSavedReducer,
            settings: settingsReducer,
            notifications: notificationsReducer,
        },
        preloadedState: {
            ui: {
                layout: 'side' as const,
                sidebarCollapsed: false,
                historyOpen: false,
                inferenceRunning: overrides.inferenceRunning ?? false,
                currentView: 'main' as const,
                armedActionId: null,
                armedStackId: null,
                activeActionsTab: null,
                buildMode: true,
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
            },
            run: {
                status: (overrides.runStatus ?? 'idle') as 'idle' | 'running' | 'done' | 'partial' | 'error' | 'cancelled',
                runId: overrides.runId ?? null,
                currentGroupIndex: null,
                totalGroups: null,
                currentGroupFamily: null,
                failedIndex: null,
                partialOutput: null,
                errorCode: null,
                errorMessage: null,
            },
            editor: { inputContent: overrides.inputContent ?? 'some text', outputContent: '', viewMode: 'preview' as const, tokenEstimate: null },
            actions: {
                catalog: (overrides.catalog ?? [PROOFREAD, TONE]) as never,
                catalogStatus: 'success' as const,
                availableModels: [],
                modelsStatus: 'idle' as const,
            },
            stacksBuilder: { steps: overrides.steps ?? [], name: '', icon: '' },
            stacksSaved: { stacks: [], status: 'idle' as const, error: null },
        },
    });
}

describe('StackBuilderBar', () => {
    it('shows counter "0 / 5 steps · 0 inferences" when no steps added', () => {
        render(
            <Provider store={makeStore()}>
                <StackBuilderBar onSave={jest.fn()} />
            </Provider>,
        );
        expect(screen.getByText(/0 \/ 5/)).toBeInTheDocument();
    });

    it('shows step chips for each added step', () => {
        render(
            <Provider store={makeStore({ steps: ['proofread', 'tone-formal'] })}>
                <StackBuilderBar onSave={jest.fn()} />
            </Provider>,
        );
        expect(screen.getByText('Proofread')).toBeInTheDocument();
        expect(screen.getByText('Formal')).toBeInTheDocument();
    });

    it('shows "2 / 5 steps · 1 inference" for two same-family steps', () => {
        render(
            <Provider store={makeStore({ steps: ['proofread', 'tone-formal'] })}>
                <StackBuilderBar onSave={jest.fn()} />
            </Provider>,
        );
        expect(screen.getByText(/2 \/ 5/)).toBeInTheDocument();
        expect(screen.getByText(/1 inference/)).toBeInTheDocument();
    });

    it('Save button is disabled when no steps added', () => {
        render(
            <Provider store={makeStore()}>
                <StackBuilderBar onSave={jest.fn()} />
            </Provider>,
        );
        expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
    });

    it('Save button is enabled when steps are present', () => {
        render(
            <Provider store={makeStore({ steps: ['proofread'] })}>
                <StackBuilderBar onSave={jest.fn()} />
            </Provider>,
        );
        expect(screen.getByRole('button', { name: /save/i })).toBeEnabled();
    });

    it('calls onSave when Save button clicked', async () => {
        const onSave = jest.fn();
        render(
            <Provider store={makeStore({ steps: ['proofread'] })}>
                <StackBuilderBar onSave={onSave} />
            </Provider>,
        );
        await userEvent.click(screen.getByRole('button', { name: /save/i }));
        expect(onSave).toHaveBeenCalledTimes(1);
    });

    it('Run button is disabled when inferenceRunning', () => {
        render(
            <Provider store={makeStore({ steps: ['proofread'], inferenceRunning: true })}>
                <StackBuilderBar onSave={jest.fn()} />
            </Provider>,
        );
        expect(screen.getByRole('button', { name: /^run$/i })).toBeDisabled();
    });

    it('Run button is disabled when no steps', () => {
        render(
            <Provider store={makeStore()}>
                <StackBuilderBar onSave={jest.fn()} />
            </Provider>,
        );
        expect(screen.getByRole('button', { name: /^run$/i })).toBeDisabled();
    });

    it('Cancel button dispatches exitBuildMode and clears builder', async () => {
        const store = makeStore({ steps: ['proofread'] });
        render(
            <Provider store={store}>
                <StackBuilderBar onSave={jest.fn()} />
            </Provider>,
        );
        await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
        expect(store.getState().ui.buildMode).toBe(false);
        expect(store.getState().stacksBuilder.steps).toHaveLength(0);
    });

    it('clicking ✕ on a chip removes that step', async () => {
        const store = makeStore({ steps: ['proofread', 'tone-formal'] });
        render(
            <Provider store={store}>
                <StackBuilderBar onSave={jest.fn()} />
            </Provider>,
        );
        const removeBtns = screen.getAllByRole('button', { name: /remove/i });
        await userEvent.click(removeBtns[0]);
        expect(store.getState().stacksBuilder.steps).toHaveLength(1);
    });

    it('highlights the inference counter once the 3-inference cap is reached', () => {
        render(
            <Provider store={makeStore({ steps: ['proofread', 'summarize', 'translate'], catalog: [PROOFREAD, TONE, SUMMARIZE, TRANSLATE] })}>
                <StackBuilderBar onSave={jest.fn()} />
            </Provider>,
        );
        expect(screen.getByText(/^3 inferences$/)).toHaveClass('inferenceCapReached');
    });

    it('does not highlight the inference counter below the 3-inference cap', () => {
        render(
            <Provider store={makeStore({ steps: ['proofread', 'summarize'], catalog: [PROOFREAD, TONE, SUMMARIZE, TRANSLATE] })}>
                <StackBuilderBar onSave={jest.fn()} />
            </Provider>,
        );
        expect(screen.getByText(/^2 inferences$/)).not.toHaveClass('inferenceCapReached');
    });

    it('shows Cancel run button while run is in progress', () => {
        render(
            <Provider store={makeStore({ steps: ['proofread'], runStatus: 'running', runId: 'r1' })}>
                <StackBuilderBar onSave={jest.fn()} />
            </Provider>,
        );
        expect(screen.getByRole('button', { name: /cancel run/i })).toBeInTheDocument();
    });
});
