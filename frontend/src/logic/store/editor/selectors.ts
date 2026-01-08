import { RootState } from '../index';

// Basic selectors
export const selectInputContent = (state: RootState): string => state.editor.inputContent;

export const selectOutputContent = (state: RootState): string => state.editor.outputContent;

// Derived selectors
export const selectHasInputContent = (state: RootState): boolean => state.editor.inputContent.trim().length > 0;

export const selectHasOutputContent = (state: RootState): boolean => state.editor.outputContent.trim().length > 0;

export const selectCanUseOutputAsInput = (state: RootState): boolean => state.editor.outputContent.trim().length > 0;
