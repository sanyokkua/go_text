import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RunState, StepProgress } from './types';
import { cancelChain, processPromptChain } from './thunks';

const initialState: RunState = {
    status: 'idle',
    runId: null,
    currentGroupIndex: null,
    totalGroups: null,
    currentGroupFamily: null,
    failedIndex: null,
    partialOutput: null,
    errorCode: null,
    errorMessage: null,
};

const runSlice = createSlice({
    name: 'run',
    initialState,
    reducers: {
        progressReceived: (state, action: PayloadAction<StepProgress>) => {
            const { runId, groupIndex, totalGroups, family } = action.payload;
            if (state.runId !== runId) return; // guard against stale events
            state.currentGroupIndex = groupIndex;
            state.totalGroups = totalGroups;
            state.currentGroupFamily = family;
        },
        resetRun: () => initialState,
    },
    extraReducers: (builder) => {
        builder
            .addCase(processPromptChain.pending, (state, action) => {
                state.status = 'running';
                state.runId = action.meta.arg.runId;
                state.currentGroupIndex = null;
                state.totalGroups = null;
                state.currentGroupFamily = null;
                state.failedIndex = null;
                state.partialOutput = null;
                state.errorCode = null;
                state.errorMessage = null;
            })
            .addCase(processPromptChain.fulfilled, (state, action) => {
                const { data, error } = action.payload;
                if (data && !error) {
                    state.status = 'done';
                    state.partialOutput = data.finalText;
                } else if (data && error) {
                    state.status = error.code === 'cancelled' ? 'cancelled' : 'partial';
                    state.partialOutput = data.finalText;
                    state.failedIndex = data.failedIndex ?? null;
                    state.errorCode = error.code;
                    state.errorMessage = error.message;
                } else if (error) {
                    state.status = error.code === 'cancelled' ? 'cancelled' : 'error';
                    state.errorCode = error.code;
                    state.errorMessage = error.message;
                } else {
                    state.status = 'done';
                }
            })
            .addCase(processPromptChain.rejected, (state, action) => {
                state.status = 'error';
                state.errorMessage = action.payload ?? 'Unknown error';
            })
            .addCase(cancelChain.fulfilled, (state) => {
                if (state.status === 'running') {
                    state.status = 'cancelled';
                }
            });
    },
});

export const { progressReceived, resetRun } = runSlice.actions;
export default runSlice.reducer;
