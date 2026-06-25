import React from 'react';
import { selectCurrentView, selectIsAppBusy, useAppSelector } from '../../../logic/store';
import { UI_HEIGHTS } from '../../styles/constants';

const GlobalLoadingOverlay: React.FC = () => {
    const isAppBusy = useAppSelector(selectIsAppBusy);
    const view = useAppSelector(selectCurrentView);
    const isSettings = view === 'settings';

    if (!isAppBusy) {
        return null;
    }

    return (
        <div
            style={{
                position: 'fixed',
                zIndex: 201,
                top: UI_HEIGHTS.APP_BAR,
                right: 0,
                bottom: isSettings ? 0 : UI_HEIGHTS.STATUS_BAR,
                left: 0,
                backdropFilter: 'blur(4px)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                background: 'rgba(0,0,0,0.1)',
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
