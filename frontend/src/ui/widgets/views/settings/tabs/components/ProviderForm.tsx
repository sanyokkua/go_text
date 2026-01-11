import {
    Box,
    Button,
    Checkbox,
    Divider,
    FormControl,
    FormControlLabel,
    FormLabel,
    InputLabel,
    MenuItem,
    Select,
    TextField,
    Typography,
} from '@mui/material';
import React, { ChangeEvent, ReactNode, useEffect, useState } from 'react';
import { getLogger, ProviderConfig } from '../../../../../../logic/adapter';
import { SPACING } from '../../../../../styles/constants';
import HeadersEditor from './HeadersEditor';

const logger = getLogger('ProviderForm');

interface ProviderFormProps {
    provider?: ProviderConfig;
    authTypes: string[];
    providerTypes: string[];
    onSave: (provider: ProviderConfig) => void;
    onCancel: () => void;
    onTestModels?: (providerConfig: ProviderConfig) => void;
    onTestInference?: (providerConfig: ProviderConfig, modelId: string) => void;
    testResults?: { models: string[]; connectionSuccess: boolean } | null;
}

/**
 * Provider Form Component
 * Form for creating/editing provider configurations
 */
const ProviderForm: React.FC<ProviderFormProps> = ({
    provider,
    authTypes,
    providerTypes,
    onSave,
    onCancel,
    onTestModels,
    onTestInference,
    testResults,
}) => {
    const [formData, setFormData] = useState<ProviderConfig>({
        providerId: '',
        providerName: '',
        providerType: providerTypes[0] || '',
        baseUrl: '',
        modelsEndpoint: '',
        completionEndpoint: '',
        authType: authTypes[0] || '',
        authToken: '',
        useAuthTokenFromEnv: false,
        envVarTokenName: '',
        useCustomHeaders: false,
        headers: {},
        useCustomModels: false,
        customModels: [],
    });

    // Initialize a form with provider data if editing
    useEffect(() => {
        if (provider) {
            setFormData({
                ...provider,
                // Ensure customModels is always an array to prevent rendering errors
                customModels: provider.customModels || [],
            });
        }
    }, [provider]);

    const [selectedModel, setSelectedModel] = useState<string>('');

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        if (name) {
            logger.logDebug(`Input changed: ${name} = ${value}`);
            setFormData((prev) => ({ ...prev, [name]: value }));
        }
    };

    const handleSelectChange = (
        e: ChangeEvent<Omit<HTMLInputElement, 'value'> & { value: string }> | (Event & { target: { value: string; name: string } }),
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        _: ReactNode,
    ) => {
        const { name, value } = e.target;
        if (name) {
            logger.logDebug(`Select changed: ${name} = ${value}`);
            setFormData((prev) => ({ ...prev, [name]: value }));
        }
    };

    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, checked } = e.target;
        logger.logDebug(`Checkbox changed: ${name} = ${checked}`);
        setFormData((prev) => ({ ...prev, [name]: checked }));
    };

    const handleHeadersChange = (headers: Record<string, string>) => {
        logger.logDebug(`Headers changed: ${Object.keys(headers).length} headers configured`);
        setFormData((prev) => ({ ...prev, headers }));
    };

    const handleCustomModelsChange = (models: string[]) => {
        logger.logDebug(`Custom models changed: ${models.length} models configured`);
        setFormData((prev) => ({ ...prev, customModels: models }));
    };

    const [errors, setErrors] = useState<Record<string, string>>({});

    const validateForm = (): boolean => {
        logger.logDebug('Validating provider form');
        const newErrors: Record<string, string> = {};

        // Required fields validation
        if (!formData.providerName.trim()) {
            newErrors.providerName = 'Provider name is required';
        }

        if (!formData.baseUrl.trim()) {
            newErrors.baseUrl = 'Base URL is required';
        } else if (!formData.baseUrl.startsWith('http://') && !formData.baseUrl.startsWith('https://')) {
            newErrors.baseUrl = 'Base URL must start with http:// or https://';
        }

        if (!formData.completionEndpoint.trim()) {
            newErrors.completionEndpoint = 'Completion endpoint is required';
        }

        // URL format validation (basic)
        if (formData.baseUrl.trim() && !formData.baseUrl.endsWith('/')) {
            newErrors.baseUrl = 'Base URL should end with /';
        }

        if (Object.keys(newErrors).length > 0) {
            logger.logWarning(`Form validation failed: ${Object.keys(newErrors).join(', ')}`);
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        logger.logDebug('Provider form submission attempted');

        if (!validateForm()) {
            logger.logError('Form validation failed, submission aborted');
            return;
        }

        logger.logInfo(`Submitting provider: ${formData.providerName}`);

        if (!provider) {
            // If no provider prop was passed (new provider)
            // For new providers, send empty providerId so the backend generates proper UUID
            onSave({ ...formData, providerId: '' });
        } else {
            // For existing providers, keep the original ID
            onSave(formData);
        }
    };

    const handleTestModels = () => {
        if (onTestModels) {
            logger.logDebug('Testing models for current provider configuration');
            onTestModels(formData);
        }
    };

    const handleTestInference = () => {
        if (onTestInference && selectedModel) {
            logger.logDebug(`Testing inference with model: ${selectedModel}`);
            onTestInference(formData, selectedModel);
        }
    };

    return (
        <Box component="form" onSubmit={handleSubmit} sx={{ padding: SPACING.STANDARD }}>
            <Typography variant="h6" gutterBottom>
                {provider ? 'Edit Provider' : 'Create New Provider'}
            </Typography>
            {!provider && (
                <Box sx={{ mb: SPACING.STANDARD, p: SPACING.SMALL, backgroundColor: 'background.paper', borderRadius: '4px' }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                        <strong>Provider Configuration Guide:</strong> For detailed information on how provider settings work, please refer to:
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                        • Documentation: <code>docs/architecture/BackendSettingsHandler.md</code>
                        <br />• Backend Code: <code>internal/settings</code> and related files
                    </Typography>
                </Box>
            )}

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: SPACING.STANDARD }}>
                {/* Basic Info */}
                <Typography variant="subtitle1" gutterBottom>
                    Basic Configuration
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                    <strong>Provider Name:</strong> A unique display name for this provider configuration (e.g., &#34;My LM Studio&#34;, &#34;Ollama
                    Local&#34;). This name is used throughout the application to identify this provider.
                    <br />
                    <strong>Provider Type:</strong> Select the type of provider. &#34;Ollama&#34; should only be used for Ollama servers as they have
                    a different API structure. &#34;OpenAI Compatible&#34; works with most other providers that follow OpenAI&#39;s API format.
                </Typography>

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: SPACING.STANDARD }}>
                    <TextField
                        fullWidth
                        label="Provider Name"
                        name="providerName"
                        value={formData.providerName}
                        onChange={handleInputChange}
                        required
                        margin="normal"
                        error={!!errors.providerName}
                        helperText={errors.providerName}
                    />

                    <FormControl fullWidth margin="normal">
                        <InputLabel>Provider Type</InputLabel>
                        <Select name="providerType" value={formData.providerType} onChange={handleSelectChange} label="Provider Type" required>
                            {providerTypes.map((type) => (
                                <MenuItem key={type} value={type}>
                                    {type}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Box>

                {/* URLs */}
                <Typography variant="subtitle1" gutterBottom>
                    API Endpoints
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                    <strong>Base URL:</strong> The main address of your provider API. Must start with http:// or https://. Can be a local address
                    (e.g., http://localhost:11434) or include custom ports.
                    <br />
                    <strong>Models Endpoint:</strong> The API path used to retrieve available models (e.g., &#34;models&#34; or &#34;v1/models&#34;).
                    If empty, model fetching will be disabled.
                    <br />
                    <strong>Completion Endpoint:</strong> The API path for text generation/inference (e.g., &#34;chat/completions&#34; or
                    &#34;v1/chat/completions&#34;). This is required for AI functionality.
                </Typography>

                <TextField
                    fullWidth
                    label="Base URL"
                    name="baseUrl"
                    value={formData.baseUrl}
                    onChange={handleInputChange}
                    required
                    margin="normal"
                    placeholder="https://api.example.com/v1/"
                    error={!!errors.baseUrl}
                    helperText={errors.baseUrl}
                />

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: SPACING.STANDARD }}>
                    <TextField
                        fullWidth
                        label="Models Endpoint"
                        name="modelsEndpoint"
                        value={formData.modelsEndpoint}
                        onChange={handleInputChange}
                        margin="normal"
                        placeholder="models"
                    />

                    <TextField
                        fullWidth
                        label="Completion Endpoint"
                        name="completionEndpoint"
                        value={formData.completionEndpoint}
                        onChange={handleInputChange}
                        required
                        margin="normal"
                        placeholder="chat/completions"
                        error={!!errors.completionEndpoint}
                        helperText={errors.completionEndpoint}
                    />
                </Box>

                {/* Authentication */}
                <Divider sx={{ my: SPACING.STANDARD }} />
                <Typography variant="subtitle1" gutterBottom>
                    Authentication
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                    <strong>Important Security Note:</strong> If you enter an auth token directly, it will be stored in the configuration file as
                    plain text. For better security, use the &#34;Use Auth Token from Environment Variable&#34; option.
                    <br />
                    <strong>Auth Type:</strong> Select the authentication method required by your provider (e.g., Bearer, API Key).
                    <br />
                    <strong>Auth Token:</strong> The secret token/key for authentication. This will be sent in the Authorization header.
                    <br />
                    <strong>Environment Variable:</strong> If enabled, the app will read the token from the specified environment variable name
                    instead of storing it in the config.
                </Typography>

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: SPACING.STANDARD }}>
                    <FormControl fullWidth margin="normal">
                        <InputLabel>Auth Type</InputLabel>
                        <Select name="authType" value={formData.authType} onChange={handleSelectChange} label="Auth Type" required>
                            {authTypes.map((type) => (
                                <MenuItem key={type} value={type}>
                                    {type}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <TextField
                        fullWidth
                        label="Auth Token"
                        name="authToken"
                        value={formData.authToken}
                        onChange={handleInputChange}
                        margin="normal"
                        type="password"
                    />
                </Box>

                <FormControlLabel
                    control={<Checkbox name="useAuthTokenFromEnv" checked={formData.useAuthTokenFromEnv} onChange={handleCheckboxChange} />}
                    label="Use Auth Token from Environment Variable"
                />

                {formData.useAuthTokenFromEnv && (
                    <TextField
                        fullWidth
                        label="Environment Variable Name"
                        name="envVarTokenName"
                        value={formData.envVarTokenName}
                        onChange={handleInputChange}
                        margin="normal"
                        placeholder="OPENAI_API_KEY"
                    />
                )}

                {/* Custom Headers */}
                <Divider sx={{ my: SPACING.STANDARD }} />
                <Typography variant="subtitle1" gutterBottom>
                    Custom Headers
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                    <strong>Custom Headers:</strong> Enable this option to add custom HTTP headers to all requests. Custom headers will override any
                    automatically generated headers (like Authorization). Use this for providers that require specific header formats or additional
                    metadata.
                </Typography>

                <FormControlLabel
                    control={<Checkbox name="useCustomHeaders" checked={formData.useCustomHeaders} onChange={handleCheckboxChange} />}
                    label="Use Custom Headers"
                />

                {formData.useCustomHeaders && <HeadersEditor headers={formData.headers} onChange={handleHeadersChange} />}

                {/* Custom Models */}
                <Divider sx={{ my: SPACING.STANDARD }} />
                <Typography variant="subtitle1" gutterBottom>
                    Custom Models
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                    <strong>Custom Models:</strong> Enable this option to manually specify which models are available instead of fetching them from
                    the provider&#39;s models endpoint. Enter one model name per line. When enabled, the app will always use this list and skip the
                    models endpoint API call.
                </Typography>

                <FormControlLabel
                    control={<Checkbox name="useCustomModels" checked={formData.useCustomModels} onChange={handleCheckboxChange} />}
                    label="Use Custom Models"
                />

                {formData.useCustomModels && (
                    <FormControl fullWidth margin="normal">
                        <FormLabel>Custom Models</FormLabel>
                        <TextField
                            fullWidth
                            multiline
                            rows={3}
                            value={(formData.customModels || []).join('\n')}
                            onChange={(e) => {
                                // For better UX, don't filter during typing - preserve all lines including empty ones
                                const rawLines = e.target.value.split('\n');
                                // Keep all lines but trim whitespace
                                const models = rawLines.map((line) => line.trim());
                                handleCustomModelsChange(models);
                            }}
                            onBlur={(e) => {
                                // When a field loses focus, clean up empty lines
                                const rawLines = e.target.value.split('\n');
                                const cleanedModels = rawLines.filter((line) => line.trim() !== '').map((line) => line.trim());
                                if (JSON.stringify(cleanedModels) !== JSON.stringify(formData.customModels)) {
                                    handleCustomModelsChange(cleanedModels);
                                }
                            }}
                            placeholder="Enter model names, one per line"
                        />
                    </FormControl>
                )}

                {/* Test Section */}
                <Divider sx={{ my: SPACING.STANDARD }} />
                <Typography variant="subtitle1" gutterBottom>
                    Test Connection
                </Typography>

                <Box sx={{ display: 'flex', gap: SPACING.STANDARD, alignItems: 'center' }}>
                    <Button variant="outlined" color="secondary" onClick={handleTestModels} disabled={!onTestModels}>
                        Test Models
                    </Button>

                    {testResults && (
                        <FormControl fullWidth margin="normal">
                            <InputLabel>Select Model</InputLabel>
                            <Select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value as string)} label="Select Model">
                                {testResults.models.map((model) => (
                                    <MenuItem key={model} value={model}>
                                        {model}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    )}

                    <Button variant="outlined" color="secondary" onClick={handleTestInference} disabled={!onTestInference || !selectedModel}>
                        Test Inference
                    </Button>
                </Box>

                {testResults && (
                    <Box
                        sx={{
                            mt: SPACING.SMALL,
                            p: SPACING.SMALL,
                            backgroundColor: testResults.connectionSuccess ? 'success.light' : 'error.light',
                            borderRadius: '4px',
                        }}
                    >
                        <Typography variant="body2">
                            {testResults.connectionSuccess
                                ? `Connection successful! Found ${testResults.models.length} models.`
                                : 'Connection failed.'}
                        </Typography>
                    </Box>
                )}

                {/* Actions */}
                <Divider sx={{ my: SPACING.STANDARD }} />
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: SPACING.STANDARD }}>
                    <Button variant="outlined" onClick={onCancel}>
                        Cancel
                    </Button>
                    <Button variant="contained" color="primary" type="submit">
                        Save
                    </Button>
                </Box>
            </Box>
        </Box>
    );
};

ProviderForm.displayName = 'ProviderForm';
export default ProviderForm;
