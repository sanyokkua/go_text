import React from 'react';

import { selectCurrentView, selectInferenceRunning, useAppSelector } from '../../../logic/store';
import { UI_HEIGHTS } from '../../styles/constants';

const GlobalLoadingOverlay: React.FC = () => {
    const isRunning = useAppSelector(selectInferenceRunning);
    const view = useAppSelector(selectCurrentView);

    if (!isRunning || view !== 'main') {
        return null;
    }

    return (
        <div
            style={{
                position: 'fixed',
                zIndex: 'var(--z-modal)' as React.CSSProperties['zIndex'],
                top: UI_HEIGHTS.APP_BAR,
                right: 0,
                bottom: 0,
                left: 0,
                backdropFilter: 'blur(4px)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                background: 'var(--scrim)',
            }}
        >
            <div
                style={{
                    width: 48,
                    height: 48,
                    border: '4px solid var(--line)',
                    borderTopColor: 'var(--teal)',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                }}
            />
            <p style={{ marginTop: 'var(--space-3)', color: 'var(--ink)' }}>Processing…</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
};

GlobalLoadingOverlay.displayName = 'GlobalLoadingOverlay';
export default GlobalLoadingOverlay;
