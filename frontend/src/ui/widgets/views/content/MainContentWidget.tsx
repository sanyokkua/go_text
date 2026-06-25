import React from 'react';
import FlexContainer from '../../../components/FlexContainer';
import { HEIGHT_UTILS, UI_HEIGHTS } from '../../../styles/constants';
import ActionsPanel from './actions/ActionsPanel';
import InputOutputContainer from './editor/InputOutputContainer';

const MainContentWidget: React.FC = () => {
    return (
        <main style={{ width: '100%', height: '100%', padding: 0, display: 'flex', flexDirection: 'column' }}>
            <FlexContainer overflowHidden style={{ height: HEIGHT_UTILS.editorsHeight() }}>
                <InputOutputContainer />
            </FlexContainer>
            <FlexContainer overflowHidden style={{ width: '100%', height: UI_HEIGHTS.ACTIONS_PANEL }}>
                <ActionsPanel />
            </FlexContainer>
        </main>
    );
};

MainContentWidget.displayName = 'MainContentWidget';
export default MainContentWidget;
