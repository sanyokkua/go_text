import { RootState } from '../index';

// Basic selectors
export const selectClipboardLoading = (state: RootState): boolean => state.clipboard.loading;

export const selectClipboardLastActionSuccess = (state: RootState): boolean | null => state.clipboard.lastActionSuccess;

export const selectClipboardError = (state: RootState): string | null => state.clipboard.error;

// Derived selectors
export const selectIsClipboardOperationSuccessful = (state: RootState): boolean => state.clipboard.lastActionSuccess === true;

export const selectIsClipboardOperationFailed = (state: RootState): boolean => state.clipboard.lastActionSuccess === false;
