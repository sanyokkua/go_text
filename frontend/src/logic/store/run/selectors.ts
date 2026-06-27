import { RootState } from '../index';
import { RunState, StepProgress } from './types';

export const selectRunStatus = (state: RootState): RunState['status'] => state.run.status;
export const selectRunId = (state: RootState): string | null => state.run.runId;
export const selectRunPartialOutput = (state: RootState): string | null => state.run.partialOutput;
export const selectRunErrorCode = (state: RootState): RunState['errorCode'] => state.run.errorCode;
export const selectRunErrorMessage = (state: RootState): string | null => state.run.errorMessage;
export const selectRunFailedIndex = (state: RootState): number | null => state.run.failedIndex;

export const selectRunProgress = (state: RootState): Pick<StepProgress, 'groupIndex' | 'totalGroups' | 'family'> | null => {
    const { currentGroupIndex, totalGroups, currentGroupFamily } = state.run;
    if (currentGroupIndex === null || totalGroups === null || currentGroupFamily === null) return null;
    return { groupIndex: currentGroupIndex, totalGroups, family: currentGroupFamily };
};
