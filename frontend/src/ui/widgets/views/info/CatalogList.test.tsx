// Mock the adapter before any imports so module-level calls to getLogger and
// the Wails bridge (ActionHandlerAdapter.previewPrompt) don't reach native code.
jest.mock('../../../../logic/adapter', () => ({
    getLogger: jest
        .fn()
        .mockReturnValue({
            logDebug: jest.fn(),
            logInfo: jest.fn(),
            logError: jest.fn(),
            logWarning: jest.fn(),
            logTrace: jest.fn(),
            logPrint: jest.fn(),
            logFatal: jest.fn(),
        }),
    unwrap: jest.fn((res: { data?: unknown; error?: unknown }) => {
        if (res.error) throw res.error;
        return res.data;
    }),
    tryUnwrap: jest.fn((res: { data?: unknown; error?: unknown }) => res),
    ActionHandlerAdapter: { previewPrompt: jest.fn().mockResolvedValue({ data: null, error: null }) },
    SettingsHandlerAdapter: {},
    StackHandler: {},
}));

import { configureStore } from '@reduxjs/toolkit';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import aboutReducer from '../../../../logic/store/about/slice';
import actionsReducer from '../../../../logic/store/actions/slice';
import CatalogList from './CatalogList';

function buildStore(overrides = {}) {
    return configureStore({
        reducer: {
            about: aboutReducer,
            actions: actionsReducer,
            stacksSaved: (() => ({ stacks: [], status: 'idle', error: null })) as unknown as typeof actionsReducer,
            settings: (() => ({ allSettings: null, metadata: null })) as unknown as typeof actionsReducer,
            editor: (() => ({ inputContent: '', outputContent: '', viewMode: 'split' })) as unknown as typeof actionsReducer,
        },
        preloadedState: {
            actions: {
                catalog: [
                    {
                        id: 'act-1',
                        name: 'Summarise',
                        category: 'Writing',
                        family: 'single',
                        directive: '',
                        orderRank: 0,
                        exclusivityGroup: '',
                        mergeable: false,
                        terminal: true,
                        requires: [],
                    },
                ],
                catalogStatus: 'success' as const,
                availableModels: [],
                modelsStatus: 'idle' as const,
            },
            ...overrides,
        },
    });
}

describe('CatalogList', () => {
    it('renders action names from the catalog', () => {
        render(
            <Provider store={buildStore()}>
                <CatalogList />
            </Provider>,
        );
        expect(screen.getByText('Summarise')).toBeInTheDocument();
    });

    it('filters actions by search query', async () => {
        render(
            <Provider store={buildStore()}>
                <CatalogList />
            </Provider>,
        );
        await userEvent.type(screen.getByRole('textbox', { name: /filter/i }), 'xyznotfound');
        expect(screen.queryByText('Summarise')).not.toBeInTheDocument();
        expect(screen.getByText(/No results/)).toBeInTheDocument();
    });

    it('dispatches selectAboutItem when an action is clicked', async () => {
        const store = buildStore();
        render(
            <Provider store={store}>
                <CatalogList />
            </Provider>,
        );
        await userEvent.click(screen.getByRole('button', { name: 'Summarise' }));
        const state = store.getState().about;
        expect(state.selectedItemId).toBe('act-1');
        expect(state.selectedItemType).toBe('action');
    });
});
