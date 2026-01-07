import React, { useState } from 'react';
import { Box, Button, Chip, Divider, IconButton, Paper, TextField, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { SPACING } from '../../../../../styles/constants';

interface LanguageListProps {
    languages: string[];
    defaultInputLanguage: string;
    defaultOutputLanguage: string;
    onAddLanguage: (language: string) => void;
    onRemoveLanguage: (language: string) => void;
    onSetDefaultInput: (language: string) => void;
    onSetDefaultOutput: (language: string) => void;
}

/**
 * Language List Component
 * For managing translation languages
 */
const LanguageList: React.FC<LanguageListProps> = ({
    languages,
    defaultInputLanguage,
    defaultOutputLanguage,
    onAddLanguage,
    onRemoveLanguage,
    onSetDefaultInput,
    onSetDefaultOutput
}) => {
    const [newLanguage, setNewLanguage] = useState('');

    const handleAddLanguage = () => {
        if (newLanguage.trim() && !languages.includes(newLanguage.trim())) {
            onAddLanguage(newLanguage.trim());
            setNewLanguage('');
        }
    };

    const handleRemoveLanguageWrapper = (language: string) => (event: any) => {
        event.stopPropagation();
        onRemoveLanguage(language);
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: SPACING.STANDARD }}>
            {/* Add Language */}
            <Paper elevation={0} sx={{ padding: SPACING.STANDARD }}>
                <Typography variant="subtitle2" gutterBottom>
                    Add New Language
                </Typography>
                <Box sx={{ display: 'flex', gap: SPACING.SMALL }}>
                    <TextField
                        fullWidth
                        size="small"
                        value={newLanguage}
                        onChange={(e) => setNewLanguage(e.target.value)}
                        placeholder="Enter language name"
                        onKeyPress={(e) => e.key === 'Enter' && handleAddLanguage()}
                    />
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={handleAddLanguage}
                        disabled={!newLanguage.trim() || languages.includes(newLanguage.trim())}
                    >
                        Add
                    </Button>
                </Box>
            </Paper>

            {/* Language List */}
            <Paper elevation={0} sx={{ padding: SPACING.STANDARD }}>
                <Typography variant="subtitle2" gutterBottom>
                    Available Languages
                </Typography>

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: SPACING.SMALL }}>
                    {languages.map((language) => {
                        const canDelete = language !== defaultInputLanguage && language !== defaultOutputLanguage;
                        const chipProps = {
                            key: language,
                            label: language,
                            color: language === defaultInputLanguage ? 'primary' : language === defaultOutputLanguage ? 'secondary' : 'default',
                            variant: language === defaultInputLanguage || language === defaultOutputLanguage ? 'filled' : 'outlined',
                            sx: { height: 'auto', '& .MuiChip-label': { whiteSpace: 'normal' } }
                        } as any;
                        
                        if (canDelete) {
                            chipProps.onDelete = handleRemoveLanguageWrapper(language);
                            chipProps.deleteIcon = <DeleteIcon />;
                        }
                        
                        return <Chip {...chipProps} />;
                    })}
                </Box>

                <Divider sx={{ my: SPACING.STANDARD }} />

                {/* Default Language Selection */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: SPACING.STANDARD }}>
                    <Box>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                            Default Input Language
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: SPACING.SMALL }}>
                            {languages.map((language) => (
                                <Chip
                                    key={`input-${language}`}
                                    label={language}
                                    onClick={() => onSetDefaultInput(language)}
                                    color={language === defaultInputLanguage ? 'primary' : 'default'}
                                    variant={language === defaultInputLanguage ? 'filled' : 'outlined'}
                                    clickable
                                />
                            ))}
                        </Box>
                    </Box>

                    <Box>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                            Default Output Language
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: SPACING.SMALL }}>
                            {languages.map((language) => (
                                <Chip
                                    key={`output-${language}`}
                                    label={language}
                                    onClick={() => onSetDefaultOutput(language)}
                                    color={language === defaultOutputLanguage ? 'secondary' : 'default'}
                                    variant={language === defaultOutputLanguage ? 'filled' : 'outlined'}
                                    clickable
                                />
                            ))}
                        </Box>
                    </Box>
                </Box>
            </Paper>
        </Box>
    );
};

LanguageList.displayName = 'LanguageList';
export default LanguageList;