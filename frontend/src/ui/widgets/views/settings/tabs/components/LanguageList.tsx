import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { Box, Button, Chip, ChipProps, Divider, TextField, Typography } from '@mui/material';
import React, { MouseEvent, useState } from 'react';
import { getLogger } from '../../../../../../logic/adapter';
import { SPACING } from '../../../../../styles/constants';

const logger = getLogger('LanguageList');

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
 *
 * Manages translation languages with add/remove functionality.
 * Handles language selection for default input/output languages.
 *
 * Key Features:
 * - Add new languages with validation
 * - Remove languages with safety checks (can't remove defaults)
 * - Visual indication of default languages
 * - Chip-based UI for easy language management
 */
const LanguageList: React.FC<LanguageListProps> = ({
    languages,
    defaultInputLanguage,
    defaultOutputLanguage,
    onAddLanguage,
    onRemoveLanguage,
    onSetDefaultInput,
    onSetDefaultOutput,
}) => {
    const [newLanguage, setNewLanguage] = useState('');

    const handleAddLanguage = () => {
        const trimmedLanguage = newLanguage.trim();
        if (trimmedLanguage && !languages.includes(trimmedLanguage)) {
            logger.logDebug(`Adding new language: ${trimmedLanguage}`);
            onAddLanguage(trimmedLanguage);
            setNewLanguage('');
        } else if (languages.includes(trimmedLanguage)) {
            logger.logWarning(`Language already exists: ${trimmedLanguage}`);
        }
    };

    const handleRemoveLanguageWrapper = (language: string) => (event: MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        logger.logDebug(`Removing language: ${language}`);
        onRemoveLanguage(language);
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: SPACING.SMALL }}>
            {/* Add Language */}
            <Box sx={{ padding: SPACING.SMALL }}>
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
                        onKeyDown={(e) => e.key === 'Enter' && handleAddLanguage()}
                    />
                    <Button
                        variant="outlined"
                        color="secondary"
                        startIcon={<AddIcon />}
                        onClick={handleAddLanguage}
                        disabled={!newLanguage.trim() || languages.includes(newLanguage.trim())}
                    >
                        Add
                    </Button>
                </Box>
            </Box>

            {/* Language List */}
            <Box sx={{ padding: SPACING.SMALL }}>
                <Typography variant="subtitle2" gutterBottom>
                    Available Languages
                </Typography>

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: SPACING.SMALL }}>
                    {languages.map((language) => {
                        const canDelete = language !== defaultInputLanguage && language !== defaultOutputLanguage;
                        const chipProps: ChipProps = {
                            key: language,
                            label: language,
                            color: 'primary',
                            variant: language === defaultInputLanguage || language === defaultOutputLanguage ? 'filled' : 'outlined',
                            sx: { 'height': 'auto', '& .MuiChip-label': { whiteSpace: 'normal' } },
                        };

                        if (canDelete) {
                            chipProps.onDelete = handleRemoveLanguageWrapper(language);
                            chipProps.deleteIcon = <DeleteIcon />;
                        }

                        return <Chip key={language} {...chipProps} />;
                    })}
                </Box>

                <Divider sx={{ my: SPACING.STANDARD }} />

                {/* Default Language Selection */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: SPACING.STANDARD }}>
                    <Box>
                        <Typography variant="body2" gutterBottom>
                            Default Input Language
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: SPACING.SMALL }}>
                            {languages.map((language) => (
                                <Chip
                                    key={`input-${language}`}
                                    label={language}
                                    onClick={() => onSetDefaultInput(language)}
                                    color="primary"
                                    variant={language === defaultInputLanguage ? 'filled' : 'outlined'}
                                    clickable
                                    size="small"
                                />
                            ))}
                        </Box>
                    </Box>

                    <Box>
                        <Typography variant="body2" gutterBottom>
                            Default Output Language
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: SPACING.SMALL }}>
                            {languages.map((language) => (
                                <Chip
                                    key={`output-${language}`}
                                    label={language}
                                    onClick={() => onSetDefaultOutput(language)}
                                    color="primary"
                                    variant={language === defaultOutputLanguage ? 'filled' : 'outlined'}
                                    clickable
                                    size="small"
                                />
                            ))}
                        </Box>
                    </Box>
                </Box>
            </Box>
        </Box>
    );
};

LanguageList.displayName = 'LanguageList';
export default LanguageList;
