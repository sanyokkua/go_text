import { apperr } from '../../../../wailsjs/go/models';
import { enqueueNotification, notifyError } from './slice';

function wire(
    code: apperr.ErrorCode,
    details?: Record<string, string>,
): apperr.WireError {
    return apperr.WireError.createFrom({ code, title: '', message: '', retryable: false, details });
}

describe('notifyError', () => {
    it('maps CodeAuth to error toast with provider interpolation', () => {
        const action = notifyError(wire(apperr.ErrorCode.CodeAuth, { provider: 'Ollama', reason: 'invalid key' }));
        const expected = enqueueNotification({
            severity: 'error',
            surface: 'toast',
            title: 'Authentication failed',
            message: 'Request to Ollama failed: authentication was rejected — invalid key.',
            details: { provider: 'Ollama', reason: 'invalid key' },
        });
        expect(action).toEqual(expected);
    });

    it('maps CodeMissingCredential to error toast with envVar', () => {
        const action = notifyError(wire(apperr.ErrorCode.CodeMissingCredential, { provider: 'LM Studio', envVar: 'LM_API_KEY' }));
        expect(action.payload.message).toBe('Set the LM_API_KEY environment variable for LM Studio.');
        expect(action.payload.surface).toBe('toast');
    });

    it('maps CodeValidation to inline severity with field details', () => {
        const action = notifyError(wire(apperr.ErrorCode.CodeValidation, { field: 'temperature', expected: 'must be 0–2', got: '3.5' }));
        expect(action.payload.surface).toBe('inline');
        expect(action.payload.severity).toBe('error');
        expect(action.payload.message).toBe('temperature must be 0–2; got 3.5.');
    });

    it('maps CodeInternal to error toast with generic copy', () => {
        const action = notifyError(wire(apperr.ErrorCode.CodeInternal));
        expect(action.payload.severity).toBe('error');
        expect(action.payload.surface).toBe('toast');
        expect(action.payload.title).toBe('Something went wrong');
    });

    it('maps CodeBusy to warning toast', () => {
        const action = notifyError(wire(apperr.ErrorCode.CodeBusy));
        expect(action.payload.severity).toBe('warning');
        expect(action.payload.surface).toBe('toast');
    });

    it('maps CodeCancelled to info toast with stepIndex', () => {
        const action = notifyError(wire(apperr.ErrorCode.CodeCancelled, { stepIndex: '3' }));
        expect(action.payload.severity).toBe('info');
        expect(action.payload.message).toContain('step 3');
    });

    it('maps CodeTimeout to error toast with provider and timeout', () => {
        const action = notifyError(wire(apperr.ErrorCode.CodeTimeout, { provider: 'OpenAI-compatible', timeout: '60' }));
        expect(action.payload.message).toBe('OpenAI-compatible did not respond within 60s. The request was stopped.');
    });

    it('maps CodeRateLimited with optional retryAfter', () => {
        const withRetry = notifyError(wire(apperr.ErrorCode.CodeRateLimited, { provider: 'API', retryAfter: '30' }));
        expect(withRetry.payload.message).toContain('retrying in 30s');
        const without = notifyError(wire(apperr.ErrorCode.CodeRateLimited, { provider: 'API' }));
        expect(without.payload.message).not.toContain('retrying');
    });

    it('falls through unknown code to internal copy', () => {
        const action = notifyError(wire('unknown_future_code' as apperr.ErrorCode));
        expect(action.payload.title).toBe('Something went wrong');
    });
});
