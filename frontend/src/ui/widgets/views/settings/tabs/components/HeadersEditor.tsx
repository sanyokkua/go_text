import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import {
    Box,
    Button,
    IconButton,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import { getLogger } from '../../../../../../logic/adapter';
import { SPACING } from '../../../../../styles/constants';

const logger = getLogger('HeadersEditor');

interface HeadersEditorProps {
    headers: Record<string, string>;
    onChange: (headers: Record<string, string>) => void;
}

/**
 * Headers Editor Component
 * For editing custom HTTP headers
 */
const HeadersEditor: React.FC<HeadersEditorProps> = ({ headers, onChange }) => {
    const [headerEntries, setHeaderEntries] = useState<{ key: string; value: string }[]>([]);

    // Convert headers object to array format
    useEffect(() => {
        const entries = Object.entries(headers || {}).map(([key, value]) => ({ key, value }));
        setHeaderEntries(entries);
    }, [headers]);

    const handleAddHeader = () => {
        logger.logDebug('Adding new header entry');
        const newEntries = [...headerEntries, { key: '', value: '' }];
        setHeaderEntries(newEntries);
        // Don't call updateHeaders here - let the user fill in the key first
        // The update will happen when they type in the key field
    };

    const handleRemoveHeader = (index: number) => {
        logger.logDebug(`Removing header at index: ${index}`);
        const newEntries = headerEntries.filter((_, i) => i !== index);
        setHeaderEntries(newEntries);
        updateHeaders(newEntries);
    };

    const handleHeaderChange = (index: number, field: 'key' | 'value', value: string) => {
        logger.logDebug(`Header changed: index=${index}, field=${field}, value=${value}`);
        const newEntries = [...headerEntries];
        newEntries[index][field] = value;
        setHeaderEntries(newEntries);
        updateHeaders(newEntries);
    };

    const updateHeaders = (entries: { key: string; value: string }[]) => {
        logger.logDebug('Updating headers from editor');
        const headersObj = entries.reduce(
            (acc, { key, value }) => {
                // Only include headers with non-empty keys in the final output
                // but keep empty headers in the UI for editing
                if (key.trim()) {
                    acc[key.trim()] = value;
                }
                return acc;
            },
            {} as Record<string, string>,
        );
        logger.logDebug(`Headers updated: ${Object.keys(headersObj).length} valid headers`);
        onChange(headersObj);
    };

    return (
        <Box sx={{ marginTop: SPACING.STANDARD }}>
            <Typography variant="subtitle2" gutterBottom>
                Custom Headers
            </Typography>

            <TableContainer component={Paper} elevation={2}>
                <Table size="small">
                    <TableHead sx={{ backgroundColor: 'secondary.dark' }}>
                        <TableRow>
                            {/* Head Cells */}
                            <TableCell width="40%" sx={{ color: 'secondary.contrastText', fontWeight: 'bold' }}>
                                Header Name
                            </TableCell>
                            <TableCell width="50%" sx={{ color: 'secondary.contrastText', fontWeight: 'bold' }}>
                                Header Value
                            </TableCell>
                            <TableCell width="10%" align="center" sx={{ color: 'secondary.contrastText', fontWeight: 'bold' }}>
                                Actions
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody sx={{ backgroundColor: 'secondary.light' }}>
                        {headerEntries.map((header, index) => (
                            <TableRow key={index} sx={{ color: 'secondary.contrastText' }}>
                                <TableCell sx={{ color: 'secondary.contrastText' }}>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        variant="standard"
                                        color="secondary"
                                        value={header.key}
                                        onChange={(e) => handleHeaderChange(index, 'key', e.target.value)}
                                        placeholder="Header-Name"
                                        sx={{ color: 'secondary.contrastText' }}
                                    />
                                </TableCell>
                                <TableCell sx={{ color: 'secondary.contrastText' }}>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        variant="standard"
                                        color="secondary"
                                        value={header.value}
                                        onChange={(e) => handleHeaderChange(index, 'value', e.target.value)}
                                        placeholder="header-value"
                                    />
                                </TableCell>
                                <TableCell align="center" sx={{ color: 'secondary.contrastText' }}>
                                    <IconButton size="small" onClick={() => handleRemoveHeader(index)} aria-label="remove header">
                                        <DeleteIcon fontSize="small" color="error" />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', marginTop: SPACING.SMALL }}>
                <Button size="small" startIcon={<AddIcon />} onClick={handleAddHeader}>
                    Add Header
                </Button>
            </Box>
        </Box>
    );
};

HeadersEditor.displayName = 'HeadersEditor';
export default HeadersEditor;
