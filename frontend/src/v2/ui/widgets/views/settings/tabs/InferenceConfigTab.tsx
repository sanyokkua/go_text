import { Box, Button, Checkbox, FormControlLabel, Paper, TextField } from '@mui/material';
import React, { useState } from 'react';
import { InferenceBaseConfig, Settings } from '../../../../../logic/adapter';
import { SPACING } from '../../../../styles/constants';

interface InferenceConfigTabProps {
    settings: Settings;
    onUpdateSettings: (updatedSettings: Settings) => void;
}

/**
 * Inference Config Tab Component
 * Configuration for inference settings
 */
const InferenceConfigTab: React.FC<InferenceConfigTabProps> = ({ settings, onUpdateSettings }) => {
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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const updatedSettings = { ...settings, inferenceBaseConfig: formData };
        onUpdateSettings(updatedSettings);
        console.log('Inference settings updated:', formData);
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
