import React, { useEffect } from 'react';
import { getLogger } from '../../../logic/adapter';
import { selectCurrentView, useAppDispatch, useAppSelector } from '../../../logic/store';
import { loadActionCatalog } from '../../../logic/store/actions';
import { initializeSettingsState } from '../../../logic/store/settings';
import { setActiveActionsTab } from '../../../logic/store/ui';
import { parseError } from '../../../logic/utils/error_utils';
import FlexContainer from '../../components/FlexContainer';
import { UI_HEIGHTS } from '../../styles/constants';
import AppBar from '../base/AppBar';
import StatusBar from '../base/StatusBar';
import MainContent from './MainContent';

const logger = getLogger('AppMainView');

const AppMainView: React.FC = () => {
    const dispatch = useAppDispatch();
    const view = useAppSelector(selectCurrentView);
    const showSettings = view === 'settings';

    useEffect(() => {
        const initializeApp = async () => {
            try {
                logger.logInfo('Initializing app state');
                await dispatch(initializeSettingsState()).unwrap();
                logger.logInfo('Settings initialized');
                const catalog = await dispatch(loadActionCatalog()).unwrap();
                logger.logInfo(`Catalog loaded: ${catalog.length} actions`);
                if (catalog.length > 0) {
                    dispatch(setActiveActionsTab(catalog[0].category));
                }
            } catch (error: unknown) {
                const err = parseError(error);
                logger.logError(`Failed to initialize app: ${err.message}`);
            }
        };
        initializeApp();
    }, [dispatch]);

    return (
        <FlexContainer direction="column" overflowHidden style={{ width: '100%', height: '100%', maxHeight: '100vh', minHeight: '100vh' }}>
            <div style={{ height: UI_HEIGHTS.APP_BAR }}>
                <AppBar />
            </div>
            <FlexContainer grow overflowHidden>
                <MainContent />
            </FlexContainer>
            {!showSettings && (
                <div style={{ height: UI_HEIGHTS.STATUS_BAR }}>
                    <StatusBar />
                </div>
            )}
        </FlexContainer>
    );
};

AppMainView.displayName = 'AppMainView';
export default AppMainView;
