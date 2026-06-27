import React from 'react';

import { selectCurrentView, useAppSelector } from '../../../logic/store';
import FlexContainer from '../../components/FlexContainer';
import EditorView from './editor/EditorView';
import { InfoView } from './info';
import { SettingsView } from './settings';

const resolveView = (view: ReturnType<typeof selectCurrentView>): React.ReactElement => {
    if (view === 'settings') return <SettingsView />;
    if (view === 'info') return <InfoView />;
    return <EditorView />;
};

const MainContent: React.FC = () => {
    const view = useAppSelector(selectCurrentView);

    return (
        <FlexContainer grow overflowHidden>
            {resolveView(view)}
        </FlexContainer>
    );
};

MainContent.displayName = 'MainContent';
export default MainContent;
