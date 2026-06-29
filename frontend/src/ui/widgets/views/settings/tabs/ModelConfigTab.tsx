import React, { useEffect, useState } from 'react';

import { Settings } from '../../../../../logic/adapter/models';
import { useSettingsToast } from '../../../../../logic/hooks/useSettingsToast';
import {
    selectCurrentProvider,
    selectCurrentProviderModelItems,
    selectDiscoveredModels,
    useAppDispatch,
    useAppSelector,
} from '../../../../../logic/store';
import { discoverCurrentProviderModels, updateModelConfig } from '../../../../../logic/store/settings/thunks';
import { Button } from '../../../../components/Button';
import { RadioGroup } from '../../../../primitives/RadioGroup';
import { Select } from '../../../../primitives/Select';
import { Slider } from '../../../../primitives/Slider';
import { Switch } from '../../../../primitives/Switch';
import styles from './ModelConfigTab.module.css';

interface ModelForm {
    name: string;
    useTemperature: boolean;
    temperature: number;
    useContextWindow: boolean;
    contextWindow: number;
    useLegacyMaxTokens: boolean;
}

function toForm(cfg: Settings['modelConfig']): ModelForm {
    return {
        name: cfg.name,
        useTemperature: cfg.useTemperature,
        temperature: cfg.temperature,
        useContextWindow: cfg.useContextWindow,
        contextWindow: cfg.contextWindow,
        useLegacyMaxTokens: cfg.useLegacyMaxTokens,
    };
}

function isFormDirty(form: ModelForm, original: Settings['modelConfig']): boolean {
    return (
        form.name !== original.name ||
        form.useTemperature !== original.useTemperature ||
        form.temperature !== original.temperature ||
        form.useContextWindow !== original.useContextWindow ||
        form.contextWindow !== original.contextWindow ||
        form.useLegacyMaxTokens !== original.useLegacyMaxTokens
    );
}

const TOKEN_PARAM_OPTIONS = [
    { value: 'false', label: 'max_completion_tokens (standard, recommended)' },
    { value: 'true', label: 'max_tokens (legacy)' },
];

interface Props {
    settings: Settings;
}

const ModelConfigTab: React.FC<Props> = ({ settings }) => {
    const dispatch = useAppDispatch();
    const runWithToast = useSettingsToast();
    const currentProvider = useAppSelector(selectCurrentProvider);
    // Shared discovery source — same selector the AppBar ModelPicker consumes, so
    // the two views never disagree about which models exist.
    const modelSelectItems = useAppSelector(selectCurrentProviderModelItems);
    const discoveredModels = useAppSelector(selectDiscoveredModels);

    const [form, setForm] = useState<ModelForm>(() => toForm(settings.modelConfig));
    const [refreshing, setRefreshing] = useState(false);
    const [saving, setSaving] = useState(false);

    const providerId = currentProvider?.providerId ?? '';

    useEffect(() => {
        setForm(toForm(settings.modelConfig));
    }, [settings.modelConfig]);

    // Discover models on mount and whenever the provider changes. Discovery resolves
    // even on failure (the thunk swallows errors), so the spinner is safe.
    useEffect(() => {
        if (providerId) {
            void dispatch(discoverCurrentProviderModels(providerId));
        }
    }, [dispatch, providerId]);

    // Once discovery lands, force the temperature toggle off for the in-progress
    // model selection if that model rejects temperature.
    useEffect(() => {
        const caps = discoveredModels.find((m) => m.id === form.name)?.caps;
        if (caps?.supportsTemperature === false) {
            setForm((prev) => (prev.useTemperature ? { ...prev, useTemperature: false } : prev));
        }
    }, [discoveredModels, form.name]);

    const handleRefresh = async (): Promise<void> => {
        if (!providerId) return;
        setRefreshing(true);
        try {
            await dispatch(discoverCurrentProviderModels(providerId));
        } finally {
            setRefreshing(false);
        }
    };

    // Switching to a model that rejects temperature clears the toggle immediately,
    // before any save, matching the prior behaviour.
    const handleModelChange = (modelId: string): void => {
        const rejectsTemperature = discoveredModels.find((m) => m.id === modelId)?.caps?.supportsTemperature === false;
        setForm((prev) => ({ ...prev, name: modelId, ...(rejectsTemperature ? { useTemperature: false } : {}) }));
    };

    const handleSave = async (): Promise<void> => {
        setSaving(true);
        try {
            await runWithToast(dispatch(updateModelConfig(form)), { success: 'Model settings saved' });
        } finally {
            setSaving(false);
        }
    };

    const isDirty = isFormDirty(form, settings.modelConfig);

    return (
        <section className={styles.root}>
            <p className={styles.sectionHeader}>Model — searchable (+ refresh from provider)</p>

            <div className={styles.modelRow}>
                <div className={styles.selectWrap}>
                    <Select value={form.name} onValueChange={handleModelChange} items={modelSelectItems} placeholder="Select a model" />
                </div>
                <Button variant="ghost" size="sm" onClick={() => void handleRefresh()} disabled={refreshing || !currentProvider}>
                    ⟳ Refresh
                </Button>
            </div>

            <div className={styles.toggleBlock}>
                <div className={styles.toggleHead}>
                    <Switch
                        checked={form.useTemperature}
                        onCheckedChange={(checked) => setForm((prev) => ({ ...prev, useTemperature: checked }))}
                        aria-label="Use temperature"
                    />
                    <span className={styles.toggleLabel}>Use temperature</span>
                    {form.useTemperature && <span className={styles.numericDisplay}>{form.temperature.toFixed(2)}</span>}
                </div>
                {form.useTemperature && (
                    <Slider
                        value={[form.temperature]}
                        onValueChange={([v]) => setForm((prev) => ({ ...prev, temperature: v }))}
                        min={0}
                        max={2}
                        step={0.05}
                    />
                )}
            </div>

            <div className={styles.toggleBlock}>
                <div className={styles.toggleHead}>
                    <Switch
                        checked={form.useContextWindow}
                        onCheckedChange={(checked) => setForm((prev) => ({ ...prev, useContextWindow: checked }))}
                        aria-label="Use context window"
                    />
                    <span className={styles.toggleLabel}>Use context window</span>
                    {form.useContextWindow && <span className={styles.numericDisplay}>{form.contextWindow.toLocaleString()}</span>}
                </div>
                {form.useContextWindow && (
                    <Slider
                        value={[form.contextWindow]}
                        onValueChange={([v]) => setForm((prev) => ({ ...prev, contextWindow: v }))}
                        min={512}
                        max={131072}
                        step={512}
                    />
                )}
            </div>

            <div className={styles.radioBlock}>
                <p className={styles.radioHeader}>Token-limit parameter</p>
                <RadioGroup
                    value={form.useLegacyMaxTokens ? 'true' : 'false'}
                    onValueChange={(val) => setForm((prev) => ({ ...prev, useLegacyMaxTokens: val === 'true' }))}
                    items={TOKEN_PARAM_OPTIONS}
                />
            </div>

            <p className={styles.caption}>
                Capability-aware: when the provider&apos;s catalog exposes it (Azure, LM Studio), the temperature toggle and context hint pre-fill from
                the selected model.
            </p>

            <div className={styles.actions}>
                <Button variant="primary" onClick={() => void handleSave()} disabled={!isDirty || saving}>
                    {saving ? 'Saving…' : 'Save'}
                </Button>
            </div>
        </section>
    );
};

ModelConfigTab.displayName = 'ModelConfigTab';

export default ModelConfigTab;
