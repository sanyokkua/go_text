import { Box, Typography } from '@mui/material';
import React, { useState } from 'react';
import { getLogger, LanguageConfig, Settings } from '../../../../../logic/adapter';
import { useAppDispatch } from '../../../../../logic/store';
import { enqueueNotification } from '../../../../../logic/store/notifications';
import { addLanguage, removeLanguage, setDefaultInputLanguage, setDefaultOutputLanguage } from '../../../../../logic/store/settings';
import { setAppBusy } from '../../../../../logic/store/ui';
import { parseError } from '../../../../../logic/utils/error_utils';
import { SPACING } from '../../../../styles/constants';
import LanguageList from './components/LanguageList';

const logger = getLogger('LanguageConfigTab');

interface LanguageConfigTabProps {
    settings: Settings;
}

/**
 * Language Config Tab Component
 * Configuration for translation languages
 * All operations (add, remove, set defaults) are handled directly on the backend
 */
const LanguageConfigTab: React.FC<LanguageConfigTabProps> = ({ settings }) => {
    const dispatch = useAppDispatch();
    const [formData, setFormData] = useState<LanguageConfig>({ ...settings.languageConfig });

    const handleAddLanguage = async (language: string) => {
        try {
            logger.logDebug(`Adding language: ${language}`);
            if (!formData.languages.includes(language)) {
                dispatch(setAppBusy(true));
                await dispatch(addLanguage(language)).unwrap();
                logger.logInfo(`Language added successfully: ${language}`);
                setFormData((prev) => ({ ...prev, languages: [...prev.languages, language] }));
                dispatch(enqueueNotification({ message: 'Language added successfully', severity: 'success' }));
            } else {
                logger.logWarning(`Language already exists: ${language}`);
            }
        } catch (error: unknown) {
            const err = parseError(error);
            logger.logError(`Failed to add language ${language}: ${err.message}`);
            dispatch(enqueueNotification({ message: `Failed to add language: ${err.message}`, severity: 'error' }));
        } finally {
            dispatch(setAppBusy(false));
        }
    };

    const handleRemoveLanguage = async (language: string) => {
        try {
            logger.logDebug(`Removing language: ${language}`);
            if (language !== formData.defaultInputLanguage && language !== formData.defaultOutputLanguage) {
                dispatch(setAppBusy(true));
                await dispatch(removeLanguage(language)).unwrap();
                logger.logInfo(`Language removed successfully: ${language}`);
                setFormData((prev) => ({ ...prev, languages: prev.languages.filter((l) => l !== language) }));
                dispatch(enqueueNotification({ message: 'Language removed successfully', severity: 'success' }));
            } else {
                logger.logWarning(`Cannot remove language that is set as default: ${language}`);
            }
        } catch (error: unknown) {
            const err = parseError(error);
            logger.logError(`Failed to remove language ${language}: ${err.message}`);
            dispatch(enqueueNotification({ message: `Failed to remove language: ${err.message}`, severity: 'error' }));
        } finally {
            dispatch(setAppBusy(false));
        }
    };

    const handleSetDefaultInput = async (language: string) => {
        try {
            logger.logDebug(`Setting default input language: ${language}`);
            dispatch(setAppBusy(true));
            await dispatch(setDefaultInputLanguage(language)).unwrap();
            logger.logInfo(`Default input language updated to: ${language}`);
            setFormData((prev) => ({ ...prev, defaultInputLanguage: language }));
            dispatch(enqueueNotification({ message: 'Default input language updated successfully', severity: 'success' }));
        } catch (error: unknown) {
            const err = parseError(error);
            logger.logError(`Failed to update default input language to ${language}: ${err.message}`);
            dispatch(enqueueNotification({ message: `Failed to update default input language: ${err.message}`, severity: 'error' }));
        } finally {
            dispatch(setAppBusy(false));
        }
    };

    const handleSetDefaultOutput = async (language: string) => {
        try {
            logger.logDebug(`Setting default output language: ${language}`);
            dispatch(setAppBusy(true));
            await dispatch(setDefaultOutputLanguage(language)).unwrap();
            logger.logInfo(`Default output language updated to: ${language}`);
            setFormData((prev) => ({ ...prev, defaultOutputLanguage: language }));
            dispatch(enqueueNotification({ message: 'Default output language updated successfully', severity: 'success' }));
        } catch (error: unknown) {
            const err = parseError(error);
            logger.logError(`Failed to update default output language to ${language}: ${err.message}`);
            dispatch(enqueueNotification({ message: `Failed to update default output language: ${err.message}`, severity: 'error' }));
        } finally {
            dispatch(setAppBusy(false));
        }
    };

    return (
        <Box sx={{ padding: SPACING.SMALL }}>
            {/* Tab Description */}
            <Box sx={{ marginBottom: SPACING.STANDARD }}>
                <Typography variant="body2" color="text.secondary" component="div" gutterBottom>
                    This tab manages the languages available for translation and sets default languages for input and output.
                </Typography>
                <Typography variant="body2" color="text.secondary" component="div" gutterBottom>
                    <strong>How to use:</strong> Add or remove languages from the supported list, and set default languages for input and output. All
                    changes are applied immediately.
                </Typography>
                <Typography variant="body2" color="text.secondary" component="div" gutterBottom>
                    <strong>Application:</strong> Changes are applied automatically when you add/remove languages or set defaults. They affect
                    translation functionality throughout the application.
                </Typography>
                <Typography variant="body2" color="text.secondary" component="div" gutterBottom>
                    <strong>Note:</strong> You cannot remove a language that is currently set as a default input or output language. Also, LLM model
                    should support added Language
                </Typography>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <LanguageList
                    languages={formData.languages}
                    defaultInputLanguage={formData.defaultInputLanguage}
                    defaultOutputLanguage={formData.defaultOutputLanguage}
                    onAddLanguage={handleAddLanguage}
                    onRemoveLanguage={handleRemoveLanguage}
                    onSetDefaultInput={handleSetDefaultInput}
                    onSetDefaultOutput={handleSetDefaultOutput}
                />
            </Box>
        </Box>
    );
};

LanguageConfigTab.displayName = 'LanguageConfigTab';
export default LanguageConfigTab;
