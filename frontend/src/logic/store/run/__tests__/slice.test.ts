// Mock the adapter before any imports so module-level getLogger calls in thunks succeed.
jest.mock('../../../adapter', () => ({
    getLogger: jest.fn().mockReturnValue({
        logDebug: jest.fn(),
        logInfo: jest.fn(),
        logError: jest.fn(),
        logWarning: jest.fn(),
    }),
    unwrap: jest.fn((res: { data?: unknown; error?: unknown }) => {
        if (res.error) throw res.error;
        return res.data;
    }),
    tryUnwrap: jest.fn((res: { data?: unknown; error?: unknown }) => res),
}));

import runReducer, { progressReceived, resetRun } from '../slice';
import { cancelChain, processPromptChain } from '../thunks';
import type { RunState } from '../types';

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

describe('run slice reducer', () => {
    it('returns initial state for unknown action', () => {
        expect(runReducer(undefined, { type: '@@INIT' })).toEqual(initialState);
    });

    it('progressReceived updates progress fields when runId matches', () => {
        const stateWithRun: RunState = { ...initialState, runId: 'run-1', status: 'running' };
        const progress = { runId: 'run-1', groupIndex: 2, totalGroups: 5, family: 'translation', status: 'running' as const };

        const state = runReducer(stateWithRun, progressReceived(progress));

        expect(state.currentGroupIndex).toBe(2);
        expect(state.totalGroups).toBe(5);
        expect(state.currentGroupFamily).toBe('translation');
    });

    it('progressReceived ignores event when runId does not match (stale event guard)', () => {
        const stateWithRun: RunState = {
            ...initialState,
            runId: 'run-1',
            status: 'running',
            currentGroupIndex: 1,
            totalGroups: 3,
            currentGroupFamily: 'original-family',
        };
        const staleProgress = { runId: 'run-STALE', groupIndex: 99, totalGroups: 99, family: 'other', status: 'running' as const };

        const state = runReducer(stateWithRun, progressReceived(staleProgress));

        expect(state.currentGroupIndex).toBe(1);
        expect(state.totalGroups).toBe(3);
        expect(state.currentGroupFamily).toBe('original-family');
    });

    it('processPromptChain.pending sets status to running and stores runId from meta.arg', () => {
        const action = {
            type: processPromptChain.pending.type,
            meta: { arg: { runId: 'run-42' } },
            payload: undefined,
        };

        const state = runReducer(initialState, action);

        expect(state.status).toBe('running');
        expect(state.runId).toBe('run-42');
        expect(state.currentGroupIndex).toBeNull();
        expect(state.totalGroups).toBeNull();
        expect(state.currentGroupFamily).toBeNull();
        expect(state.failedIndex).toBeNull();
        expect(state.partialOutput).toBeNull();
        expect(state.errorCode).toBeNull();
        expect(state.errorMessage).toBeNull();
    });

    it('processPromptChain.fulfilled with data and no error sets status to done', () => {
        const action = {
            type: processPromptChain.fulfilled.type,
            payload: { data: { finalText: 'result text', failedIndex: null }, error: null },
        };

        const state = runReducer(initialState, action);

        expect(state.status).toBe('done');
        expect(state.partialOutput).toBe('result text');
    });

    it('processPromptChain.fulfilled with data and non-cancelled error sets status to partial', () => {
        const action = {
            type: processPromptChain.fulfilled.type,
            payload: {
                data: { finalText: 'partial text', failedIndex: 2 },
                error: { code: 'step_failed', message: 'Step 2 failed' },
            },
        };

        const state = runReducer(initialState, action);

        expect(state.status).toBe('partial');
        expect(state.partialOutput).toBe('partial text');
        expect(state.failedIndex).toBe(2);
        expect(state.errorCode).toBe('step_failed');
        expect(state.errorMessage).toBe('Step 2 failed');
    });

    it('processPromptChain.fulfilled with error only and code=cancelled sets status to cancelled', () => {
        const action = {
            type: processPromptChain.fulfilled.type,
            payload: {
                data: null,
                error: { code: 'cancelled', message: 'User cancelled' },
            },
        };

        const state = runReducer(initialState, action);

        expect(state.status).toBe('cancelled');
        expect(state.errorCode).toBe('cancelled');
        expect(state.errorMessage).toBe('User cancelled');
    });

    it('processPromptChain.rejected sets status to error and stores errorMessage from payload', () => {
        const action = {
            type: processPromptChain.rejected.type,
            payload: 'Network timeout',
        };

        const state = runReducer(initialState, action);

        expect(state.status).toBe('error');
        expect(state.errorMessage).toBe('Network timeout');
    });

    it('cancelChain.fulfilled sets status to cancelled when currently running', () => {
        const runningState: RunState = { ...initialState, status: 'running', runId: 'run-1' };
        const action = { type: cancelChain.fulfilled.type, payload: undefined };

        const state = runReducer(runningState, action);

        expect(state.status).toBe('cancelled');
    });

    it('cancelChain.fulfilled does not change status when already done', () => {
        const doneState: RunState = { ...initialState, status: 'done' };
        const action = { type: cancelChain.fulfilled.type, payload: undefined };

        const state = runReducer(doneState, action);

        expect(state.status).toBe('done');
    });

    it('resetRun returns initial state', () => {
        const modifiedState: RunState = {
            status: 'error',
            runId: 'run-99',
            currentGroupIndex: 3,
            totalGroups: 5,
            currentGroupFamily: 'translation',
            failedIndex: 3,
            partialOutput: 'some partial',
            errorCode: 'internal' as RunState['errorCode'],
            errorMessage: 'something failed',
        };

        const state = runReducer(modifiedState, resetRun());

        expect(state).toEqual(initialState);
    });
});
