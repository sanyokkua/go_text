import React from 'react';
import { Box, Button, Divider, List, ListItem, ListItemText, Paper, Typography } from '@mui/material';
import { ProviderConfig } from '../../../../../../logic/adapter';
import { SPACING } from '../../../../../styles/constants';

interface ProviderListProps {
    providers: ProviderConfig[];
    currentProviderId: string;
    onEdit: (providerId: string) => void;
    onDelete: (providerId: string) => void;
    onSetAsCurrent: (providerId: string) => void;
    onCreateNew: () => void;
}

/**
 * Provider List Component
 * Displays list of available providers with actions
 */
const ProviderList: React.FC<ProviderListProps> = ({
    providers,
    currentProviderId,
    onEdit,
    onDelete,
    onSetAsCurrent,
    onCreateNew
}) => {
    return (
        <Paper elevation={0} sx={{ padding: SPACING.STANDARD }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.STANDARD }}>
                <Typography variant="subtitle1">Available Providers</Typography>
                <Button variant="contained" color="primary" size="small" onClick={onCreateNew}>
                    Create New Provider
                </Button>
            </Box>

            <List dense>
                {providers.map((provider) => (
                    <React.Fragment key={provider.providerId}>
                        <ListItem
                            secondaryAction={
                                <Box sx={{ display: 'flex', gap: SPACING.SMALL }}>
                                    {provider.providerId !== currentProviderId && (
                                        <Button size="small" variant="outlined" onClick={() => onSetAsCurrent(provider.providerId)}>
                                            Apply as Current
                                        </Button>
                                    )}
                                    <Button size="small" variant="outlined" onClick={() => onEdit(provider.providerId)}>
                                        Edit
                                    </Button>
                                    {provider.providerId !== currentProviderId && (
                                        <Button size="small" variant="outlined" color="error" onClick={() => onDelete(provider.providerId)}>
                                            Delete
                                        </Button>
                                    )}
                                </Box>
                            }
                        >
                            <ListItemText
                                primary={provider.providerId === currentProviderId ? `${provider.providerName} - (Current)` : provider.providerName}
                                secondary={provider.providerType}
                                slotProps={{
                                    primary: { variant: 'body1', fontWeight: provider.providerId === currentProviderId ? 'bold' : 'normal' },
                                }}
                            />
                        </ListItem>
                        <Divider />
                    </React.Fragment>
                ))}
            </List>
        </Paper>
    );
};

ProviderList.displayName = 'ProviderList';
export default ProviderList;