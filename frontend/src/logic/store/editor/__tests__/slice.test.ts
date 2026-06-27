// Mock the adapter before any imports so module-level getLogger calls succeed.
jest.mock('../../../adapter', () => ({
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
}));

import editorReducer, {
    setInputContent,
    setOutputContent,
    useOutputAsInput,
    clearInput,
    clearOutput,
    setViewMode,
} from '../slice';
import type { EditorState } from '../types';

const initialState: EditorState = {
    inputContent: '',
    outputContent: '',
    viewMode: 'preview',
};

describe('editor slice reducer', () => {
    it('returns initial state with viewMode preview for unknown action', () => {
        expect(editorReducer(undefined, { type: '@@INIT' })).toEqual(initialState);
    });

    it('setInputContent sets inputContent to the given value', () => {
        const state = editorReducer(initialState, setInputContent('hello'));

        expect(state.inputContent).toBe('hello');
    });

    it('setOutputContent sets outputContent to the given value', () => {
        const state = editorReducer(initialState, setOutputContent('world'));

        expect(state.outputContent).toBe('world');
    });

    it('useOutputAsInput copies outputContent to inputContent and clears outputContent', () => {
        const stateWithContent: EditorState = {
            ...initialState,
            inputContent: 'old input',
            outputContent: 'processed result',
        };

        const state = editorReducer(stateWithContent, useOutputAsInput());

        expect(state.inputContent).toBe('processed result');
        expect(state.outputContent).toBe('');
    });

    it('clearInput resets inputContent to empty string', () => {
        const stateWithInput: EditorState = { ...initialState, inputContent: 'some text' };

        const state = editorReducer(stateWithInput, clearInput());

        expect(state.inputContent).toBe('');
    });

    it('clearOutput resets outputContent to empty string', () => {
        const stateWithOutput: EditorState = { ...initialState, outputContent: 'some output' };

        const state = editorReducer(stateWithOutput, clearOutput());

        expect(state.outputContent).toBe('');
    });

    it('setViewMode("source") changes viewMode to source', () => {
        const state = editorReducer(initialState, setViewMode('source'));

        expect(state.viewMode).toBe('source');
    });

    it('setViewMode("diff") changes viewMode to diff', () => {
        const state = editorReducer(initialState, setViewMode('diff'));

        expect(state.viewMode).toBe('diff');
    });

    it('setViewMode("preview") changes viewMode to preview', () => {
        const stateInSource: EditorState = { ...initialState, viewMode: 'source' };

        const state = editorReducer(stateInSource, setViewMode('preview'));

        expect(state.viewMode).toBe('preview');
    });
});
