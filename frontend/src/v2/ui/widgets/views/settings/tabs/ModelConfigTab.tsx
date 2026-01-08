import RefreshIcon from '@mui/icons-material/Refresh';
import { Box, Button, Checkbox, FormControl, FormControlLabel, InputLabel, MenuItem, Paper, Select, Slider, Typography } from '@mui/material';
import React, { useState } from 'react';
import { ModelConfig, Settings } from '../../../../../logic/adapter';
import { SPACING } from '../../../../styles/constants';

interface ModelConfigTabProps {
    settings: Settings;
    onUpdateSettings: (updatedSettings: Settings) => void;
}

/**
 * Model Config Tab Component
 * Configuration for model settings
 */
const ModelConfigTab: React.FC<ModelConfigTabProps> = ({ settings, onUpdateSettings }) => {
    const [formData, setFormData] = useState<ModelConfig>({ ...settings.modelConfig });

    // Get available models from current provider (stub data for now)
    const availableModels = ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo', 'claude-3-opus', 'claude-3-sonnet', 'llama-3-70b', 'llama-3-8b'];

    const handleRefreshModels = () => {
        // TODO: Connect to Redux to refresh models list from current provider
        console.log('Refreshing models list from provider:', settings.currentProviderConfig.providerName);
        // This would typically call an API to fetch available models from the current provider
        // For now, we'll just log the action
    };

    const handleChange = (e: any) => {
        const { name, value, type } = e.target;
        if (name) {
            setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value }));
        }
    };

    const handleSliderChange = (event: Event, newValue: number | number[]) => {
        if (typeof newValue === 'number') {
            setFormData((prev) => ({ ...prev, temperature: newValue }));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const updatedSettings = { ...settings, modelConfig: formData };
        onUpdateSettings(updatedSettings);
        console.log('Model settings updated:', formData);
    };

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: SPACING.STANDARD }}>
            <Paper elevation={0} sx={{ padding: SPACING.STANDARD, flex: 1 }}>
                <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: SPACING.STANDARD }}>
                    <Box sx={{ display: 'flex', gap: SPACING.STANDARD, alignItems: 'center' }}>
                        <FormControl fullWidth>
                            <InputLabel>Model Name</InputLabel>
                            <Select name="name" value={formData.name} size="small" onChange={handleChange} label="Model Name" required>
                                {availableModels.map((model) => (
                                    <MenuItem key={model} value={model}>
                                        {model}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={handleRefreshModels} sx={{ minWidth: 'fit-content' }}>
                            Refresh Models
                        </Button>
                    </Box>

                    <FormControlLabel
                        control={<Checkbox name="useTemperature" checked={formData.useTemperature} onChange={handleChange} />}
                        label="Use Temperature"
                    />

                    {formData.useTemperature && (
                        <Box sx={{ paddingX: SPACING.STANDARD }}>
                            <Typography gutterBottom>Temperature: {formData.temperature}</Typography>
                            <Slider
                                value={formData.temperature}
                                onChange={handleSliderChange}
                                min={0}
                                max={2}
                                step={0.1}
                                valueLabelDisplay="auto"
                                marks={[
                                    { value: 0, label: '0' },
                                    { value: 1, label: '1' },
                                    { value: 2, label: '2' },
                                ]}
                            />
                            <Typography variant="caption" color="text.secondary">
                                Lower values make output more deterministic, higher values more creative
                            </Typography>
                        </Box>
                    )}

                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', marginTop: SPACING.LARGE }}>
                        <Button variant="contained" color="primary" type="submit">
                            Update Model Settings
                        </Button>
                    </Box>
                </Box>
            </Paper>
        </Box>
    );
};

ModelConfigTab.displayName = 'ModelConfigTab';
export default ModelConfigTab;
