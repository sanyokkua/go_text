import { Box, Button, Checkbox, FormControlLabel, TextField, Typography } from '@mui/material';
import React, { useState } from 'react';
import { getLogger, InferenceBaseConfig, Settings } from '../../../../../logic/adapter';
import { useAppDispatch } from '../../../../../logic/store';
import { enqueueNotification } from '../../../../../logic/store/notifications';
import { updateInferenceBaseConfig } from '../../../../../logic/store/settings';
import { setAppBusy } from '../../../../../logic/store/ui';
import { SPACING } from '../../../../styles/constants';

const logger = getLogger('InferenceConfigTab');

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
        logger.logDebug(`Inference config changed: ${name} = ${type === 'checkbox' ? checked : value}`);
        setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : type === 'number' ? Number(value) : value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            logger.logDebug(`Updating inference config: ${JSON.stringify(formData)}`);
            dispatch(setAppBusy(true));
            await dispatch(updateInferenceBaseConfig(formData)).unwrap();
            logger.logInfo('Inference settings updated successfully');
            dispatch(enqueueNotification({ message: 'Inference settings updated successfully', severity: 'success' }));
        } catch (error) {
            logger.logError(`Failed to update inference settings: ${error}`);
            dispatch(enqueueNotification({ message: `Failed to update inference settings: ${error}`, severity: 'error' }));
        } finally {
            dispatch(setAppBusy(false));
        }
    };

    return (
        <Box sx={{ padding: SPACING.SMALL, flex: 1 }}>
            {/* Tab Description */}
            <Box sx={{ marginBottom: SPACING.STANDARD }}>
                <Typography variant="body2" color="text.secondary" component="div" gutterBottom>
                    This tab configures the technical parameters for LLM API requests and output formatting.
                </Typography>
                <Typography variant="body2" color="text.secondary" component="div" gutterBottom>
                    <strong>How to use:</strong> Adjust the timeout, retry, and output format settings, then click &quot;Update Inference
                    Settings&quot; to apply changes.
                </Typography>
                <Typography variant="body2" color="text.secondary" component="div" gutterBottom>
                    <strong>Application:</strong> Changes are applied when you click the &quot;Update Inference Settings&quot; button and will affect
                    all subsequent LLM API calls.
                </Typography>
                <Typography variant="body2" color="text.secondary" component="div" gutterBottom>
                    <strong>Note:</strong> Higher timeout values may be needed for complex requests or slow networks, but will make the application
                    less responsive.
                </Typography>
            </Box>

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
                    size="small"
                />

                <TextField
                    label="LLM Request Max Retries"
                    name="maxRetries"
                    type="number"
                    value={formData.maxRetries}
                    onChange={handleChange}
                    slotProps={{ htmlInput: { min: 0, max: 10, step: 1 } }}
                    helperText="Maximum number of retries (0-10)"
                    size="small"
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
        </Box>
    );
};

InferenceConfigTab.displayName = 'InferenceConfigTab';
export default InferenceConfigTab;
