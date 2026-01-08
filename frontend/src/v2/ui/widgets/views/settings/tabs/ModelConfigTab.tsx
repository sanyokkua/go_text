import RefreshIcon from '@mui/icons-material/Refresh';
import {
    Box,
    Button,
    Checkbox,
    FormControl,
    FormControlLabel,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Slider,
    TextField,
    Typography,
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import { ModelConfig, Settings } from '../../../../../logic/adapter';
import { SPACING } from '../../../../styles/constants';
import { useAppDispatch, useAppSelector } from '../../../../../logic/store';
import { updateModelConfig } from '../../../../../logic/store/settings';
import { getModelsList } from '../../../../../logic/store/actions';
import { setAppBusy } from '../../../../../logic/store/ui';
import { enqueueNotification } from '../../../../../logic/store/notifications';

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

    // Fetch models list on mount if empty
    useEffect(() => {
        if (availableModels.length === 0) {
            const fetchModels = async () => {
                try {
                    dispatch(setAppBusy(true));
                    await dispatch(getModelsList()).unwrap();
                } catch (error) {
                    dispatch(enqueueNotification({ message: `Failed to fetch models: ${error}`, severity: 'error' }));
                } finally {
                    dispatch(setAppBusy(false));
                }
            };
            fetchModels();
        }
    }, [dispatch, availableModels.length]);

    const handleRefreshModels = async () => {
        try {
            dispatch(setAppBusy(true));
            await dispatch(getModelsList()).unwrap();
            dispatch(enqueueNotification({ message: 'Models list refreshed successfully', severity: 'success' }));
        } catch (error) {
            dispatch(enqueueNotification({ message: `Failed to refresh models: ${error}`, severity: 'error' }));
        } finally {
            dispatch(setAppBusy(false));
        }
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            dispatch(setAppBusy(true));
            await dispatch(updateModelConfig(formData)).unwrap();
            dispatch(enqueueNotification({ message: 'Model settings updated successfully', severity: 'success' }));
        } catch (error) {
            dispatch(enqueueNotification({ message: `Failed to update model settings: ${error}`, severity: 'error' }));
        } finally {
            dispatch(setAppBusy(false));
        }
    };

    // Filter models based on filter text
    const filteredModels = availableModels.filter((model) => model.toLowerCase().includes(filterText.toLowerCase()));

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: SPACING.STANDARD }}>
            <Paper elevation={0} sx={{ padding: SPACING.STANDARD, flex: 1 }}>
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
                        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={handleRefreshModels} sx={{ minWidth: 'fit-content' }}>
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
