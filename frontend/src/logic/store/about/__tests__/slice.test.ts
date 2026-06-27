// Mock the adapter before any imports so module-level getLogger calls in thunks succeed.
jest.mock('../../../adapter', () => ({
    getLogger: jest.fn().mockReturnValue({
        logDebug: jest.fn(),
        logInfo: jest.fn(),
        logError: jest.fn(),
        logWarning: jest.fn(),
    }),
    unwrap: jest.fn((res: { data?: unknown; error?: unknown }) => {
        if (res.error) throw res.error;
        return res.data;
    }),
    tryUnwrap: jest.fn((res: { data?: unknown; error?: unknown }) => res),
}));

import aboutReducer, {
    clearAboutSelection,
    selectAboutItem,
    setAboutSection,
    setInspectorOpen,
    togglePreviewInput,
} from '../slice';
import { previewPromptForInspector } from '../thunks';
import type { AboutState } from '../types';

const initialState: AboutState = {
    activeSection: 'guide',
    selectedItemId: null,
    selectedItemType: null,
    inspectorOpen: false,
    inspectorLoading: false,
    inspectorData: null,
    previewInputEnabled: false,
};

describe('about slice reducer', () => {
    it('returns initial state for unknown action', () => {
        expect(aboutReducer(undefined, { type: '@@INIT' })).toEqual(initialState);
    });

    it('setAboutSection changes the activeSection', () => {
        const state = aboutReducer(initialState, setAboutSection('actions-stacks'));

        expect(state.activeSection).toBe('actions-stacks');
    });

    it('selectAboutItem sets selectedItemId, selectedItemType, and opens the inspector', () => {
        const state = aboutReducer(initialState, selectAboutItem({ id: 'action-7', type: 'action' }));

        expect(state.selectedItemId).toBe('action-7');
        expect(state.selectedItemType).toBe('action');
        expect(state.inspectorOpen).toBe(true);
    });

    it('clearAboutSelection resets selection fields and closes the inspector', () => {
        const openState: AboutState = {
            ...initialState,
            selectedItemId: 'action-7',
            selectedItemType: 'action',
            inspectorOpen: true,
            inspectorData: { promptText: 'preview' } as unknown as AboutState['inspectorData'],
        };

        const state = aboutReducer(openState, clearAboutSelection());

        expect(state.selectedItemId).toBeNull();
        expect(state.selectedItemType).toBeNull();
        expect(state.inspectorData).toBeNull();
        expect(state.inspectorOpen).toBe(false);
    });

    it('togglePreviewInput flips previewInputEnabled from false to true', () => {
        const state = aboutReducer(initialState, togglePreviewInput());

        expect(state.previewInputEnabled).toBe(true);
    });

    it('togglePreviewInput flips previewInputEnabled from true back to false', () => {
        const enabledState: AboutState = { ...initialState, previewInputEnabled: true };

        const state = aboutReducer(enabledState, togglePreviewInput());

        expect(state.previewInputEnabled).toBe(false);
    });

    it('setInspectorOpen(false) closes the inspector', () => {
        const openState: AboutState = { ...initialState, inspectorOpen: true };

        const state = aboutReducer(openState, setInspectorOpen(false));

        expect(state.inspectorOpen).toBe(false);
    });

    it('previewPromptForInspector.pending sets inspectorLoading to true and clears inspectorData', () => {
        const stateWithData: AboutState = {
            ...initialState,
            inspectorData: { promptText: 'old' } as unknown as AboutState['inspectorData'],
        };
        const action = { type: previewPromptForInspector.pending.type };

        const state = aboutReducer(stateWithData, action);

        expect(state.inspectorLoading).toBe(true);
        expect(state.inspectorData).toBeNull();
    });

    it('previewPromptForInspector.fulfilled sets inspectorLoading to false and stores payload as inspectorData', () => {
        const loadingState: AboutState = { ...initialState, inspectorLoading: true };
        const preview = { promptText: 'Hello, {{user_text}}' };
        const action = {
            type: previewPromptForInspector.fulfilled.type,
            payload: preview,
        };

        const state = aboutReducer(loadingState, action);

        expect(state.inspectorLoading).toBe(false);
        expect(state.inspectorData).toEqual(preview);
    });

    it('previewPromptForInspector.rejected sets inspectorLoading to false', () => {
        const loadingState: AboutState = { ...initialState, inspectorLoading: true };
        const action = { type: previewPromptForInspector.rejected.type };

        const state = aboutReducer(loadingState, action);

        expect(state.inspectorLoading).toBe(false);
    });
});
