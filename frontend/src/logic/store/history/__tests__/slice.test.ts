// Mock the adapter before any imports so module-level getLogger calls in thunks succeed.
jest.mock('../../../adapter', () => ({
    getLogger: jest.fn().mockReturnValue({ logDebug: jest.fn(), logInfo: jest.fn(), logError: jest.fn(), logWarning: jest.fn() }),
    unwrap: jest.fn((res: { data?: unknown; error?: unknown }) => {
        if (res.error) throw res.error;
        return res.data;
    }),
    tryUnwrap: jest.fn((res: { data?: unknown; error?: unknown }) => res),
}));

import { processPromptChain } from '../../run/thunks';
import historyReducer, { clearHistorySelection, selectHistoryEntry } from '../slice';
import { clearHistory, deleteHistoryEntry, listHistory } from '../thunks';
import type { HistoryState } from '../types';

const initialState: HistoryState = { entries: [], selectedId: null, loading: false, hasMore: true, total: 0, staleAfterRun: false };

const makeEntry = (id: string) => ({ id, timestamp: '2026-01-01T00:00:00Z', prompt: 'p', result: 'r' }) as unknown as HistoryState['entries'][0];

describe('history slice reducer', () => {
    it('returns initial state for unknown action', () => {
        expect(historyReducer(undefined, { type: '@@INIT' })).toEqual(initialState);
    });

    it('selectHistoryEntry sets selectedId', () => {
        const state = historyReducer(initialState, selectHistoryEntry('entry-123'));

        expect(state.selectedId).toBe('entry-123');
    });

    it('clearHistorySelection clears selectedId back to null', () => {
        const stateWithSelection: HistoryState = { ...initialState, selectedId: 'entry-123' };

        const state = historyReducer(stateWithSelection, clearHistorySelection());

        expect(state.selectedId).toBeNull();
    });

    it('listHistory.pending sets loading to true', () => {
        const action = { type: listHistory.pending.type };

        const state = historyReducer(initialState, action);

        expect(state.loading).toBe(true);
    });

    it('listHistory.fulfilled populates entries, updates hasMore, and sets total', () => {
        const entries = [makeEntry('e-1'), makeEntry('e-2')];
        const action = { type: listHistory.fulfilled.type, payload: { entries, hasMore: true } };

        const state = historyReducer(initialState, action);

        expect(state.loading).toBe(false);
        expect(state.entries).toEqual(entries);
        expect(state.hasMore).toBe(true);
        expect(state.total).toBe(2);
    });

    it('listHistory.rejected sets loading to false', () => {
        const loadingState: HistoryState = { ...initialState, loading: true };
        const action = { type: listHistory.rejected.type };

        const state = historyReducer(loadingState, action);

        expect(state.loading).toBe(false);
    });

    it('deleteHistoryEntry.fulfilled removes the entry with the matching id and updates total', () => {
        const entries = [makeEntry('e-1'), makeEntry('e-2'), makeEntry('e-3')];
        const stateWithEntries: HistoryState = { ...initialState, entries, total: 3 };
        const action = { type: deleteHistoryEntry.fulfilled.type, payload: 'e-2' };

        const state = historyReducer(stateWithEntries, action);

        expect(state.entries).toHaveLength(2);
        expect(state.entries.find((e) => e.id === 'e-2')).toBeUndefined();
        expect(state.total).toBe(2);
    });

    it('clearHistory.fulfilled resets entries, total, selectedId, and hasMore to false', () => {
        const populatedState: HistoryState = {
            entries: [makeEntry('e-1')],
            selectedId: 'e-1',
            loading: false,
            hasMore: true,
            total: 1,
            staleAfterRun: false,
        };
        const action = { type: clearHistory.fulfilled.type };

        const state = historyReducer(populatedState, action);

        expect(state.entries).toEqual([]);
        expect(state.total).toBe(0);
        expect(state.selectedId).toBeNull();
        expect(state.hasMore).toBe(false);
    });

    it('processPromptChain.fulfilled marks history stale after a run completes', () => {
        const action = { type: processPromptChain.fulfilled.type };

        const state = historyReducer(initialState, action);

        expect(state.staleAfterRun).toBe(true);
    });

    it('processPromptChain.rejected marks history stale after a failed run', () => {
        const action = { type: processPromptChain.rejected.type };

        const state = historyReducer(initialState, action);

        expect(state.staleAfterRun).toBe(true);
    });

    it('listHistory.fulfilled clears staleAfterRun back to false', () => {
        const staleState: HistoryState = { ...initialState, staleAfterRun: true };
        const action = { type: listHistory.fulfilled.type, payload: { entries: [], hasMore: false } };

        const state = historyReducer(staleState, action);

        expect(state.staleAfterRun).toBe(false);
    });
});
