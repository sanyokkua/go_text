import React, { useEffect, useState } from 'react';

import { Settings } from '../../../../../logic/adapter/models';
import { useAppDispatch } from '../../../../../logic/store';
import { updateInferenceBaseConfig } from '../../../../../logic/store/settings/thunks';
import { Button } from '../../../../components/Button';
import { NumberStepper } from '../../../../components/NumberStepper';
import { Switch } from '../../../../primitives/Switch';
import styles from './InferenceConfigTab.module.css';

interface InferenceForm {
    timeout: number;
    maxRetries: number;
    useMarkdownForOutput: boolean;
}

function toForm(cfg: Settings['inferenceBaseConfig']): InferenceForm {
    return { timeout: cfg.timeout, maxRetries: cfg.maxRetries, useMarkdownForOutput: cfg.useMarkdownForOutput };
}

function isFormDirty(form: InferenceForm, original: Settings['inferenceBaseConfig']): boolean {
    return (
        form.timeout !== original.timeout || form.maxRetries !== original.maxRetries || form.useMarkdownForOutput !== original.useMarkdownForOutput
    );
}

interface Props {
    settings: Settings;
}

const InferenceConfigTab: React.FC<Props> = ({ settings }) => {
    const dispatch = useAppDispatch();

    const [form, setForm] = useState<InferenceForm>(() => toForm(settings.inferenceBaseConfig));
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setForm(toForm(settings.inferenceBaseConfig));
    }, [settings.inferenceBaseConfig]);

    const handleSave = async () => {
        setSaving(true);
        try {
            await dispatch(updateInferenceBaseConfig(form)).unwrap();
        } finally {
            setSaving(false);
        }
    };

    const isDirty = isFormDirty(form, settings.inferenceBaseConfig);

    return (
        <section className={styles.root}>
            <div className={styles.fieldRow}>
                <span className={styles.fieldLabel}>Request timeout (seconds)</span>
                <div className={styles.fieldValue}>
                    <NumberStepper
                        value={form.timeout}
                        onChange={(timeout) => setForm((prev) => ({ ...prev, timeout }))}
                        min={10}
                        max={3600}
                        step={1}
                        aria-label="Request timeout in seconds"
                    />
                </div>
            </div>

            <div className={styles.fieldRow}>
                <span className={styles.fieldLabel}>Max retries (transient only)</span>
                <div className={styles.fieldValue}>
                    <NumberStepper
                        value={form.maxRetries}
                        onChange={(maxRetries) => setForm((prev) => ({ ...prev, maxRetries }))}
                        min={0}
                        max={10}
                        step={1}
                        aria-label="Maximum number of retries"
                    />
                </div>
            </div>

            <div className={`${styles.fieldRow} ${styles.fieldRowLast}`}>
                <span className={styles.fieldLabel}>Request Markdown output</span>
                <div className={styles.fieldValue}>
                    <Switch
                        checked={form.useMarkdownForOutput}
                        onCheckedChange={(checked) => setForm((prev) => ({ ...prev, useMarkdownForOutput: checked }))}
                        aria-label="Request Markdown output"
                    />
                </div>
            </div>

            <p className={styles.caption}>
                Retries apply to transient errors only (timeout, 429, 5xx) — never to auth or &ldquo;not found&rdquo;. Backoff is automatic.
            </p>

            <div className={styles.actions}>
                <Button variant="primary" onClick={handleSave} disabled={!isDirty || saving}>
                    {saving ? 'Saving…' : 'Save'}
                </Button>
            </div>
        </section>
    );
};

InferenceConfigTab.displayName = 'InferenceConfigTab';

export default InferenceConfigTab;
