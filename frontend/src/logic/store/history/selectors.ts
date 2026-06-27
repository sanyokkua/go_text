import { createSelector } from '@reduxjs/toolkit';
import { apperr } from '../../../../wailsjs/go/models';
import { RootState } from '../index';

export const selectHistoryEntries = (state: RootState): apperr.HistoryEntry[] => state.history.entries;
export const selectSelectedHistoryId = (state: RootState): string | null => state.history.selectedId;
export const selectHistoryHasMore = (state: RootState): boolean => state.history.hasMore;
export const selectHistoryLoading = (state: RootState): boolean => state.history.loading;
export const selectHistoryTotal = (state: RootState): number => state.history.total;

export const selectSelectedHistoryEntry = createSelector(
    [selectHistoryEntries, selectSelectedHistoryId],
    (entries, selectedId): apperr.HistoryEntry | null => {
        if (!selectedId) return null;
        return entries.find((entry) => entry.id === selectedId) ?? null;
    },
);
