import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { apperr } from '../../../../../../../wailsjs/go/models';
import { ActionHandlerAdapter } from '../../../../../../logic/adapter';
import { ProviderConfig } from '../../../../../../logic/adapter/models';
import { AlertDialog } from '../../../../../primitives/AlertDialog';
import type { SelectItem } from '../../../../../primitives/Select';
import { Select } from '../../../../../primitives/Select';
import { Switch } from '../../../../../primitives/Switch';
import KvEditor from './KvEditor';
import styles from './ProviderForm.module.css';
import TagInput from './TagInput';
import VerificationPanel from './VerificationPanel';

export const BLANK_PROVIDER: ProviderConfig = {
    providerId: '',
    providerName: '',
    providerType: 'openai',
    baseUrl: '',
    modelsEndpoint: '',
    completionEndpoint: '',
    authType: 'none',
    authToken: '',
    useAuthTokenFromEnv: true,
    envVarTokenName: '',
    apiVersion: '',
    selectedModel: '',
    useCustomHeaders: false,
    headers: {},
    useCustomModels: false,
    customModels: [],
};

interface ProviderFormProps {
    provider: ProviderConfig | null;
    authTypes: string[];
    providerTypes: string[];
    existingNames: string[];
    isCurrent: boolean;
    onSave: (p: ProviderConfig) => void;
    onDelete: (id: string) => void;
    onSetCurrent: (id: string) => void;
    onCancel: () => void;
}

const prettifyAuthType = (raw: string): string => {
    switch (raw) {
        case 'none':
            return 'None';
        case 'bearer':
            return 'Bearer';
        case 'api-key':
            return 'Api-Key';
        default:
            return raw.charAt(0).toUpperCase() + raw.slice(1);
    }
};

interface FormErrors {
    nameError: string;
    baseUrlError: string;
    envVarError: string;
}

const validateForm = (form: ProviderConfig, existingNames: string[]): FormErrors => {
    let nameError = '';
    if (form.providerName.trim() === '') {
        nameError = 'Name is required';
    } else if (existingNames.includes(form.providerName.trim())) {
        nameError = 'Name is already taken';
    }

    let baseUrlError = '';
    if (form.baseUrl.trim() === '') {
        baseUrlError = 'Base URL is required';
    } else if (!form.baseUrl.trim().startsWith('http')) {
        baseUrlError = 'Must start with http:// or https://';
    } else if (!form.baseUrl.trim().endsWith('/')) {
        baseUrlError = 'Must end with a trailing slash (e.g. http://localhost:1234/)';
    }

    let envVarError = '';
    if (form.authType !== 'none' && form.envVarTokenName.trim() === '') {
        envVarError = 'API key variable name is required';
    }

    return { nameError, baseUrlError, envVarError };
};

const isFormValid = (errors: FormErrors, form: ProviderConfig): boolean => {
    if (errors.nameError !== '' || errors.baseUrlError !== '') return false;
    if (form.authType !== 'none' && errors.envVarError !== '') return false;
    return true;
};

const ProviderForm: React.FC<ProviderFormProps> = ({
    provider,
    authTypes,
    providerTypes,
    existingNames,
    isCurrent,
    onSave,
    onDelete,
    onSetCurrent,
    onCancel,
}) => {
    const sourceId = provider?.providerId ?? null;

    const [form, setForm] = useState<ProviderConfig>(provider ?? BLANK_PROVIDER);
    const [dirty, setDirty] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [discoveredModels, setDiscoveredModels] = useState<apperr.ModelInfo[]>([]);
    const [modelsLoading, setModelsLoading] = useState(false);

    // Reset form when the selected provider changes (keyed on stable id).
    useEffect(() => {
        setForm(provider ?? BLANK_PROVIDER);
        setDirty(false);
        setDiscoveredModels([]);
    }, [sourceId]); // eslint-disable-line react-hooks/exhaustive-deps

    const fetchModels = useCallback(async (providerId: string) => {
        if (providerId === '') return;
        setModelsLoading(true);
        let cancelled = false;
        const result = await ActionHandlerAdapter.getModels(providerId);
        if (!cancelled) {
            setModelsLoading(false);
            if (!result.error) {
                setDiscoveredModels(result.data ?? []);
            }
        }
        return () => {
            cancelled = true;
        };
    }, []);

    // Auto-fetch models when the saved provider is loaded (only for existing providers).
    useEffect(() => {
        if (form.providerId === '') return;
        let cancelled = false;
        setModelsLoading(true);

        ActionHandlerAdapter.getModels(form.providerId).then((result) => {
            if (cancelled) return;
            setModelsLoading(false);
            if (!result.error) {
                setDiscoveredModels(result.data ?? []);
            }
        });

        return () => {
            cancelled = true;
        };
    }, [form.providerId]);

    const patch = <K extends keyof ProviderConfig>(key: K, value: ProviderConfig[K]) => {
        setForm((prev) => {
            const next = { ...prev, [key]: value };
            const source = provider ?? BLANK_PROVIDER;
            setDirty(JSON.stringify(next) !== JSON.stringify(source));
            return next;
        });
    };

    const errors = validateForm(form, existingNames);
    const valid = isFormValid(errors, form);

    // Build model select items, prepending the current selectedModel if it's not in the discovered list.
    const modelItems: SelectItem[] = useMemo(() => {
        const items: SelectItem[] = discoveredModels.map((m) => ({ value: m.id, label: m.label }));
        if (form.selectedModel !== '' && !discoveredModels.some((m) => m.id === form.selectedModel)) {
            items.unshift({ value: form.selectedModel, label: form.selectedModel });
        }
        return items;
    }, [discoveredModels, form.selectedModel]);

    const kindItems: SelectItem[] = providerTypes.map((pt) => ({ value: pt, label: pt }));

    const handleSave = () => {
        if (!dirty || !valid) return;
        onSave(form);
    };

    const handleConfirmDelete = () => {
        if (provider) onDelete(provider.providerId);
        setDeleteOpen(false);
    };

    if (provider === null) {
        return (
            <div className={styles.empty}>
                (Select a provider to edit or create a new one)
            </div>
        );
    }

    return (
        <div className={styles.root}>
            {/* Name */}
            <div className={styles.field}>
                <label htmlFor="pf-name" className={styles.label}>
                    Name
                </label>
                <input
                    id="pf-name"
                    type="text"
                    value={form.providerName}
                    onChange={(e) => patch('providerName', e.target.value)}
                    placeholder="Provider name"
                    aria-invalid={errors.nameError !== ''}
                    aria-describedby={errors.nameError === '' ? undefined : 'pf-name-err'}
                    className={styles.textInput}
                />
                {errors.nameError !== '' && (
                    <span id="pf-name-err" role="alert" className={styles.error}>
                        {errors.nameError}
                    </span>
                )}
            </div>

            {/* Kind */}
            <div className={styles.field}>
                <span id="pf-kind-label" className={styles.label}>
                    Kind
                </span>
                <Select
                    value={form.providerType}
                    onValueChange={(v) => patch('providerType', v)}
                    items={kindItems}
                    placeholder="Select kind"
                    keyLabel="Kind"
                    aria-labelledby="pf-kind-label"
                />
            </div>

            {/* Auth segment */}
            <fieldset className={styles.authFieldset}>
                <legend className={styles.authLegend}>Auth</legend>
                <div className={styles.authRow}>
                    {authTypes.map((authType) => {
                        const isActive = form.authType === authType;
                        return (
                            <button
                                key={authType}
                                type="button"
                                onClick={() => patch('authType', authType)}
                                aria-pressed={isActive}
                                className={styles.authBtn}
                            >
                                {prettifyAuthType(authType)}
                            </button>
                        );
                    })}
                </div>
            </fieldset>

            {/* API key env var — shown when auth ≠ none */}
            {form.authType !== 'none' && (
                <div className={styles.field}>
                    <label htmlFor="pf-env-var" className={styles.label}>
                        API key environment variable
                    </label>
                    <input
                        id="pf-env-var"
                        type="text"
                        value={form.envVarTokenName}
                        onChange={(e) => patch('envVarTokenName', e.target.value)}
                        placeholder="e.g. OPENAI_API_KEY"
                        aria-invalid={errors.envVarError !== ''}
                        aria-describedby={errors.envVarError === '' ? undefined : 'pf-env-err'}
                        className={styles.textInput}
                    />
                    {errors.envVarError !== '' && (
                        <span id="pf-env-err" role="alert" className={styles.error}>
                            {errors.envVarError}
                        </span>
                    )}
                    <p className={styles.envVarBanner}>
                        🔑 <strong>API key — environment variable</strong>{' '}
                        <code className={styles.envVarCode}>{form.envVarTokenName.trim() || 'YOUR_API_KEY'}</code> — the app reads the key from
                        this variable at run time and <strong>never stores it</strong>.
                    </p>
                </div>
            )}

            {/* Base URL */}
            <div className={styles.field}>
                <label htmlFor="pf-base-url" className={styles.label}>
                    Base URL
                </label>
                <input
                    id="pf-base-url"
                    type="text"
                    value={form.baseUrl}
                    onChange={(e) => patch('baseUrl', e.target.value)}
                    placeholder="https://api.example.com"
                    aria-invalid={errors.baseUrlError !== ''}
                    aria-describedby={errors.baseUrlError === '' ? undefined : 'pf-url-err'}
                    className={styles.textInput}
                />
                {errors.baseUrlError !== '' && (
                    <span id="pf-url-err" role="alert" className={styles.error}>
                        {errors.baseUrlError}
                    </span>
                )}
            </div>

            {/* Endpoint pair — two columns on wide widths, collapsing to one when narrow */}
            <div className={styles.grid2}>
                {/* Models endpoint */}
                <div className={styles.field}>
                    <label htmlFor="pf-models-ep" className={styles.label}>
                        Models endpoint (override)
                    </label>
                    <input
                        id="pf-models-ep"
                        type="text"
                        value={form.modelsEndpoint}
                        onChange={(e) => patch('modelsEndpoint', e.target.value)}
                        placeholder="/v1/models"
                        className={styles.textInput}
                    />
                </div>

                {/* Completion endpoint */}
                <div className={styles.field}>
                    <label htmlFor="pf-completion-ep" className={styles.label}>
                        Completion endpoint (override)
                    </label>
                    <input
                        id="pf-completion-ep"
                        type="text"
                        value={form.completionEndpoint}
                        onChange={(e) => patch('completionEndpoint', e.target.value)}
                        placeholder="/v1/chat/completions"
                        className={styles.textInput}
                    />
                </div>
            </div>

            {/* Version & model pair — API version is azure-only; auto-fit lets the
                model field fill the row when API version is hidden. */}
            <div className={styles.grid2}>
                {form.providerType === 'azure' && (
                    <div className={styles.field}>
                        <label htmlFor="pf-api-version" className={styles.label}>
                            API version
                        </label>
                        <input
                            id="pf-api-version"
                            type="text"
                            value={form.apiVersion}
                            onChange={(e) => patch('apiVersion', e.target.value)}
                            placeholder="2024-02-01"
                            className={styles.textInput}
                        />
                    </div>
                )}

                {/* Model picker */}
                <div className={styles.field}>
                    <span id="pf-model-label" className={styles.label}>
                        Model
                    </span>
                    <div className={styles.modelRow}>
                        <div className={styles.modelSelect}>
                            <Select
                                value={form.selectedModel}
                                onValueChange={(v) => patch('selectedModel', v)}
                                items={modelItems}
                                placeholder={modelsLoading ? '(loading…)' : '(none)'}
                                keyLabel="Model"
                                disabled={modelsLoading}
                                aria-labelledby="pf-model-label"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={() => fetchModels(form.providerId)}
                            disabled={modelsLoading || form.providerId === ''}
                            aria-label="Refresh model list"
                            title="Refresh model list"
                            className={styles.refreshBtn}
                        >
                            ⟳
                        </button>
                    </div>
                </div>
            </div>

            {/* Custom headers */}
            <div className={styles.field}>
                <div className={[styles.switchRow, form.useCustomHeaders ? styles.switchRowWithChild : ''].join(' ')}>
                    <Switch
                        id="pf-custom-headers"
                        checked={form.useCustomHeaders}
                        onCheckedChange={(v) => patch('useCustomHeaders', v)}
                        aria-label="Use custom headers"
                    />
                    <label htmlFor="pf-custom-headers" className={styles.labelInline}>
                        Use custom headers
                    </label>
                </div>
                {form.useCustomHeaders && <KvEditor value={form.headers} onChange={(v) => patch('headers', v)} />}
            </div>

            {/* Custom models */}
            <div className={styles.field}>
                <div className={[styles.switchRow, form.useCustomModels ? styles.switchRowWithChild : ''].join(' ')}>
                    <Switch
                        id="pf-custom-models"
                        checked={form.useCustomModels}
                        onCheckedChange={(v) => patch('useCustomModels', v)}
                        aria-label="Use custom models"
                    />
                    <label htmlFor="pf-custom-models" className={styles.labelInline}>
                        Use custom models
                    </label>
                </div>
                {form.useCustomModels && <TagInput value={form.customModels} onChange={(v) => patch('customModels', v)} />}
            </div>

            {/* Verification panel — runs against the live draft, so diagnostics work before Save */}
            <div className={styles.verifyField}>
                <VerificationPanel providerConfig={form} />
            </div>

            {/* Action bar */}
            <div className={styles.actionBar}>
                {!isCurrent && provider !== null && (
                    <button
                        type="button"
                        onClick={() => onSetCurrent(provider.providerId)}
                        className={[styles.btnBase, styles.btnGhost].join(' ')}
                    >
                        Set as current
                    </button>
                )}

                {provider !== null && (
                    <button
                        type="button"
                        onClick={() => setDeleteOpen(true)}
                        className={[styles.btnBase, styles.btnDanger].join(' ')}
                    >
                        Delete…
                    </button>
                )}

                <button
                    type="button"
                    onClick={onCancel}
                    className={[styles.btnBase, styles.btnCancel].join(' ')}
                >
                    Cancel
                </button>

                <button
                    type="button"
                    onClick={handleSave}
                    disabled={!dirty || !valid}
                    className={[styles.btnBase, styles.btnSave].join(' ')}
                >
                    Save
                </button>
            </div>

            {/* Delete confirmation */}
            <AlertDialog
                open={deleteOpen}
                onOpenChange={setDeleteOpen}
                title="Delete provider"
                description={`Are you sure you want to delete "${provider?.providerName ?? ''}"? This cannot be undone.`}
                confirmLabel="Delete"
                cancelLabel="Cancel"
                onConfirm={handleConfirmDelete}
                variant="danger"
            />
        </div>
    );
};

ProviderForm.displayName = 'ProviderForm';
export default ProviderForm;
