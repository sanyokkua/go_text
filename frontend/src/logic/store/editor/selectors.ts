import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '../index';
import { EditorViewMode } from './types';

export const selectInputContent = (state: RootState): string => state.editor.inputContent;
export const selectOutputContent = (state: RootState): string => state.editor.outputContent;
export const selectViewMode = (state: RootState): EditorViewMode => state.editor.viewMode;

export const selectHasDiff = createSelector(
    [selectInputContent, selectOutputContent],
    (input, output) => input.length > 0 && output.length > 0,
);
