export type EditorViewMode = 'preview' | 'source' | 'diff';

export interface EditorState {
    inputContent: string;
    outputContent: string;
    viewMode: EditorViewMode;
}
