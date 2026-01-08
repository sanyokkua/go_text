import { AppSettingsMetadata, Settings } from '../../adapter';

export interface SettingsState {
    // Full object cache (Single Source of Truth)
    allSettings: Settings | null;

    // Metadata is separate from the main Settings object
    metadata: AppSettingsMetadata | null;

    // Status Flags
    loading: boolean; // Initial load
    saving: boolean; // Saving updates
    error: string | null;
}
