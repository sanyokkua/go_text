import type { RootState } from '../../index';
import { selectRunProgress } from '../selectors';
import type { RunState } from '../types';

function stateWithRun(runOverrides: Partial<RunState> = {}): RootState {
    const run: RunState = {
        status: 'running',
        runId: 'r1',
        currentGroupIndex: 0,
        totalGroups: 2,
        currentGroupFamily: 'Proofreading',
        failedIndex: null,
        partialOutput: null,
        errorCode: null,
        errorMessage: null,
        ...runOverrides,
    };
    return { run } as RootState;
}

describe('selectRunProgress', () => {
    it('returns the same object reference for two separate state snapshots with identical progress values', () => {
        // Two distinct RootState objects (as would occur across re-renders after an unrelated
        // slice updates) but with the same run progress field values.
        const first = selectRunProgress(stateWithRun());
        const second = selectRunProgress(stateWithRun());

        expect(first).toBe(second);
    });

    it('returns a new object reference when the current group index changes', () => {
        const first = selectRunProgress(stateWithRun({ currentGroupIndex: 0 }));
        const second = selectRunProgress(stateWithRun({ currentGroupIndex: 1 }));

        expect(second).not.toBe(first);
        expect(second).toEqual({ groupIndex: 1, totalGroups: 2, family: 'Proofreading' });
    });

    it('returns null when any progress field is null', () => {
        expect(selectRunProgress(stateWithRun({ currentGroupIndex: null }))).toBeNull();
        expect(selectRunProgress(stateWithRun({ totalGroups: null }))).toBeNull();
        expect(selectRunProgress(stateWithRun({ currentGroupFamily: null }))).toBeNull();
    });
});
