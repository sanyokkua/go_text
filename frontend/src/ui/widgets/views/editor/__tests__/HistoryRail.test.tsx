jest.mock('../../../../../logic/adapter', () => ({
    HistoryHandlerAdapter: {
        listHistory: jest.fn().mockResolvedValue({ data: [], error: null }),
        deleteHistoryEntry: jest.fn().mockResolvedValue({ data: null, error: null }),
        clearHistory: jest.fn().mockResolvedValue({ data: null, error: null }),
    },
    getLogger: () => ({ logDebug: jest.fn(), logInfo: jest.fn(), logError: jest.fn(), logWarning: jest.fn() }),
    unwrap: jest.fn((res: { data?: unknown; error?: unknown }) => {
        if (res.error) throw res.error;
        return res.data;
    }),
    tryUnwrap: jest.fn((res: unknown) => res),
}));

import { configureStore } from '@reduxjs/toolkit';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { HistoryHandlerAdapter } from '../../../../../logic/adapter';
import actionsReducer from '../../../../../logic/store/actions/slice';
import editorReducer from '../../../../../logic/store/editor/slice';
import historyReducer from '../../../../../logic/store/history/slice';
import notificationsReducer from '../../../../../logic/store/notifications/slice';
import runReducer from '../../../../../logic/store/run/slice';
import { processPromptChain } from '../../../../../logic/store/run/thunks';
import settingsReducer from '../../../../../logic/store/settings/slice';
import uiReducer from '../../../../../logic/store/ui/slice';
import HistoryRail from '../HistoryRail';

const MOCK_ACTION = {
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

function makeEntry(
    overrides: Partial<{
        id: string;
        title: string;
        kind: string;
        status: string;
        inferences: number;
        inputText: string;
        outputText: string;
        applied: Array<{ id: string; name: string; category: string }>;
        createdAt: number;
    }> = {},
) {
    return {
        id: 'entry-1',
        createdAt: Math.floor(Date.now() / 1000) - 60,
        kind: 'single',
        title: 'Proofread',
        inputText: 'Hello world',
        outputText: 'Hello, world!',
        applied: [{ id: 'proofread', name: 'Proofread', category: 'Writing' }],
        providerName: 'Local',
        model: 'llama',
        inputLang: 'en',
        outputLang: 'en',
        format: 'plain',
        durationMs: 1200,
        inferences: 1,
        status: 'success',
        errorCode: '',
        failedIndex: -1,
        ...overrides,
    };
}

interface StoreOverrides {
    entries?: ReturnType<typeof makeEntry>[];
    historyEnabled?: boolean;
    historyMaxEntries?: number;
    catalog?: (typeof MOCK_ACTION)[];
}

function makeStore(overrides: StoreOverrides = {}) {
    const historyEnabled = overrides.historyEnabled ?? true;
    const historyMaxEntries = overrides.historyMaxEntries ?? 100;
    const entries = overrides.entries ?? [];

    // Sync the listHistory mock with the entries that will be visible after mount
    (HistoryHandlerAdapter.listHistory as jest.Mock).mockResolvedValue({ data: entries, error: null });

    return configureStore({
        reducer: {
            history: historyReducer,
            ui: uiReducer,
            editor: editorReducer,
            actions: actionsReducer,
            settings: settingsReducer,
            notifications: notificationsReducer,
            run: runReducer,
        },
        preloadedState: {
            history: { entries: entries as never, selectedId: null, loading: false, hasMore: false, total: entries.length, staleAfterRun: false },
            ui: {
                layout: 'side' as const,
                sidebarCollapsed: false,
                historyOpen: true,
                inferenceRunning: false,
                currentView: 'main' as const,
                armedActionId: null,
                armedStackId: null,
                activeActionsTab: null,
                buildMode: false,
                editingStackId: null,
                activeSettingsTab: 0,
                theme: { mode: 'auto' as const, effective: 'light' as const },
            },
            editor: { inputContent: '', outputContent: '', viewMode: 'preview' as const },
            actions: {
                catalog: (overrides.catalog ?? [MOCK_ACTION]) as never,
                catalogStatus: 'idle' as const,
                availableModels: [],
                modelsStatus: 'idle' as const,
            },
            settings: { allSettings: { appBehaviorConfig: { historyEnabled, historyMaxEntries } } as never, metadata: null },
            notifications: { queue: [] },
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
        },
    });
}

describe('HistoryRail', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders "History" heading', async () => {
        render(
            <Provider store={makeStore()}>
                <HistoryRail />
            </Provider>,
        );
        await waitFor(() => expect(screen.getByText('History')).toBeInTheDocument());
    });

    it('renders max-entries badge', async () => {
        render(
            <Provider store={makeStore({ historyMaxEntries: 50 })}>
                <HistoryRail />
            </Provider>,
        );
        await waitFor(() => expect(screen.getByText(/50 max/i)).toBeInTheDocument());
    });

    it('shows "No runs yet" when entries list is empty', async () => {
        render(
            <Provider store={makeStore({ entries: [] })}>
                <HistoryRail />
            </Provider>,
        );
        await waitFor(() => expect(screen.getByText(/no runs yet/i)).toBeInTheDocument());
    });

    it('shows "History is disabled" message when historyEnabled is false', async () => {
        render(
            <Provider store={makeStore({ historyEnabled: false })}>
                <HistoryRail />
            </Provider>,
        );
        await waitFor(() => expect(screen.getByText(/history is disabled/i)).toBeInTheDocument());
    });

    it('renders entry cards for each entry', async () => {
        const entries = [makeEntry({ id: 'e-1', title: 'Proofread' }), makeEntry({ id: 'e-2', title: 'Summarise' })];
        render(
            <Provider store={makeStore({ entries })}>
                <HistoryRail />
            </Provider>,
        );
        await waitFor(() => expect(screen.getByText('Proofread')).toBeInTheDocument());
        expect(screen.getByText('Summarise')).toBeInTheDocument();
    });

    it('Clear button is disabled when no entries', async () => {
        render(
            <Provider store={makeStore({ entries: [] })}>
                <HistoryRail />
            </Provider>,
        );
        await waitFor(() => expect(screen.getByRole('button', { name: /clear all history/i })).toBeDisabled());
    });

    it('Clear button is enabled when entries exist', async () => {
        render(
            <Provider store={makeStore({ entries: [makeEntry()] })}>
                <HistoryRail />
            </Provider>,
        );
        await waitFor(() => expect(screen.getByRole('button', { name: /clear all history/i })).toBeEnabled());
    });

    it('clicking Clear opens confirmation dialog', async () => {
        render(
            <Provider store={makeStore({ entries: [makeEntry()] })}>
                <HistoryRail />
            </Provider>,
        );
        await userEvent.click(await screen.findByRole('button', { name: /clear all history/i }));
        expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    });

    it('confirming Clear calls clearHistory adapter', async () => {
        (HistoryHandlerAdapter.clearHistory as jest.Mock).mockResolvedValue({ data: null, error: null });
        render(
            <Provider store={makeStore({ entries: [makeEntry()] })}>
                <HistoryRail />
            </Provider>,
        );
        await userEvent.click(await screen.findByRole('button', { name: /clear all history/i }));
        await userEvent.click(screen.getByRole('button', { name: /clear all/i }));
        await waitFor(() => expect(HistoryHandlerAdapter.clearHistory).toHaveBeenCalledTimes(1));
    });

    it('clicking Delete on an entry calls deleteHistoryEntry adapter', async () => {
        (HistoryHandlerAdapter.deleteHistoryEntry as jest.Mock).mockResolvedValue({ data: null, error: null });
        const entry = makeEntry({ id: 'e-del' });
        render(
            <Provider store={makeStore({ entries: [entry] })}>
                <HistoryRail />
            </Provider>,
        );
        await userEvent.click(await screen.findByRole('button', { name: /delete entry proofread/i }));
        await waitFor(() => expect(HistoryHandlerAdapter.deleteHistoryEntry).toHaveBeenCalledWith('e-del'));
    });

    it('Restore sets editor input and output content', async () => {
        const entry = makeEntry({ inputText: 'hello', outputText: 'world' });
        const store = makeStore({ entries: [entry] });
        render(
            <Provider store={store}>
                <HistoryRail />
            </Provider>,
        );
        await userEvent.click(await screen.findByRole('button', { name: /restore entry proofread/i }));
        expect(store.getState().editor.inputContent).toBe('hello');
        expect(store.getState().editor.outputContent).toBe('world');
    });

    it('Restore re-arms action when it exists in catalog', async () => {
        const entry = makeEntry({ kind: 'single', applied: [{ id: 'proofread', name: 'Proofread', category: 'Writing' }] });
        const store = makeStore({ entries: [entry], catalog: [MOCK_ACTION] });
        render(
            <Provider store={store}>
                <HistoryRail />
            </Provider>,
        );
        await userEvent.click(await screen.findByRole('button', { name: /restore entry proofread/i }));
        expect(store.getState().ui.armedActionId).toBe('proofread');
    });

    it('Restore shows drift warning when action is missing from catalog', async () => {
        const entry = makeEntry({ kind: 'single', applied: [{ id: 'missing-action', name: 'Old Action', category: 'Writing' }] });
        const store = makeStore({ entries: [entry], catalog: [] });
        render(
            <Provider store={store}>
                <HistoryRail />
            </Provider>,
        );
        await userEvent.click(await screen.findByRole('button', { name: /restore entry proofread/i }));
        const notifications = store.getState().notifications.queue;
        expect(notifications.length).toBeGreaterThan(0);
        expect(notifications[0].message).toMatch(/no longer available/i);
    });

    it('renders the inference-count badge for an entry', async () => {
        const entry = makeEntry({ inferences: 3 });
        render(
            <Provider store={makeStore({ entries: [entry] })}>
                <HistoryRail />
            </Provider>,
        );
        await waitFor(() => expect(screen.getByText('3 INF')).toBeInTheDocument());
    });

    it('renders the status word and relative time in the entry footer', async () => {
        const entry = makeEntry({ status: 'success', createdAt: Math.floor(Date.now() / 1000) - 120 });
        render(
            <Provider store={makeStore({ entries: [entry] })}>
                <HistoryRail />
            </Provider>,
        );
        await waitFor(() => expect(screen.getByText('success')).toBeInTheDocument());
        expect(screen.getByText('2m ago')).toBeInTheDocument();
    });

    it('renders both restore and delete controls on a non-selected entry', async () => {
        const entry = makeEntry({ title: 'Proofread' });
        render(
            <Provider store={makeStore({ entries: [entry] })}>
                <HistoryRail />
            </Provider>,
        );
        await waitFor(() => expect(screen.getByRole('button', { name: /restore entry proofread/i })).toBeInTheDocument());
        expect(screen.getByRole('button', { name: /delete entry proofread/i })).toBeInTheDocument();
    });

    it('renders entry cards directly in a native scroll container, not a Radix ScrollArea viewport', async () => {
        // The rail must use a native overflow container so each card is a block-level
        // child constrained to the rail width. A Radix ScrollArea viewport uses an
        // inline display:table wrapper that would shrink-to-fit the widest card and clip it.
        const { container } = render(
            <Provider store={makeStore({ entries: [makeEntry({ id: 'e-1' })] })}>
                <HistoryRail />
            </Provider>,
        );
        const list = await screen.findByLabelText('History entries');
        expect(list.closest('[data-radix-scroll-area-viewport]')).toBeNull();
        expect(container.querySelector('[data-radix-scroll-area-viewport]')).toBeNull();
    });

    it('loads history on mount via listHistory adapter', async () => {
        render(
            <Provider store={makeStore()}>
                <HistoryRail />
            </Provider>,
        );
        await waitFor(() => expect(HistoryHandlerAdapter.listHistory).toHaveBeenCalledWith(100, 0));
    });

    it('refetches history automatically when a chain run completes, without toggling the rail', async () => {
        const store = makeStore({ entries: [] });
        render(
            <Provider store={store}>
                <HistoryRail />
            </Provider>,
        );
        await waitFor(() => expect(HistoryHandlerAdapter.listHistory).toHaveBeenCalledTimes(1));

        const newEntry = makeEntry({ id: 'new-run', title: 'Fresh run' });
        (HistoryHandlerAdapter.listHistory as jest.Mock).mockResolvedValueOnce({ data: [newEntry], error: null });

        store.dispatch({ type: processPromptChain.pending.type, meta: { arg: { runId: 'r1' } } });
        store.dispatch({ type: processPromptChain.fulfilled.type, payload: { data: { finalText: 'ok' }, error: null } });

        await waitFor(() => expect(HistoryHandlerAdapter.listHistory).toHaveBeenCalledTimes(2));
        await waitFor(() => expect(screen.getByText('Fresh run')).toBeInTheDocument());
    });

    it('refetches history automatically when a chain run rejects, without toggling the rail', async () => {
        const store = makeStore({ entries: [] });
        render(
            <Provider store={store}>
                <HistoryRail />
            </Provider>,
        );
        await waitFor(() => expect(HistoryHandlerAdapter.listHistory).toHaveBeenCalledTimes(1));

        store.dispatch({ type: processPromptChain.pending.type, meta: { arg: { runId: 'r2' } } });
        store.dispatch({ type: processPromptChain.rejected.type, payload: 'network error' });

        await waitFor(() => expect(HistoryHandlerAdapter.listHistory).toHaveBeenCalledTimes(2));
    });
});
