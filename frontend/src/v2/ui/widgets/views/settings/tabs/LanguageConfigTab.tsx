import { Box, Button, Paper } from '@mui/material';
import React, { useState } from 'react';
import { LanguageConfig, Settings } from '../../../../../logic/adapter';
import { SPACING } from '../../../../styles/constants';
import LanguageList from './components/LanguageList';

interface LanguageConfigTabProps {
    settings: Settings;
    onUpdateSettings: (updatedSettings: Settings) => void;
}

/**
 * Language Config Tab Component
 * Configuration for translation languages
 */
const LanguageConfigTab: React.FC<LanguageConfigTabProps> = ({ settings, onUpdateSettings }) => {
    const [formData, setFormData] = useState<LanguageConfig>({ ...settings.languageConfig });

    const handleAddLanguage = (language: string) => {
        if (!formData.languages.includes(language)) {
            const updatedLanguages = [...formData.languages, language];
            setFormData((prev) => ({ ...prev, languages: updatedLanguages }));
        }
    };

    const handleRemoveLanguage = (language: string) => {
        if (language !== formData.defaultInputLanguage && language !== formData.defaultOutputLanguage) {
            const updatedLanguages = formData.languages.filter((l) => l !== language);
            setFormData((prev) => ({ ...prev, languages: updatedLanguages }));
        }
    };

    const handleSetDefaultInput = (language: string) => {
        setFormData((prev) => ({ ...prev, defaultInputLanguage: language }));
    };

    const handleSetDefaultOutput = (language: string) => {
        setFormData((prev) => ({ ...prev, defaultOutputLanguage: language }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const updatedSettings = { ...settings, languageConfig: formData };
        onUpdateSettings(updatedSettings);
        console.log('Language settings updated:', formData);
    };

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: SPACING.STANDARD }}>
            <Paper elevation={0} sx={{ padding: SPACING.STANDARD, flex: 1 }}>
                <Box
                    component="form"
                    onSubmit={handleSubmit}
                    sx={{ display: 'flex', flexDirection: 'column', gap: SPACING.STANDARD, height: '100%' }}
                >
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
            </Paper>
        </Box>
    );
};

LanguageConfigTab.displayName = 'LanguageConfigTab';
export default LanguageConfigTab;
