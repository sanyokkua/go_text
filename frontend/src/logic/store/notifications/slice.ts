import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { apperr } from '../../../../wailsjs/go/models';
import { Notification, NotificationsState } from './types';

const initialState: NotificationsState = { queue: [] };

// exactOptionalPropertyTypes: spread nothing rather than assign undefined to an exact-optional key
function withDetails(wire: apperr.WireError): Pick<Notification, 'details'> {
    return wire.details === undefined ? {} : { details: wire.details };
}

function buildNotification(wire: apperr.WireError): Omit<Notification, 'id'> {
    const d = wire.details ?? {};
    const provider = d['provider'] ?? 'provider';
    const envVar = d['envVar'] ?? 'API key';
    const timeout = d['timeout'] ?? '?';
    const retryAfter = d['retryAfter'];
    const model = d['model'] ?? 'model';
    const statusCode = d['statusCode'] ?? '5xx';
    const reason = d['reason'];
    const stepIndex = d['stepIndex'] ?? '?';
    const family = d['family'] ?? 'step';
    const field = d['field'] ?? 'field';
    const expected = d['expected'] ?? 'valid value';
    const got = d['got'] ?? 'given value';
    const innerMsg = d['inner'] ?? wire.message;

    switch (wire.code) {
        case apperr.ErrorCode.CodeAuth: {
            const reasonSuffix = reason ? ` — ${reason}` : '';
            return {
                severity: 'error',
                surface: 'toast',
                title: 'Authentication failed',
                message: `Request to ${provider} failed: authentication was rejected${reasonSuffix}.`,
                ...withDetails(wire),
            };
        }
        case apperr.ErrorCode.CodeMissingCredential:
            return {
                severity: 'error',
                surface: 'toast',
                title: 'API key not set',
                message: `Set the ${envVar} environment variable for ${provider}.`,
                ...withDetails(wire),
            };
        case apperr.ErrorCode.CodeTimeout:
            return {
                severity: 'error',
                surface: 'toast',
                title: 'Request timed out',
                message: `${provider} did not respond within ${timeout}s. The request was stopped.`,
                ...withDetails(wire),
            };
        case apperr.ErrorCode.CodeRateLimited: {
            const retrySuffix = retryAfter ? ` — retrying in ${retryAfter}s` : '';
            return {
                severity: 'warning',
                surface: 'toast',
                title: 'Rate limited',
                message: `${provider} is rate-limiting requests${retrySuffix}.`,
                ...withDetails(wire),
            };
        }
        case apperr.ErrorCode.CodeProviderUnreachable:
            return {
                severity: 'error',
                surface: 'toast',
                title: 'Provider unreachable',
                message: `Couldn't reach ${provider} — check the Base URL and that it's running.`,
                ...withDetails(wire),
            };
        case apperr.ErrorCode.CodeModelNotFound:
            return {
                severity: 'error',
                surface: 'toast',
                title: 'Model not found',
                message: `Model/deployment ${model} wasn't found on ${provider}.`,
                ...withDetails(wire),
            };
        case apperr.ErrorCode.CodeUpstream:
            return {
                severity: 'error',
                surface: 'toast',
                title: 'Provider error',
                message: `${provider} had a server error (${statusCode}). Please retry.`,
                ...withDetails(wire),
            };
        case apperr.ErrorCode.CodeEmptyCompletion:
            return {
                severity: 'warning',
                surface: 'toast',
                title: 'No response',
                message: `${provider} returned an empty result.`,
                ...withDetails(wire),
            };
        case apperr.ErrorCode.CodeValidation:
            return {
                severity: 'error',
                surface: 'inline',
                title: `Invalid ${field}`,
                message: `${field} ${expected}; got ${got}.`,
                ...withDetails(wire),
            };
        case apperr.ErrorCode.CodeInvalidPlan:
            return {
                severity: 'error',
                surface: 'toast',
                title: 'Stack not allowed',
                message: `${d['reason'] ?? 'Plan is invalid'} (max 5 steps · 3 inferences).`,
                ...withDetails(wire),
            };
        case apperr.ErrorCode.CodeBusy:
            return {
                severity: 'warning',
                surface: 'toast',
                title: 'Already running',
                message: 'An inference is already running — wait for it to finish before starting another.',
            };
        case apperr.ErrorCode.CodeContextWindow:
            return {
                severity: 'error',
                surface: 'toast',
                title: 'Input too long',
                message: "The text exceeds the model's context window — shorten it or raise the context size.",
                ...withDetails(wire),
            };
        case apperr.ErrorCode.CodeStepFailed:
            return {
                severity: 'error',
                surface: 'toast',
                title: `Step ${stepIndex} failed`,
                message: `Step ${stepIndex} (${family}) failed: ${innerMsg}. Earlier steps completed.`,
                ...withDetails(wire),
            };
        case apperr.ErrorCode.CodeCancelled:
            return {
                severity: 'info',
                surface: 'toast',
                title: 'Cancelled',
                message: `Run cancelled after step ${stepIndex}. Partial result kept.`,
                ...withDetails(wire),
            };
        case apperr.ErrorCode.CodeInternal:
        default:
            return {
                severity: 'error',
                surface: 'toast',
                title: 'Something went wrong',
                message: 'An unexpected error occurred. Please try again.',
            };
    }
}

const notificationsSlice = createSlice({
    name: 'notifications',
    initialState,
    reducers: {
        enqueueNotification: (state, action: PayloadAction<Omit<Notification, 'id'>>) => {
            const id = Math.random().toString(36).substring(2, 9);
            state.queue.push({ id, ...action.payload });
        },
        removeNotification: (state, action: PayloadAction<string>) => {
            state.queue = state.queue.filter((n) => n.id !== action.payload);
        },
    },
    extraReducers: () => {},
});

export const { enqueueNotification, removeNotification } = notificationsSlice.actions;

export const notifyError = (wire: apperr.WireError) =>
    enqueueNotification(buildNotification(wire));

export default notificationsSlice.reducer;
