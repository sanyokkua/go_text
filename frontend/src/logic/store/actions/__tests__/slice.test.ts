// Mock the adapter before any imports so module-level getLogger calls succeed.
jest.mock('../../../adapter', () => ({
    getLogger: jest.fn().mockReturnValue({
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
    ActionHandlerAdapter: { processPromptChain: jest.fn(), cancelChain: jest.fn() },
    SettingsHandlerAdapter: {},
}));

import actionsReducer from '../slice';
import { loadActionCatalog, loadModels, loadModelsForProvider } from '../thunks';
import type { ActionsCatalogState } from '../types';

const initialState: ActionsCatalogState = {
    catalog: [],
    catalogStatus: 'idle',
    availableModels: [],
    modelsStatus: 'idle',
};

describe('actions slice reducer', () => {
    it('returns initial state for unknown action', () => {
        expect(actionsReducer(undefined, { type: '@@INIT' })).toEqual(initialState);
    });

    it('loadActionCatalog.pending sets catalogStatus to loading', () => {
        const action = { type: loadActionCatalog.pending.type };

        const state = actionsReducer(initialState, action);

        expect(state.catalogStatus).toBe('loading');
    });

    it('loadActionCatalog.fulfilled populates catalog and sets catalogStatus to success', () => {
        const catalog = [{ id: 'action-1', name: 'Summarise', group: 'text' }];
        const action = {
            type: loadActionCatalog.fulfilled.type,
            payload: catalog,
        };

        const state = actionsReducer(initialState, action);

        expect(state.catalog).toEqual(catalog);
        expect(state.catalogStatus).toBe('success');
    });

    it('loadActionCatalog.rejected sets catalogStatus to error', () => {
        const action = {
            type: loadActionCatalog.rejected.type,
            payload: 'Failed to load catalog',
            error: { message: 'Rejected' },
        };

        const state = actionsReducer(initialState, action);

        expect(state.catalogStatus).toBe('error');
    });

    it('loadModels.pending sets modelsStatus to loading', () => {
        const action = { type: loadModels.pending.type };

        const state = actionsReducer(initialState, action);

        expect(state.modelsStatus).toBe('loading');
    });

    it('loadModels.fulfilled populates availableModels and sets modelsStatus to success', () => {
        const models = [{ id: 'model-gpt4', name: 'GPT-4' }];
        const action = {
            type: loadModels.fulfilled.type,
            payload: models,
        };

        const state = actionsReducer(initialState, action);

        expect(state.availableModels).toEqual(models);
        expect(state.modelsStatus).toBe('success');
    });

    it('loadModels.rejected sets modelsStatus to error', () => {
        const action = {
            type: loadModels.rejected.type,
            payload: 'Failed to load models',
            error: { message: 'Rejected' },
        };

        const state = actionsReducer(initialState, action);

        expect(state.modelsStatus).toBe('error');
    });

    it('loadModelsForProvider.pending sets modelsStatus to loading', () => {
        const action = { type: loadModelsForProvider.pending.type };

        const state = actionsReducer(initialState, action);

        expect(state.modelsStatus).toBe('loading');
    });

    it('loadModelsForProvider.fulfilled updates availableModels and sets modelsStatus to success', () => {
        const models = [{ id: 'model-claude', name: 'Claude 3' }];
        const action = {
            type: loadModelsForProvider.fulfilled.type,
            payload: models,
        };

        const state = actionsReducer(initialState, action);

        expect(state.availableModels).toEqual(models);
        expect(state.modelsStatus).toBe('success');
    });

    it('loadModelsForProvider.rejected sets modelsStatus to error', () => {
        const action = {
            type: loadModelsForProvider.rejected.type,
            payload: 'Failed to load provider models',
            error: { message: 'Rejected' },
        };

        const state = actionsReducer(initialState, action);

        expect(state.modelsStatus).toBe('error');
    });
});
