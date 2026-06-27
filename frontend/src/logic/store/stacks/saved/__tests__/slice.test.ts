// Mock the adapter before any imports so module-level getLogger calls succeed.
jest.mock('../../../../adapter', () => ({
    getLogger: jest.fn().mockReturnValue({
        logDebug: jest.fn(),
        logInfo: jest.fn(),
        logError: jest.fn(),
        logWarning: jest.fn(),
        logTrace: jest.fn(),
        logPrint: jest.fn(),
        logFatal: jest.fn(),
    }),
    unwrap: jest.fn((res: { data?: unknown; error?: unknown }) => {
        if (res.error) throw res.error;
        return res.data;
    }),
    tryUnwrap: jest.fn((res: { data?: unknown; error?: unknown }) => res),
    ActionHandlerAdapter: { processPromptChain: jest.fn(), cancelChain: jest.fn() },
    SettingsHandlerAdapter: {},
    StackHandlerAdapter: {},
}));

import stacksSavedReducer from '../slice';
import { listStacks, createStack, deleteStack, duplicateStack, updateStack } from '../thunks';
import type { StacksSavedState } from '../types';

const initialState: StacksSavedState = {
    stacks: [],
    status: 'idle',
    error: null,
};

const stackA = { id: 'stack-1', name: 'My Stack', steps: [] };
const stackB = { id: 'stack-2', name: 'Another Stack', steps: [] };

describe('stacks/saved slice reducer', () => {
    it('returns initial state for unknown action', () => {
        expect(stacksSavedReducer(undefined, { type: '@@INIT' })).toEqual(initialState);
    });

    it('listStacks.pending sets status to loading and clears error', () => {
        const stateWithError: StacksSavedState = { ...initialState, error: 'previous error' };
        const action = { type: listStacks.pending.type };

        const state = stacksSavedReducer(stateWithError, action);

        expect(state.status).toBe('loading');
        expect(state.error).toBeNull();
    });

    it('listStacks.fulfilled populates stacks and sets status to idle', () => {
        const loadingState: StacksSavedState = { ...initialState, status: 'loading' };
        const action = {
            type: listStacks.fulfilled.type,
            payload: [stackA, stackB],
        };

        const state = stacksSavedReducer(loadingState, action);

        expect(state.stacks).toEqual([stackA, stackB]);
        expect(state.status).toBe('idle');
    });

    it('listStacks.rejected sets status to error and stores error message', () => {
        const action = {
            type: listStacks.rejected.type,
            payload: 'Network error',
            error: { message: 'Rejected' },
        };

        const state = stacksSavedReducer(initialState, action);

        expect(state.status).toBe('error');
        expect(state.error).toBe('Network error');
    });

    it('createStack.pending sets status to saving', () => {
        const action = { type: createStack.pending.type };

        const state = stacksSavedReducer(initialState, action);

        expect(state.status).toBe('saving');
    });

    it('createStack.fulfilled appends new stack to stacks and sets status to idle', () => {
        const existingState: StacksSavedState = { ...initialState, stacks: [stackA] };
        const action = {
            type: createStack.fulfilled.type,
            payload: stackB,
        };

        const state = stacksSavedReducer(existingState, action);

        expect(state.stacks).toEqual([stackA, stackB]);
        expect(state.status).toBe('idle');
    });

    it('deleteStack.pending sets status to deleting', () => {
        const action = { type: deleteStack.pending.type };

        const state = stacksSavedReducer(initialState, action);

        expect(state.status).toBe('deleting');
    });

    it('deleteStack.fulfilled removes the stack with matching id and sets status to idle', () => {
        const existingState: StacksSavedState = { ...initialState, stacks: [stackA, stackB] };
        const action = {
            type: deleteStack.fulfilled.type,
            payload: 'stack-1',
        };

        const state = stacksSavedReducer(existingState, action);

        expect(state.stacks).toEqual([stackB]);
        expect(state.status).toBe('idle');
    });

    it('duplicateStack.fulfilled appends duplicated stack to stacks and sets status to idle', () => {
        const existingState: StacksSavedState = { ...initialState, stacks: [stackA] };
        const duplicated = { id: 'stack-3', name: 'My Stack (copy)', steps: [] };
        const action = {
            type: duplicateStack.fulfilled.type,
            payload: duplicated,
        };

        const state = stacksSavedReducer(existingState, action);

        expect(state.stacks).toEqual([stackA, duplicated]);
        expect(state.status).toBe('idle');
    });

    it('updateStack.fulfilled replaces the matching stack in place and sets status to idle', () => {
        const updatedStackA = { id: 'stack-1', name: 'Renamed Stack', steps: [] };
        const existingState: StacksSavedState = { ...initialState, stacks: [stackA, stackB] };
        const action = {
            type: updateStack.fulfilled.type,
            payload: updatedStackA,
        };

        const state = stacksSavedReducer(existingState, action);

        expect(state.stacks[0]).toEqual(updatedStackA);
        expect(state.stacks[1]).toEqual(stackB);
        expect(state.status).toBe('idle');
    });

    it('updateStack.fulfilled does not modify stacks when no id matches', () => {
        const existingState: StacksSavedState = { ...initialState, stacks: [stackA] };
        const nonExistent = { id: 'stack-999', name: 'Ghost Stack', steps: [] };
        const action = {
            type: updateStack.fulfilled.type,
            payload: nonExistent,
        };

        const state = stacksSavedReducer(existingState, action);

        expect(state.stacks).toEqual([stackA]);
    });
});
