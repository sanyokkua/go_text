import { createSlice } from '@reduxjs/toolkit';
import { createStack, deleteStack, duplicateStack, listStacks, updateStack } from './thunks';
import { StacksSavedState } from './types';

const initialState: StacksSavedState = {
    stacks: [],
    status: 'idle',
    error: null,
};

const stacksSavedSlice = createSlice({
    name: 'stacksSaved',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(listStacks.pending, (state) => {
                state.status = 'loading';
                state.error = null;
            })
            .addCase(listStacks.fulfilled, (state, action) => {
                state.stacks = action.payload;
                state.status = 'idle';
            })
            .addCase(listStacks.rejected, (state, action) => {
                state.status = 'error';
                state.error = action.payload ?? null;
            })

            .addCase(createStack.pending, (state) => {
                state.status = 'saving';
                state.error = null;
            })
            .addCase(createStack.fulfilled, (state, action) => {
                state.stacks.push(action.payload);
                state.status = 'idle';
            })
            .addCase(createStack.rejected, (state, action) => {
                state.status = 'error';
                state.error = action.payload ?? null;
            })

            .addCase(deleteStack.pending, (state) => {
                state.status = 'deleting';
                state.error = null;
            })
            .addCase(deleteStack.fulfilled, (state, action) => {
                state.stacks = state.stacks.filter((s) => s.id !== action.payload);
                state.status = 'idle';
            })
            .addCase(deleteStack.rejected, (state, action) => {
                state.status = 'error';
                state.error = action.payload ?? null;
            })

            .addCase(duplicateStack.pending, (state) => {
                state.status = 'saving';
                state.error = null;
            })
            .addCase(duplicateStack.fulfilled, (state, action) => {
                state.stacks.push(action.payload);
                state.status = 'idle';
            })
            .addCase(duplicateStack.rejected, (state, action) => {
                state.status = 'error';
                state.error = action.payload ?? null;
            })

            .addCase(updateStack.pending, (state) => {
                state.status = 'saving';
                state.error = null;
            })
            .addCase(updateStack.fulfilled, (state, action) => {
                const updated = action.payload;
                const index = state.stacks.findIndex((s) => s.id === updated.id);
                if (index !== -1) {
                    state.stacks[index] = updated;
                }
                state.status = 'idle';
            })
            .addCase(updateStack.rejected, (state, action) => {
                state.status = 'error';
                state.error = action.payload ?? null;
            });
    },
});

export default stacksSavedSlice.reducer;
