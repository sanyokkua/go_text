import { apperr } from '../../../../wailsjs/go/models';

export interface HistoryState {
    entries: apperr.HistoryEntry[];
    selectedId: string | null;
    loading: boolean;
    hasMore: boolean;
    total: number;
}

export interface ListHistoryArgs {
    page: number;
    pageSize: number;
}

export interface ListHistoryResult {
    entries: apperr.HistoryEntry[];
    hasMore: boolean;
}
