import React, { useCallback, useState } from 'react';

import { apperr } from '../../../../../../../wailsjs/go/models';
import { selectInferenceRunning, useAppDispatch, useAppSelector } from '../../../../../../logic/store';
import { enqueueNotification } from '../../../../../../logic/store/notifications/slice';
import { testConnection, testModels, testProviderInference } from '../../../../../../logic/store/settings/thunks';

type CheckStatus = 'idle' | 'running' | 'ok' | 'fail';

interface CheckState {
    status: CheckStatus;
    message: string;
    durationMs: number;
}

const INITIAL_CHECK: CheckState = { status: 'idle', message: '', durationMs: 0 };

interface CheckRowProps {
    label: string;
    state: CheckState;
    disabled: boolean;
    onRun: () => void;
}

const CheckRow: React.FC<CheckRowProps> = ({ label, state, disabled, onRun }) => (
    <div
        style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            padding: 'var(--space-2) 0',
            borderBottom: '1px solid var(--line)',
        }}
    >
        <button
            type="button"
            onClick={onRun}
            disabled={disabled}
            aria-label={label}
            style={{
                padding: 'var(--space-1) var(--space-3)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--line)',
                background: 'var(--surface)',
                color: 'var(--ink)',
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.5 : 1,
                fontSize: '0.8125rem',
                fontFamily: 'var(--font)',
                flexShrink: 0,
            }}
        >
            {label}
        </button>

        {state.status === 'running' && (
            <span
                aria-label="Running"
                style={{
                    display: 'inline-block',
                    animation: 'vp-spin 1s linear infinite',
                    color: 'var(--ink-3)',
                    fontSize: '1rem',
                }}
            >
                ⟳
            </span>
        )}

        {state.status === 'ok' && (
            <span style={{ color: 'var(--ok)', fontSize: '0.8125rem' }}>
                ✓ {state.durationMs}ms
            </span>
        )}

        {state.status === 'fail' && (
            <span style={{ color: 'var(--err)', fontSize: '0.8125rem' }} role="alert">
                ✗ {state.message}
            </span>
        )}
    </div>
);

CheckRow.displayName = 'CheckRow';

interface VerificationPanelProps {
    providerId: string;
}

const BUSY_PATTERN = /busy|already running/i;

const SPIN_KEYFRAMES = `@keyframes vp-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`;

const VerificationPanel: React.FC<VerificationPanelProps> = ({ providerId }) => {
    const dispatch = useAppDispatch();
    const inferenceRunning = useAppSelector(selectInferenceRunning);

    const [connectionState, setConnectionState] = useState<CheckState>(INITIAL_CHECK);
    const [modelsState, setModelsState] = useState<CheckState>(INITIAL_CHECK);
    const [inferenceState, setInferenceState] = useState<CheckState>(INITIAL_CHECK);

    const applyOutcome = useCallback((
        outcome: apperr.VerifyOutcome,
        setState: React.Dispatch<React.SetStateAction<CheckState>>,
    ) => {
        if (outcome.ok) {
            setState({ status: 'ok', message: '', durationMs: outcome.durationMs });
        } else {
            setState({ status: 'fail', message: outcome.check || 'Check failed', durationMs: outcome.durationMs });
        }
    }, []);

    const handleTestConnection = useCallback(async () => {
        setConnectionState({ status: 'running', message: '', durationMs: 0 });
        const result = await dispatch(testConnection(providerId));
        if (testConnection.fulfilled.match(result)) {
            applyOutcome(result.payload, setConnectionState);
        } else {
            const message = result.payload ?? 'Connection test failed';
            setConnectionState({ status: 'fail', message, durationMs: 0 });
        }
    }, [dispatch, providerId, applyOutcome]);

    const handleTestModels = useCallback(async () => {
        setModelsState({ status: 'running', message: '', durationMs: 0 });
        const result = await dispatch(testModels(providerId));
        if (testModels.fulfilled.match(result)) {
            applyOutcome(result.payload, setModelsState);
        } else {
            const message = result.payload ?? 'Models test failed';
            setModelsState({ status: 'fail', message, durationMs: 0 });
        }
    }, [dispatch, providerId, applyOutcome]);

    const handleTestInference = useCallback(async () => {
        setInferenceState({ status: 'running', message: '', durationMs: 0 });
        const result = await dispatch(testProviderInference(providerId));
        if (testProviderInference.fulfilled.match(result)) {
            applyOutcome(result.payload, setInferenceState);
        } else {
            const message = result.payload ?? 'Inference test failed';
            if (BUSY_PATTERN.test(message)) {
                dispatch(enqueueNotification({
                    severity: 'warning',
                    surface: 'toast',
                    title: 'Already running',
                    message: 'An inference is already running — wait for it to finish before starting another.',
                }));
            }
            setInferenceState({ status: 'fail', message, durationMs: 0 });
        }
    }, [dispatch, providerId, applyOutcome]);

    const isConnectionRunning = connectionState.status === 'running';
    const isModelsRunning = modelsState.status === 'running';
    const isInferenceRunning = inferenceState.status === 'running';

    return (
        <section aria-label="Provider diagnostics">
            {/* Inject keyframes once into the document head without a CSS module */}
            <style>{SPIN_KEYFRAMES}</style>

            <h3 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--ink)', marginBottom: 'var(--space-1)' }}>
                Provider diagnostics
            </h3>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--ink-3)', marginBottom: 'var(--space-3)' }}>
                These checks do not affect your saved settings
            </p>

            <CheckRow
                label="Test connection"
                state={connectionState}
                disabled={isConnectionRunning}
                onRun={handleTestConnection}
            />
            <CheckRow
                label="Test models"
                state={modelsState}
                disabled={isModelsRunning}
                onRun={handleTestModels}
            />
            <CheckRow
                label="Test inference"
                state={inferenceState}
                disabled={isInferenceRunning || inferenceRunning}
                onRun={handleTestInference}
            />
        </section>
    );
};

VerificationPanel.displayName = 'VerificationPanel';
export default VerificationPanel;
