import React from 'react';
import { selectCurrentProvider, selectInferenceRunning, selectModelConfig, useAppSelector } from '../../../logic/store';

const StatusBar: React.FC = () => {
    const provider = useAppSelector(selectCurrentProvider)?.providerName || 'N/A';
    const model = useAppSelector(selectModelConfig)?.name || 'N/A';
    const running = useAppSelector(selectInferenceRunning);

    return (
        <div
            style={{
                width: '100%',
                height: '100%',
                padding: '4px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'var(--surface)',
                borderTop: '1px solid var(--line)',
                fontSize: '0.8rem',
                color: 'var(--ink-2)',
            }}
        >
            <span>Provider: {provider}</span>
            <span>Model: {model}</span>
            <span>Status: {running ? 'Running…' : 'Idle'}</span>
        </div>
    );
};

StatusBar.displayName = 'StatusBar';
export default StatusBar;
