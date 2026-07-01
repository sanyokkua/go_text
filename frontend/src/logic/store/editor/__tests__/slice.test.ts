// Mock the adapter before any imports so module-level getLogger calls succeed.
jest.mock('../../../adapter', () => ({
    getLogger: jest
        .fn()
        .mockReturnValue({
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

import { getUIPreferences } from '../../settings/thunks';
import editorReducer, {
    clearInput,
    clearOutput,
    clearTokenEstimate,
    setInputContent,
    setOutputContent,
    setViewMode,
    useOutputAsInput,
} from '../slice';
import { previewTokenEstimate } from '../thunks';
import type { EditorState } from '../types';

const initialState: EditorState = { inputContent: '', outputContent: '', viewMode: 'preview', tokenEstimate: null };

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
        const stateWithContent: EditorState = { ...initialState, inputContent: 'old input', outputContent: 'processed result' };

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

    it('getUIPreferences.fulfilled restores viewMode from the payload', () => {
        const action = {
            type: getUIPreferences.fulfilled.type,
            payload: { mode: 'light', effective: 'light', layout: 'side', sidebarCollapsed: false, historyOpen: false, viewMode: 'source' },
        };

        const state = editorReducer(initialState, action);

        expect(state.viewMode).toBe('source');
    });

    it('clearTokenEstimate resets tokenEstimate to null', () => {
        const stateWithEstimate: EditorState = { ...initialState, tokenEstimate: 42 };

        const state = editorReducer(stateWithEstimate, clearTokenEstimate());

        expect(state.tokenEstimate).toBeNull();
    });

    it('previewTokenEstimate.fulfilled sets tokenEstimate from the first group when the request matches current input', () => {
        const currentState: EditorState = { ...initialState, inputContent: 'hello world' };
        const mockPreview = { kind: 'single', inferences: 1, groups: [{ estimatedTokens: 7 }], summary: '' };
        const action = { type: previewTokenEstimate.fulfilled.type, payload: mockPreview, meta: { arg: { sampleInput: 'hello world' } } };

        const state = editorReducer(currentState, action);

        expect(state.tokenEstimate).toBe(7);
    });

    it('previewTokenEstimate.fulfilled ignores a stale response for input the user has since changed', () => {
        const currentState: EditorState = { ...initialState, inputContent: 'new text', tokenEstimate: 3 };
        const mockPreview = { kind: 'single', inferences: 1, groups: [{ estimatedTokens: 99 }], summary: '' };
        const action = { type: previewTokenEstimate.fulfilled.type, payload: mockPreview, meta: { arg: { sampleInput: 'old text' } } };

        const state = editorReducer(currentState, action);

        expect(state.tokenEstimate).toBe(3);
    });

    it('previewTokenEstimate.rejected clears tokenEstimate when the request matches current input', () => {
        const currentState: EditorState = { ...initialState, inputContent: 'hello world', tokenEstimate: 7 };
        const action = { type: previewTokenEstimate.rejected.type, payload: 'no provider configured', meta: { arg: { sampleInput: 'hello world' } } };

        const state = editorReducer(currentState, action);

        expect(state.tokenEstimate).toBeNull();
    });

    it('previewTokenEstimate.rejected ignores a stale rejection for input the user has since changed', () => {
        const currentState: EditorState = { ...initialState, inputContent: 'new text', tokenEstimate: 7 };
        const action = { type: previewTokenEstimate.rejected.type, payload: 'no provider configured', meta: { arg: { sampleInput: 'old text' } } };

        const state = editorReducer(currentState, action);

        expect(state.tokenEstimate).toBe(7);
    });
});
