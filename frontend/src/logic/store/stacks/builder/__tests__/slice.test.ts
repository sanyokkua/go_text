import builderReducer, {
    addStep,
    clearBuilder,
    moveStep,
    removeStep,
    setBuilderIcon,
    setBuilderName,
} from '../slice';
import type { StackBuilderState } from '../types';

const initialState: StackBuilderState = {
    steps: [],
    name: '',
    icon: '',
};

describe('stacks builder slice reducer', () => {
    it('returns initial state for unknown action', () => {
        expect(builderReducer(undefined, { type: '@@INIT' })).toEqual(initialState);
    });

    it('addStep appends an actionId to the steps array', () => {
        const state = builderReducer(initialState, addStep('action-summarise'));

        expect(state.steps).toEqual(['action-summarise']);
    });

    it('addStep called multiple times preserves insertion order', () => {
        let state = builderReducer(initialState, addStep('step-A'));
        state = builderReducer(state, addStep('step-B'));
        state = builderReducer(state, addStep('step-C'));

        expect(state.steps).toEqual(['step-A', 'step-B', 'step-C']);
    });

    it('removeStep removes the element at the given index', () => {
        const stateWithSteps: StackBuilderState = { ...initialState, steps: ['step-A', 'step-B', 'step-C'] };

        const state = builderReducer(stateWithSteps, removeStep(1));

        expect(state.steps).toEqual(['step-A', 'step-C']);
    });

    it('moveStep moves the element from index 0 to index 2 correctly', () => {
        const stateWithSteps: StackBuilderState = { ...initialState, steps: ['step-A', 'step-B', 'step-C'] };

        const state = builderReducer(stateWithSteps, moveStep({ from: 0, to: 2 }));

        expect(state.steps).toEqual(['step-B', 'step-C', 'step-A']);
    });

    it('moveStep moves an element from the end to the front (index 2 to index 0)', () => {
        const stateWithSteps: StackBuilderState = { ...initialState, steps: ['step-A', 'step-B', 'step-C'] };

        const state = builderReducer(stateWithSteps, moveStep({ from: 2, to: 0 }));

        expect(state.steps).toEqual(['step-C', 'step-A', 'step-B']);
    });

    it('clearBuilder resets steps, name, and icon to initial state', () => {
        const modifiedState: StackBuilderState = {
            steps: ['step-A', 'step-B'],
            name: 'My Stack',
            icon: 'stack-icon',
        };

        const state = builderReducer(modifiedState, clearBuilder());

        expect(state).toEqual(initialState);
    });

    it('setBuilderName sets the name field', () => {
        const state = builderReducer(initialState, setBuilderName('Translation Pipeline'));

        expect(state.name).toBe('Translation Pipeline');
    });

    it('setBuilderIcon sets the icon field', () => {
        const state = builderReducer(initialState, setBuilderIcon('translate-icon'));

        expect(state.icon).toBe('translate-icon');
    });
});
