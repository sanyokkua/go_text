import React, { useState, useEffect } from 'react';
import { Box, Button, IconButton, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { SPACING } from '../../../../../styles/constants';

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
        const newEntries = [...headerEntries, { key: '', value: '' }];
        setHeaderEntries(newEntries);
        // Don't call updateHeaders here - let the user fill in the key first
        // The update will happen when they type in the key field
    };

    const handleRemoveHeader = (index: number) => {
        const newEntries = headerEntries.filter((_, i) => i !== index);
        setHeaderEntries(newEntries);
        updateHeaders(newEntries);
    };

    const handleHeaderChange = (index: number, field: 'key' | 'value', value: string) => {
        const newEntries = [...headerEntries];
        newEntries[index][field] = value;
        setHeaderEntries(newEntries);
        updateHeaders(newEntries);
    };

    const updateHeaders = (entries: { key: string; value: string }[]) => {
        const headersObj = entries.reduce((acc, { key, value }) => {
            // Only include headers with non-empty keys in the final output
            // but keep empty headers in the UI for editing
            if (key.trim()) {
                acc[key.trim()] = value;
            }
            return acc;
        }, {} as Record<string, string>);
        onChange(headersObj);
    };

    return (
        <Box sx={{ marginTop: SPACING.STANDARD }}>
            <Typography variant="subtitle2" gutterBottom>
                Custom Headers
            </Typography>

            <TableContainer component={Paper} elevation={0}>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell width="40%">Header Name</TableCell>
                            <TableCell width="50%">Header Value</TableCell>
                            <TableCell width="10%" align="center">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {headerEntries.map((header, index) => (
                            <TableRow key={index}>
                                <TableCell>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        value={header.key}
                                        onChange={(e) => handleHeaderChange(index, 'key', e.target.value)}
                                        placeholder="Header-Name"
                                    />
                                </TableCell>
                                <TableCell>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        value={header.value}
                                        onChange={(e) => handleHeaderChange(index, 'value', e.target.value)}
                                        placeholder="header-value"
                                    />
                                </TableCell>
                                <TableCell align="center">
                                    <IconButton
                                        size="small"
                                        onClick={() => handleRemoveHeader(index)}
                                        aria-label="remove header"
                                    >
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', marginTop: SPACING.SMALL }}>
                <Button
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={handleAddHeader}
                >
                    Add Header
                </Button>
            </Box>
        </Box>
    );
};

HeadersEditor.displayName = 'HeadersEditor';
export default HeadersEditor;