// Mock for Wails auto-generated models — mirrors the real apperr namespace
// so tests can import { apperr } from '...wailsjs/go/models' without ES module issues.
// eslint-disable-next-line no-undef
const ErrorCode = {
    CodeAuth: 'auth',
    CodeBusy: 'busy',
    CodeCancelled: 'cancelled',
    CodeContextWindow: 'context_window',
    CodeEmptyCompletion: 'empty_completion',
    CodeInternal: 'internal',
    CodeInvalidPlan: 'invalid_plan',
    CodeMissingCredential: 'missing_credential',
    CodeModelNotFound: 'model_not_found',
    CodeProviderUnreachable: 'provider_unreachable',
    CodeRateLimited: 'rate_limited',
    CodeStepFailed: 'step_failed',
    CodeTimeout: 'timeout',
    CodeUpstream: 'upstream',
    CodeValidation: 'validation',
};

class WireError {
    constructor(source = {}) {
        this.code = source['code'];
        this.title = source['title'] ?? '';
        this.message = source['message'] ?? '';
        this.details = source['details'];
        this.retryable = source['retryable'] ?? false;
    }

    static createFrom(source = {}) {
        return new WireError(source);
    }
}

// eslint-disable-next-line no-undef
module.exports = {
    apperr: {
        ErrorCode,
        WireError,
    },
};
