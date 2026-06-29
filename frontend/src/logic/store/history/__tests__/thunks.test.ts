// Mock the adapter before any imports so module-level getLogger calls in thunks succeed
// and the HistoryHandlerAdapter boundary can be stubbed per-test.
jest.mock('../../../adapter', () => ({
    getLogger: jest.fn().mockReturnValue({ logDebug: jest.fn(), logInfo: jest.fn(), logError: jest.fn(), logWarning: jest.fn() }),
    unwrap: jest.fn((res: { data?: unknown; error?: unknown }) => {
        if (res.error) throw res.error;
        return res.data;
    }),
    tryUnwrap: jest.fn((res: { data?: unknown; error?: unknown }) => res),
    HistoryHandlerAdapter: { listHistory: jest.fn() },
}));

import { configureStore } from '@reduxjs/toolkit';
import { HistoryHandlerAdapter } from '../../../adapter';
import historyReducer from '../slice';
import { listHistory } from '../thunks';

const mockedListHistory = HistoryHandlerAdapter.listHistory as jest.Mock;

const makeEntries = (count: number): Array<{ id: string }> => Array.from({ length: count }, (_, index) => ({ id: `entry-${index}` }));

const makeStore = () => configureStore({ reducer: { history: historyReducer } });

describe('listHistory thunk hasMore computation', () => {
    afterEach(() => {
        mockedListHistory.mockReset();
    });

    it('sets hasMore to true when the adapter returns exactly limit entries', async () => {
        // Arrange
        const limit = 5;
        mockedListHistory.mockResolvedValue({ data: makeEntries(limit), error: null });
        const store = makeStore();

        // Act
        await store.dispatch(listHistory({ limit, offset: 0 }));

        // Assert
        expect(store.getState().history.hasMore).toBe(true);
    });

    it('sets hasMore to false when the adapter returns fewer than limit entries', async () => {
        // Arrange
        const limit = 5;
        mockedListHistory.mockResolvedValue({ data: makeEntries(limit - 1), error: null });
        const store = makeStore();

        // Act
        await store.dispatch(listHistory({ limit, offset: 0 }));

        // Assert
        expect(store.getState().history.hasMore).toBe(false);
    });
});
