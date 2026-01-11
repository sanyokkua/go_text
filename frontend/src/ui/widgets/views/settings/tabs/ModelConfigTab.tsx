import RefreshIcon from '@mui/icons-material/Refresh';
import { Box, Button, Checkbox, FormControl, FormControlLabel, InputLabel, MenuItem, Select, Slider, TextField, Typography } from '@mui/material';
import React, { useEffect, useState } from 'react';
import { getLogger, ModelConfig, Settings } from '../../../../../logic/adapter';
import { useAppDispatch, useAppSelector } from '../../../../../logic/store';
import { getModelsList } from '../../../../../logic/store/actions';
import { enqueueNotification } from '../../../../../logic/store/notifications';
import { updateModelConfig } from '../../../../../logic/store/settings';
import { setAppBusy } from '../../../../../logic/store/ui';
import { SPACING } from '../../../../styles/constants';

const logger = getLogger('ModelConfigTab');

interface ModelConfigTabProps {
    settings: Settings;
}

/**
 * Model Config Tab Component
 * Configuration for model settings
 */
const ModelConfigTab: React.FC<ModelConfigTabProps> = ({ settings }) => {
    const dispatch = useAppDispatch();
    const availableModels = useAppSelector((state) => state.actions.availableModels);
    const [formData, setFormData] = useState<ModelConfig>({ ...settings.modelConfig });
    const [filterText, setFilterText] = useState('');

    const fetchModels = async () => {
        try {
            logger.logDebug('Fetching models list');
            dispatch(setAppBusy(true));
            await dispatch(getModelsList()).unwrap();
            logger.logInfo('Models list refreshed successfully');
            dispatch(enqueueNotification({ message: 'Models list refreshed successfully', severity: 'success' }));
        } catch (error) {
            logger.logError(`Failed to refresh models: ${error}`);
            dispatch(enqueueNotification({ message: `Failed to refresh models: ${error}`, severity: 'error' }));
        } finally {
            dispatch(setAppBusy(false));
        }
    };

    // Fetch models list on mount if empty
    useEffect(() => {
        if (availableModels.length === 0) {
            logger.logDebug('No models available, fetching models list');
            fetchModels();
        }
    }, [dispatch, availableModels.length]);

    const handleRefreshModels = async () => {
        logger.logDebug('Manual models refresh requested');
        fetchModels();
    };

    const handleChange = (e: any) => {
        const { name, value, type } = e.target;
        if (name) {
            logger.logDebug(`Model config changed: ${name} = ${value}`);
            setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value }));
        }
    };

    const handleSliderChange = (event: Event, newValue: number | number[]) => {
        if (typeof newValue === 'number') {
            logger.logDebug(`Temperature slider changed to: ${newValue}`);
            setFormData((prev) => ({ ...prev, temperature: newValue }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            logger.logDebug(`Updating model config: ${JSON.stringify(formData)}`);
            dispatch(setAppBusy(true));
            await dispatch(updateModelConfig(formData)).unwrap();
            logger.logInfo('Model settings updated successfully');
            dispatch(enqueueNotification({ message: 'Model settings updated successfully', severity: 'success' }));
        } catch (error) {
            logger.logError(`Failed to update model settings: ${error}`);
            dispatch(enqueueNotification({ message: `Failed to update model settings: ${error}`, severity: 'error' }));
        } finally {
            dispatch(setAppBusy(false));
        }
    };

    // Filter models based on filter text
    const filteredModels = availableModels.filter((model) => model.toLowerCase().includes(filterText.toLowerCase()));

    return (
        <Box sx={{ padding: SPACING.SMALL, flex: 1 }}>
            {/* Tab Description */}
            <Box sx={{ marginBottom: SPACING.STANDARD }}>
                <Typography variant="body2" color="text.secondary" component="div" gutterBottom>
                    This tab allows you to configure the LLM model settings. Select which model to use and adjust its parameters.
                </Typography>
                <Typography variant="body2" color="text.secondary" component="div" gutterBottom>
                    <strong>How to use:</strong> Choose a model from the dropdown list, configure temperature settings if needed, then click
                    &quot;Update Model Settings&quot; to apply changes.
                </Typography>
                <Typography variant="body2" color="text.secondary" component="div" gutterBottom>
                    <strong>Application:</strong> Changes are applied when you click the &quot;Update Model Settings&quot; button and will affect all
                    subsequent LLM interactions.
                </Typography>
                <Typography variant="body2" color="text.secondary" component="div" gutterBottom>
                    <strong>Note:</strong> The available models list depends on your current provider configuration. If you change providers, click
                    &quot;Refresh Models&quot; to update the list.
                </Typography>
            </Box>

            <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: SPACING.STANDARD }}>
                <Box sx={{ display: 'flex', gap: SPACING.STANDARD, alignItems: 'center' }}>
                    <TextField
                        fullWidth
                        label="Filter Models"
                        value={filterText}
                        onChange={(e) => setFilterText(e.target.value)}
                        placeholder="Type to filter models..."
                        size="small"
                    />
                    <Button
                        variant="outlined"
                        color="secondary"
                        startIcon={<RefreshIcon />}
                        onClick={handleRefreshModels}
                        sx={{ minWidth: 'fit-content' }}
                    >
                        Refresh Models
                    </Button>
                </Box>

                <FormControl fullWidth>
                    <InputLabel>Model Name</InputLabel>
                    <Select name="name" value={formData.name} size="small" onChange={handleChange} label="Model Name" required>
                        {filteredModels.map((model) => (
                            <MenuItem key={model} value={model}>
                                {model}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

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
                        <Typography variant="caption" color="text.primary">
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
        </Box>
    );
};

ModelConfigTab.displayName = 'ModelConfigTab';
export default ModelConfigTab;
