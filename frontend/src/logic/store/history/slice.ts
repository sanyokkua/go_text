import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { clearHistory, deleteHistoryEntry, getHistoryEntry, listHistory } from './thunks';
import { HistoryState } from './types';

const initialState: HistoryState = {
    entries: [],
    selectedId: null,
    loading: false,
    hasMore: true,
    total: 0,
};

const historySlice = createSlice({
    name: 'history',
    initialState,
    reducers: {
        selectHistoryEntry(state, action: PayloadAction<string>) {
            state.selectedId = action.payload;
        },
        clearHistorySelection(state) {
            state.selectedId = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(listHistory.pending, (state) => {
                state.loading = true;
            })
            .addCase(listHistory.fulfilled, (state, action) => {
                state.loading = false;
                state.entries = action.payload.entries;
                state.hasMore = action.payload.hasMore;
                state.total = action.payload.entries.length;
            })
            .addCase(listHistory.rejected, (state) => {
                state.loading = false;
            })
            .addCase(deleteHistoryEntry.fulfilled, (state, action) => {
                state.entries = state.entries.filter((entry) => entry.id !== action.payload);
                state.total = state.entries.length;
            })
            .addCase(clearHistory.fulfilled, (state) => {
                state.entries = [];
                state.total = 0;
                state.selectedId = null;
                state.hasMore = false;
            })
            .addCase(getHistoryEntry.pending, (state) => {
                state.loading = true;
            })
            .addCase(getHistoryEntry.fulfilled, (state) => {
                state.loading = false;
            })
            .addCase(getHistoryEntry.rejected, (state) => {
                state.loading = false;
            });
    },
});

export const { selectHistoryEntry, clearHistorySelection } = historySlice.actions;
export default historySlice.reducer;
