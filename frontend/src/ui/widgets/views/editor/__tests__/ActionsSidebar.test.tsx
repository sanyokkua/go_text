import { configureStore } from '@reduxjs/toolkit';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import actionsReducer from '../../../../../logic/store/actions/slice';
import notificationsReducer from '../../../../../logic/store/notifications/slice';
import stacksBuilderReducer from '../../../../../logic/store/stacks/builder/slice';
import stacksSavedReducer from '../../../../../logic/store/stacks/saved/slice';
import uiReducer from '../../../../../logic/store/ui/slice';
import ActionsSidebar from '../ActionsSidebar';

jest.mock('../../../../../logic/adapter', () => ({
    getLogger: () => ({ logInfo: jest.fn(), logDebug: jest.fn(), logError: jest.fn(), logWarn: jest.fn() }),
}));

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

const MOCK_STACK = {
    id: 'stack-1',
    name: 'My Pipeline',
    icon: '📝',
    steps: ['proofread'],
    defaultFormat: 'PlainText',
    defaultInLang: '',
    defaultOutLang: '',
    createdAt: 0,
    updatedAt: 0,
};

interface StoreOverrides {
    ui?: object;
    stacksBuilder?: object;
    stacks?: object[];
    catalog?: object[];
}

function makeStore(overrides: StoreOverrides = {}) {
    return configureStore({
        reducer: {
            actions: actionsReducer,
            ui: uiReducer,
            stacksBuilder: stacksBuilderReducer,
            stacksSaved: stacksSavedReducer,
            notifications: notificationsReducer,
        },
        preloadedState: {
            actions: {
                catalog: (overrides.catalog ?? [MOCK_ACTION]) as never,
                catalogStatus: 'success' as const,
                availableModels: [],
                modelsStatus: 'idle' as const,
            },
            ui: {
                layout: 'side' as const,
                sidebarCollapsed: false,
                historyOpen: false,
                inferenceRunning: false,
                currentView: 'main' as const,
                armedActionId: null,
                armedStackId: null,
                activeActionsTab: 'Writing',
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
                ...(overrides.ui ?? {}),
            },
            stacksBuilder: { steps: [], name: '', icon: '', ...(overrides.stacksBuilder ?? {}) },
            stacksSaved: { stacks: (overrides.stacks ?? []) as never, status: 'idle' as const, error: null },
            notifications: { queue: [] },
        },
    });
}

describe('ActionsSidebar — normal mode', () => {
    it('renders action rows from catalog', () => {
        render(
            <Provider store={makeStore()}>
                <ActionsSidebar />
            </Provider>,
        );
        expect(screen.getByText('Proofread')).toBeInTheDocument();
    });

    it('shows My Stacks section header', () => {
        render(
            <Provider store={makeStore()}>
                <ActionsSidebar />
            </Provider>,
        );
        expect(screen.getByText(/my stacks/i)).toBeInTheDocument();
    });

    it('shows Manage link when stacks exist', () => {
        render(
            <Provider store={makeStore({ stacks: [MOCK_STACK] })}>
                <ActionsSidebar />
            </Provider>,
        );
        expect(screen.getByRole('button', { name: /manage/i })).toBeInTheDocument();
    });

    it('shows saved stack names in sidebar', () => {
        render(
            <Provider store={makeStore({ stacks: [MOCK_STACK] })}>
                <ActionsSidebar />
            </Provider>,
        );
        expect(screen.getByText('My Pipeline')).toBeInTheDocument();
    });

    it('shows Build a stack button', () => {
        render(
            <Provider store={makeStore()}>
                <ActionsSidebar />
            </Provider>,
        );
        expect(screen.getByRole('button', { name: /build a stack/i })).toBeInTheDocument();
    });

    it('clicking Build a stack enters build mode', async () => {
        const store = makeStore();
        render(
            <Provider store={store}>
                <ActionsSidebar />
            </Provider>,
        );
        await userEvent.click(screen.getByRole('button', { name: /build a stack/i }));
        expect(store.getState().ui.buildMode).toBe(true);
    });

    it('clicking Manage navigates to stacks view', async () => {
        const store = makeStore({ stacks: [MOCK_STACK] });
        render(
            <Provider store={store}>
                <ActionsSidebar />
            </Provider>,
        );
        await userEvent.click(screen.getByRole('button', { name: /manage/i }));
        expect(store.getState().ui.currentView).toBe('stacks');
    });

    it('clicking a saved stack arms it', async () => {
        const store = makeStore({ stacks: [MOCK_STACK] });
        render(
            <Provider store={store}>
                <ActionsSidebar />
            </Provider>,
        );
        await userEvent.click(screen.getByRole('button', { name: /my pipeline/i }));
        expect(store.getState().ui.armedStackId).toBe('stack-1');
    });

    it('an armed stack row is marked as pressed', () => {
        render(
            <Provider store={makeStore({ stacks: [MOCK_STACK], ui: { armedStackId: 'stack-1' } })}>
                <ActionsSidebar />
            </Provider>,
        );
        expect(screen.getByRole('button', { name: /my pipeline/i })).toHaveAttribute('aria-pressed', 'true');
    });

    it('arming an action clears a previously armed stack', async () => {
        const store = makeStore({ stacks: [MOCK_STACK], ui: { armedStackId: 'stack-1' } });
        render(
            <Provider store={store}>
                <ActionsSidebar />
            </Provider>,
        );
        await userEvent.click(screen.getByRole('button', { name: /proofread/i }));
        expect(store.getState().ui.armedActionId).toBe('proofread');
        expect(store.getState().ui.armedStackId).toBeNull();
    });

    it('clicking an already-armed action deselects it', async () => {
        const store = makeStore({ ui: { armedActionId: 'proofread' } });
        render(
            <Provider store={store}>
                <ActionsSidebar />
            </Provider>,
        );
        await userEvent.click(screen.getByRole('button', { name: /proofread/i }));
        expect(store.getState().ui.armedActionId).toBeNull();
    });

    it('clicking a different, unarmed action still arms it', async () => {
        const secondAction = {
            id: 'summarize',
            name: 'Summarize',
            category: 'Writing',
            family: 'summarize',
            directive: '',
            orderRank: 20,
            exclusivityGroup: '',
            mergeable: false,
            terminal: true,
            requires: [],
        };
        const store = makeStore({ catalog: [MOCK_ACTION, secondAction], ui: { armedActionId: 'proofread' } });
        render(
            <Provider store={store}>
                <ActionsSidebar />
            </Provider>,
        );
        await userEvent.click(screen.getByRole('button', { name: /summarize/i }));
        expect(store.getState().ui.armedActionId).toBe('summarize');
    });
});

describe('ActionsSidebar — build mode', () => {
    it('shows "click to add a step" hint', () => {
        render(
            <Provider store={makeStore({ ui: { buildMode: true } })}>
                <ActionsSidebar />
            </Provider>,
        );
        expect(screen.getByText(/click to add a step/i)).toBeInTheDocument();
    });

    it('clicking an action in build mode adds it to builder steps', async () => {
        const store = makeStore({ ui: { buildMode: true } });
        render(
            <Provider store={store}>
                <ActionsSidebar />
            </Provider>,
        );
        await userEvent.click(screen.getByText('Proofread'));
        expect(store.getState().stacksBuilder.steps).toContain('proofread');
    });

    it('shows ✓ for already-selected actions in build mode', () => {
        render(
            <Provider store={makeStore({ ui: { buildMode: true }, stacksBuilder: { steps: ['proofread'] } })}>
                <ActionsSidebar />
            </Provider>,
        );
        expect(screen.getAllByText('✓').length).toBeGreaterThan(0);
    });

    it('disables action row when it is blocked by exclusivity', () => {
        const toneFriendly = {
            id: 'tone-friendly',
            name: 'Friendly',
            category: 'Writing',
            family: 'rewrite',
            directive: '',
            orderRank: 30,
            exclusivityGroup: 'tone',
            mergeable: true,
            terminal: false,
            requires: [],
        };
        const toneFormal = {
            id: 'tone-formal',
            name: 'Formal',
            category: 'Writing',
            family: 'rewrite',
            directive: '',
            orderRank: 31,
            exclusivityGroup: 'tone',
            mergeable: true,
            terminal: false,
            requires: [],
        };
        render(
            <Provider store={makeStore({ catalog: [toneFormal, toneFriendly], ui: { buildMode: true }, stacksBuilder: { steps: ['tone-formal'] } })}>
                <ActionsSidebar />
            </Provider>,
        );
        const friendlyBtn = screen.getByRole('button', { name: /friendly/i });
        expect(friendlyBtn).toBeDisabled();
    });
});
