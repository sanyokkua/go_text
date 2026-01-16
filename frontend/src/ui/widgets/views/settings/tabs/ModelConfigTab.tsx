import RefreshIcon from '@mui/icons-material/Refresh';
import {
    AutocompleteRenderInputParams,
    Box,
    Button,
    Checkbox,
    FormControl,
    FormControlLabel,
    FormLabel,
    Radio,
    RadioGroup,
    Slider,
    Typography,
} from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import React, { useEffect, useState } from 'react';
import { getLogger, ModelConfig, Settings } from '../../../../../logic/adapter';
import { selectAvailableModels, useAppDispatch, useAppSelector } from '../../../../../logic/store';
import { getModelsList } from '../../../../../logic/store/actions';
import { enqueueNotification } from '../../../../../logic/store/notifications';
import { updateModelConfig } from '../../../../../logic/store/settings';
import { setAppBusy } from '../../../../../logic/store/ui';
import { parseError } from '../../../../../logic/utils/error_utils';
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
    const availableModels = useAppSelector(selectAvailableModels);
    const [formData, setFormData] = useState<ModelConfig>({ ...settings.modelConfig });

    const fetchModels = async () => {
        try {
            logger.logDebug('Fetching models list');
            dispatch(setAppBusy(true));
            await dispatch(getModelsList()).unwrap();
            logger.logInfo('Models list refreshed successfully');
            dispatch(enqueueNotification({ message: 'Models list refreshed successfully', severity: 'success' }));
        } catch (error: unknown) {
            const err = parseError(error);
            logger.logError(`Failed to refresh models: ${err.message}`);
            dispatch(enqueueNotification({ message: `Failed to refresh models: ${err.message}`, severity: 'error' }));
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

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = e.target;
        if (name) {
            logger.logDebug(`Model config changed: ${name} = ${value}`);
            setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value }));
        }
    };

    const handleSliderChange = (_: Event, newValue: number | number[]) => {
        if (typeof newValue === 'number') {
            logger.logDebug(`Temperature slider changed to: ${newValue}`);
            setFormData((prev) => ({ ...prev, temperature: newValue }));
        }
    };

    const handleContextWindowSliderChange = (_: Event, newValue: number | number[]) => {
        if (typeof newValue === 'number') {
            logger.logDebug(`Context window slider changed to: ${newValue}`);
            setFormData((prev) => ({ ...prev, contextWindow: newValue }));
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
        } catch (error: unknown) {
            const err = parseError(error);
            logger.logError(`Failed to update model settings: ${err.message}`);
            dispatch(enqueueNotification({ message: `Failed to update model settings: ${err.message}`, severity: 'error' }));
        } finally {
            dispatch(setAppBusy(false));
        }
    };

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
                    <Autocomplete
                        fullWidth
                        multiple={false}
                        options={availableModels}
                        value={formData.name}
                        onChange={(_, newValue: string | null) => {
                            logger.logDebug(`Model selected: ${newValue}`);
                            setFormData((prev) => ({ ...prev, name: newValue || '' }));
                        }}
                        filterOptions={(options, state) => {
                            // Custom filter
                            return options.filter((option) => option.toLowerCase().includes(state.inputValue.toLowerCase()));
                        }}
                        renderInput={(params: AutocompleteRenderInputParams) => {
                            // @ts-expect-error it is a bug in typing of MUI library
                            return <TextField {...params} label="Select Model" placeholder="Type to filter models..." size="small" />;
                        }}
                        disablePortal
                        autoHighlight
                        clearOnBlur
                        handleHomeEndKeys
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
                                { value: 0, label: '0.0' },
                                { value: 0.5, label: '0.5' },
                                { value: 1, label: '1.0' },
                                { value: 1.5, label: '1.5' },
                                { value: 2, label: '2.0' },
                            ]}
                        />
                        <Typography variant="caption" color="text.primary">
                            Lower values make output more deterministic, higher values more creative
                        </Typography>
                    </Box>
                )}

                <FormControlLabel
                    control={<Checkbox name="useContextWindow" checked={formData.useContextWindow} onChange={handleChange} />}
                    label="Use Context Window"
                />

                {formData.useContextWindow && (
                    <Box sx={{ paddingX: SPACING.STANDARD }}>
                        <Typography gutterBottom>Context Window: {formData.contextWindow} tokens</Typography>
                        <Slider
                            value={formData.contextWindow}
                            onChange={handleContextWindowSliderChange}
                            min={1024}
                            max={200000}
                            step={1024}
                            valueLabelDisplay="auto"
                            marks={[
                                { value: 1024, label: '1K' },
                                { value: 4096, label: '4K' },
                                { value: 16384, label: '16K' },
                                { value: 32768, label: '32K' },
                                { value: 65536, label: '64K' },
                                { value: 131072, label: '128K' },
                                { value: 200000, label: '200K' },
                            ]}
                        />
                        <Typography variant="caption" color="text.primary">
                            Context window controls maximum token limit for LLM responses (1024-200000 tokens)
                        </Typography>

                        <FormControl component="fieldset" sx={{ mt: 2 }}>
                            <FormLabel component="legend">Token Limit Parameter</FormLabel>
                            <RadioGroup
                                row
                                name="useLegacyMaxTokens"
                                value={formData.useLegacyMaxTokens ? 'legacy' : 'current'}
                                onChange={(e) => {
                                    const useLegacy = e.target.value === 'legacy';
                                    setFormData((prev) => ({ ...prev, useLegacyMaxTokens: useLegacy }));
                                }}
                            >
                                <FormControlLabel value="current" control={<Radio />} label="max_completion_tokens (Recommended)" />
                                <FormControlLabel value="legacy" control={<Radio />} label="max_tokens (Legacy)" />
                            </RadioGroup>
                            <Typography variant="caption" color="text.secondary">
                                Choose which parameter to use for controlling response length. max_completion_tokens is recommended for OpenAI.
                            </Typography>
                        </FormControl>
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
