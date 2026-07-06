import { apperr } from '../../../../wailsjs/go/models';

export type RunStatus = 'idle' | 'running' | 'done' | 'partial' | 'error' | 'cancelled';

export interface StepProgress {
    runId: string;
    groupIndex: number;
    totalGroups: number;
    family: string;
    status: 'running' | 'done' | 'failed';
}

export interface RunState {
    status: RunStatus;
    runId: string | null;
    currentGroupIndex: number | null;
    totalGroups: number | null;
    currentGroupFamily: string | null;
    failedIndex: number | null;
    partialOutput: string | null;
    errorCode: apperr.ErrorCode | null;
    errorMessage: string | null;
}
