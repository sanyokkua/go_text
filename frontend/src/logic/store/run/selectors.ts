import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '../index';
import { RunState, StepProgress } from './types';

export const selectRunStatus = (state: RootState): RunState['status'] => state.run.status;
export const selectRunId = (state: RootState): string | null => state.run.runId;
export const selectRunPartialOutput = (state: RootState): string | null => state.run.partialOutput;
export const selectRunErrorCode = (state: RootState): RunState['errorCode'] => state.run.errorCode;
export const selectRunErrorMessage = (state: RootState): string | null => state.run.errorMessage;
export const selectRunFailedIndex = (state: RootState): number | null => state.run.failedIndex;

const selectCurrentGroupIndex = (state: RootState): number | null => state.run.currentGroupIndex;
const selectTotalGroups = (state: RootState): number | null => state.run.totalGroups;
const selectCurrentGroupFamily = (state: RootState): string | null => state.run.currentGroupFamily;

export const selectRunProgress = createSelector(
    [selectCurrentGroupIndex, selectTotalGroups, selectCurrentGroupFamily],
    (currentGroupIndex, totalGroups, currentGroupFamily): Pick<StepProgress, 'groupIndex' | 'totalGroups' | 'family'> | null => {
        if (currentGroupIndex === null || totalGroups === null || currentGroupFamily === null) return null;
        return { groupIndex: currentGroupIndex, totalGroups, family: currentGroupFamily };
    },
);
