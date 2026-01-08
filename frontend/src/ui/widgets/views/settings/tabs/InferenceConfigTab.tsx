import { Box, Button, Checkbox, FormControlLabel, Paper, TextField } from '@mui/material';
import React, { useState } from 'react';
import { InferenceBaseConfig, Settings } from '../../../../../logic/adapter';
import { useAppDispatch } from '../../../../../logic/store';
import { enqueueNotification } from '../../../../../logic/store/notifications';
import { updateInferenceBaseConfig } from '../../../../../logic/store/settings';
import { setAppBusy } from '../../../../../logic/store/ui';
import { SPACING } from '../../../../styles/constants';

interface InferenceConfigTabProps {
    settings: Settings;
}

/**
 * Inference Config Tab Component
 * Configuration for inference settings
 */
const InferenceConfigTab: React.FC<InferenceConfigTabProps> = ({ settings }) => {
    const dispatch = useAppDispatch();
    const [formData, setFormData] = useState<InferenceBaseConfig>({ ...settings.inferenceBaseConfig });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : type === 'number' ? Number(value) : value }));
    };

    const handleSliderChange = (name: string) => (event: Event, newValue: number | number[]) => {
        if (typeof newValue === 'number') {
            setFormData((prev) => ({ ...prev, [name]: newValue }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            dispatch(setAppBusy(true));
            await dispatch(updateInferenceBaseConfig(formData)).unwrap();
            dispatch(enqueueNotification({ message: 'Inference settings updated successfully', severity: 'success' }));
        } catch (error) {
            dispatch(enqueueNotification({ message: `Failed to update inference settings: ${error}`, severity: 'error' }));
        } finally {
            dispatch(setAppBusy(false));
        }
    };

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: SPACING.STANDARD }}>
            <Paper elevation={0} sx={{ padding: SPACING.STANDARD, flex: 1 }}>
                <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: SPACING.STANDARD }}>
                    <TextField
                        label="LLM Request Timeout (seconds)"
                        name="timeout"
                        type="number"
                        value={formData.timeout}
                        onChange={handleChange}
                        slotProps={{ htmlInput: { min: 1, max: 600, step: 1 } }}
                        helperText="Request timeout in seconds (1-600)"
                        fullWidth
                    />

                    <TextField
                        label="LLM Request Max Retries"
                        name="maxRetries"
                        type="number"
                        value={formData.maxRetries}
                        onChange={handleChange}
                        slotProps={{ htmlInput: { min: 0, max: 10, step: 1 } }}
                        helperText="Maximum number of retries (0-10)"
                        fullWidth
                    />

                    <FormControlLabel
                        control={<Checkbox name="useMarkdownForOutput" checked={formData.useMarkdownForOutput} onChange={handleChange} />}
                        label="Use Markdown for Output"
                        sx={{ marginTop: SPACING.SMALL }}
                    />

                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', marginTop: SPACING.LARGE }}>
                        <Button variant="contained" color="primary" type="submit">
                            Update Inference Settings
                        </Button>
                    </Box>
                </Box>
            </Paper>
        </Box>
    );
};

InferenceConfigTab.displayName = 'InferenceConfigTab';
export default InferenceConfigTab;
