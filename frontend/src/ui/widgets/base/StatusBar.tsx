import { Paper, Typography } from '@mui/material';
import React from 'react';
import { selectCurrentProvider, selectCurrentTask, selectModelConfig, useAppSelector } from '../../../logic/store';

const StatusBar: React.FC = () => {
    // Get values from Redux store
    const provider = useAppSelector(selectCurrentProvider)?.providerName || 'N/A';
    const model = useAppSelector(selectModelConfig)?.name || 'N/A';
    const task = useAppSelector(selectCurrentTask);

    return (
        <Paper
            square
            sx={{ width: '100%', height: '100%', padding: '8px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
            <Typography variant="body2" color="text.primary">
                Provider: {provider}
            </Typography>
            <Typography variant="body2" color="text.primary">
                Model: {model}
            </Typography>
            <Typography variant="body2" color="text.primary">
                Task: {task}
            </Typography>
        </Paper>
    );
};

StatusBar.displayName = 'StatusBar';
export default StatusBar;
