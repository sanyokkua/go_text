import React from 'react';
import { getLogger } from '../../../logic/adapter';
import { selectCurrentView, useAppDispatch, useAppSelector } from '../../../logic/store';
import { toggleInfoView, toggleSettingsView } from '../../../logic/store/ui';

const logger = getLogger('AppBar');

const AppBar: React.FC = () => {
    const dispatch = useAppDispatch();
    const view = useAppSelector(selectCurrentView);
    const showSettings = view === 'settings';
    const showInfo = view === 'info';
    const showMain = view === 'main';

    const handleInfoClick = () => {
        logger.logInfo('Info button clicked');
        dispatch(toggleInfoView());
    };

    const handleRightButtonClick = () => {
        if (showSettings) {
            logger.logInfo('Closing settings');
            dispatch(toggleSettingsView());
        } else if (showInfo) {
            logger.logInfo('Closing information');
            dispatch(toggleInfoView());
        } else {
            logger.logInfo('Opening settings');
            dispatch(toggleSettingsView());
        }
    };

    const rightLabel = showSettings || showInfo ? '✕' : '⚙';

    return (
        <header
            style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 var(--space-3)',
                background: 'var(--teal-dark)',
                color: '#fff',
            }}
        >
            <span style={{ fontWeight: 600 }}>Text Processor</span>
            <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                {showMain && (
                    <button
                        aria-label="information"
                        onClick={handleInfoClick}
                        style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '1rem' }}
                    >
                        ℹ
                    </button>
                )}
                <button
                    aria-label={showSettings ? 'close settings' : showInfo ? 'close information' : 'open settings'}
                    onClick={handleRightButtonClick}
                    style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '1rem' }}
                >
                    {rightLabel}
                </button>
            </div>
        </header>
    );
};

AppBar.displayName = 'AppBar';
export default AppBar;
