import { Box, Button } from '@mui/material';
import React, { useState } from 'react';
import { LanguageConfig, Settings } from '../../../../../logic/adapter';
import { useAppDispatch } from '../../../../../logic/store';
import { enqueueNotification } from '../../../../../logic/store/notifications';
import { addLanguage, removeLanguage, setDefaultInputLanguage, setDefaultOutputLanguage } from '../../../../../logic/store/settings';
import { setAppBusy } from '../../../../../logic/store/ui';
import { SPACING } from '../../../../styles/constants';
import LanguageList from './components/LanguageList';

interface LanguageConfigTabProps {
    settings: Settings;
}

/**
 * Language Config Tab Component
 * Configuration for translation languages
 */
const LanguageConfigTab: React.FC<LanguageConfigTabProps> = ({ settings }) => {
    const dispatch = useAppDispatch();
    const [formData, setFormData] = useState<LanguageConfig>({ ...settings.languageConfig });

    const handleAddLanguage = async (language: string) => {
        try {
            if (!formData.languages.includes(language)) {
                dispatch(setAppBusy(true));
                await dispatch(addLanguage(language)).unwrap();
                setFormData((prev) => ({ ...prev, languages: [...prev.languages, language] }));
                dispatch(enqueueNotification({ message: 'Language added successfully', severity: 'success' }));
            }
        } catch (error) {
            dispatch(enqueueNotification({ message: `Failed to add language: ${error}`, severity: 'error' }));
        } finally {
            dispatch(setAppBusy(false));
        }
    };

    const handleRemoveLanguage = async (language: string) => {
        try {
            if (language !== formData.defaultInputLanguage && language !== formData.defaultOutputLanguage) {
                dispatch(setAppBusy(true));
                await dispatch(removeLanguage(language)).unwrap();
                setFormData((prev) => ({ ...prev, languages: prev.languages.filter((l) => l !== language) }));
                dispatch(enqueueNotification({ message: 'Language removed successfully', severity: 'success' }));
            }
        } catch (error) {
            dispatch(enqueueNotification({ message: `Failed to remove language: ${error}`, severity: 'error' }));
        } finally {
            dispatch(setAppBusy(false));
        }
    };

    const handleSetDefaultInput = async (language: string) => {
        try {
            dispatch(setAppBusy(true));
            await dispatch(setDefaultInputLanguage(language)).unwrap();
            setFormData((prev) => ({ ...prev, defaultInputLanguage: language }));
            dispatch(enqueueNotification({ message: 'Default input language updated successfully', severity: 'success' }));
        } catch (error) {
            dispatch(enqueueNotification({ message: `Failed to update default input language: ${error}`, severity: 'error' }));
        } finally {
            dispatch(setAppBusy(false));
        }
    };

    const handleSetDefaultOutput = async (language: string) => {
        try {
            dispatch(setAppBusy(true));
            await dispatch(setDefaultOutputLanguage(language)).unwrap();
            setFormData((prev) => ({ ...prev, defaultOutputLanguage: language }));
            dispatch(enqueueNotification({ message: 'Default output language updated successfully', severity: 'success' }));
        } catch (error) {
            dispatch(enqueueNotification({ message: `Failed to update default output language: ${error}`, severity: 'error' }));
        } finally {
            dispatch(setAppBusy(false));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // All updates are handled in real-time by the individual handlers
        dispatch(enqueueNotification({ message: 'Language settings updated successfully', severity: 'success' }));
    };

    return (
        <Box sx={{ padding: SPACING.SMALL }}>
            <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <LanguageList
                    languages={formData.languages}
                    defaultInputLanguage={formData.defaultInputLanguage}
                    defaultOutputLanguage={formData.defaultOutputLanguage}
                    onAddLanguage={handleAddLanguage}
                    onRemoveLanguage={handleRemoveLanguage}
                    onSetDefaultInput={handleSetDefaultInput}
                    onSetDefaultOutput={handleSetDefaultOutput}
                />

                <Box sx={{ display: 'flex', justifyContent: 'flex-end', marginTop: SPACING.STANDARD }}>
                    <Button variant="contained" color="primary" type="submit">
                        Update Language Settings
                    </Button>
                </Box>
            </Box>
        </Box>
    );
};

LanguageConfigTab.displayName = 'LanguageConfigTab';
export default LanguageConfigTab;
