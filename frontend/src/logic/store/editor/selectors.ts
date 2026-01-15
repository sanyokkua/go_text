import { RootState } from '../index';

export const selectInputContent = (state: RootState): string => state.editor.inputContent;
export const selectOutputContent = (state: RootState): string => state.editor.outputContent;
