import React, { useState } from 'react';
import { Box, Typography } from '@mui/material';
import HeadersEditor from './HeadersEditor';

/**
 * Test component for HeadersEditor
 * This is for debugging the headers functionality
 */
const HeadersEditorTest: React.FC = () => {
    const [headers, setHeaders] = useState<Record<string, string>>({});

    return (
        <Box sx={{ padding: 4 }}>
            <Typography variant="h6" gutterBottom>
                Headers Editor Test
            </Typography>
            <Typography variant="body1" paragraph>
                Current headers: {JSON.stringify(headers)}
            </Typography>
            <HeadersEditor headers={headers} onChange={setHeaders} />
        </Box>
    );
};

HeadersEditorTest.displayName = 'HeadersEditorTest';
export default HeadersEditorTest;