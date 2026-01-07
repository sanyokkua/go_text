import { Alert, Box, Container, Snackbar, SnackbarCloseReason } from '@mui/material';
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
    const snackBarMessage = 'Message';
    const snackBarSeverity = 'success';

    const [open, setOpen] = React.useState(true);

    const handleClick = () => {
        setOpen(true);
    };

    const handleClose = (event?: React.SyntheticEvent | Event, reason?: SnackbarCloseReason) => {
        if (reason === 'clickaway') {
            return;
        }

        setOpen(false);
    };

    return (
        <Box
            component="main"
            sx={{ ...CONTAINER_STYLES.FULL_SIZE, height: HEIGHT_UTILS.contentAreaHeight(), padding: SPACING.SMALL, gap: SPACING.STANDARD }}
        >
            <Container maxWidth={false} disableGutters sx={{ ...FLEX_STYLES.COLUMN_OVERFLOW, padding: SPACING.SMALL }}>
                {/* Input/Output Container Section - takes most space */}
                <FlexContainer overflowHidden sx={{ height: HEIGHT_UTILS.editorsHeight() }}>
                    <InputOutputContainer />
                </FlexContainer>

                {/* Actions Panel Section - fixed height */}
                <FlexContainer overflowHidden sx={{ height: UI_HEIGHTS.ACTIONS_PANEL, padding: SPACING.SMALL }}>
                    <ActionsPanel />
                </FlexContainer>
            </Container>

            <Snackbar open={open} autoHideDuration={6000} onClose={handleClose} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
                <Alert onClose={handleClose} severity={snackBarSeverity} variant="filled" sx={{ width: '80%' }}>
                    {snackBarMessage}
                </Alert>
            </Snackbar>
        </Box>
    );
};

MainContentWidget.displayName = 'MainContentWidget';
export default MainContentWidget;
