import { Paper, Typography } from '@mui/material';
import React from 'react';
import { CONTAINER_STYLES } from '../../styles/constants';

const StatusBar: React.FC = () => {
    // Hardcoded values - will be replaced with Redux later
    const provider = 'N/A';
    const model = 'N/A';
    const task = 'N/A';

    return (
        <Paper
            elevation={3}
            square
            sx={{
                ...CONTAINER_STYLES.FULL_SIZE,
                padding: '8px 16px',
                backgroundColor: 'background.paper',
                borderTop: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
            }}
        >
            <Typography variant="body2" color="text.secondary">
                Provider: {provider}
            </Typography>
            <Typography variant="body2" color="text.secondary">
                Model: {model}
            </Typography>
            <Typography variant="body2" color="text.secondary">
                Task: {task}
            </Typography>
        </Paper>
    );
};

StatusBar.displayName = 'StatusBar';
export default StatusBar;
