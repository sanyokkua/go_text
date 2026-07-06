import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { StackBuilderState } from './types';

const initialState: StackBuilderState = { steps: [], name: '', icon: '' };

const stacksBuilderSlice = createSlice({
    name: 'stacksBuilder',
    initialState,
    reducers: {
        addStep(state, action: PayloadAction<string>) {
            state.steps.push(action.payload);
        },
        removeStep(state, action: PayloadAction<number>) {
            state.steps.splice(action.payload, 1);
        },
        moveStep(state, action: PayloadAction<{ from: number; to: number }>) {
            const { from, to } = action.payload;
            const [removed] = state.steps.splice(from, 1);
            state.steps.splice(to, 0, removed);
        },
        clearBuilder() {
            return initialState;
        },
        setBuilderName(state, action: PayloadAction<string>) {
            state.name = action.payload;
        },
        setBuilderIcon(state, action: PayloadAction<string>) {
            state.icon = action.payload;
        },
    },
});

export const { addStep, removeStep, moveStep, clearBuilder, setBuilderName, setBuilderIcon } = stacksBuilderSlice.actions;
export default stacksBuilderSlice.reducer;
