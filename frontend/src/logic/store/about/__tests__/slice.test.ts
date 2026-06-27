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
    ActionHandlerAdapter: { previewPrompt: jest.fn() },
    SettingsHandlerAdapter: {},
}));

import aboutReducer, { clearAboutSelection } from '../slice';
import { previewPromptForInspector } from '../thunks';
import { AboutState } from '../types';

const initialState: AboutState = {
    activeSection: 'guide',
    selectedItemId: null,
    selectedItemType: null,
    inspectorOpen: false,
    inspectorLoading: false,
    inspectorData: null,
    inspectorError: null,
    previewInputEnabled: false,
};

describe('aboutSlice', () => {
    it('returns initial state with inspectorError null', () => {
        expect(aboutReducer(undefined, { type: 'unknown' })).toEqual(initialState);
    });

    it('sets inspectorError on previewPromptForInspector rejected', () => {
        const action = {
            type: previewPromptForInspector.rejected.type,
            payload: 'Preview failed',
        };
        const state = aboutReducer(initialState, action);
        expect(state.inspectorError).toBe('Preview failed');
        expect(state.inspectorLoading).toBe(false);
    });

    it('clears inspectorError on previewPromptForInspector pending', () => {
        const stateWithError: AboutState = { ...initialState, inspectorError: 'old error' };
        const action = { type: previewPromptForInspector.pending.type };
        const state = aboutReducer(stateWithError, action);
        expect(state.inspectorError).toBeNull();
        expect(state.inspectorLoading).toBe(true);
    });

    it('clears inspectorError on previewPromptForInspector fulfilled', () => {
        const stateWithError: AboutState = { ...initialState, inspectorError: 'old error' };
        const mockPreview = { kind: 'single', inferences: 1, groups: [], summary: '' };
        const action = { type: previewPromptForInspector.fulfilled.type, payload: mockPreview };
        const state = aboutReducer(stateWithError, action);
        expect(state.inspectorError).toBeNull();
        expect(state.inspectorData).toEqual(mockPreview);
    });

    it('clears inspectorError when clearAboutSelection is dispatched', () => {
        const stateWithError: AboutState = {
            ...initialState,
            selectedItemId: 'a1',
            selectedItemType: 'action',
            inspectorError: 'stale error',
        };
        const state = aboutReducer(stateWithError, clearAboutSelection());
        expect(state.inspectorError).toBeNull();
        expect(state.selectedItemId).toBeNull();
    });
});
