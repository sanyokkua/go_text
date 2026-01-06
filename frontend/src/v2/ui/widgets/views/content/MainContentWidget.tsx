import { Box, Container } from '@mui/material';
import React from 'react';
import FlexContainer from '../../../components/FlexContainer';
import { CONTAINER_STYLES, FLEX_STYLES, HEIGHT_UTILS, SPACING, UI_HEIGHTS } from '../../../styles/constants';
import ActionsPanel from './actions/ActionsPanel';
import InputOutputContainer from './editor/InputOutputContainer';

/**
 * Main Content Widget - replaces the v1 ContentWidget
 * Contains two horizontal sections:
 * 1. Input/Output container (top) - takes most space
 * 2. Actions panel (bottom) - fixed height
 */
const MainContentWidget: React.FC = () => {
    return (
        <Box
            component="main"
            sx={{
                ...CONTAINER_STYLES.FULL_SIZE,
                height: HEIGHT_UTILS.contentAreaHeight(),
                padding: SPACING.STANDARD,
                backgroundColor: 'background.default',
                gap: SPACING.STANDARD,
            }}
        >
            <Container maxWidth={false} disableGutters sx={{ ...FLEX_STYLES.COLUMN_OVERFLOW, gap: SPACING.STANDARD }}>
                {/* Input/Output Container Section - takes most space */}
                <FlexContainer direction="row" overflowHidden grow gap={SPACING.STANDARD} sx={{ height: HEIGHT_UTILS.editorsHeight() }}>
                    <InputOutputContainer />
                </FlexContainer>

                {/* Actions Panel Section - fixed height */}
                <FlexContainer direction="column" overflowHidden sx={{ height: UI_HEIGHTS.ACTIONS_PANEL, gap: SPACING.SMALL }}>
                    <ActionsPanel />
                </FlexContainer>
            </Container>
        </Box>
    );
};

MainContentWidget.displayName = 'MainContentWidget';
export default MainContentWidget;
