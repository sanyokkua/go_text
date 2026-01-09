/**
 * Settings State Types
 * 
 * Defines the Redux state structure for application settings management.
 * Follows a normalized pattern with single source of truth and status tracking.
 */
import { AppSettingsMetadata, Settings } from '../../adapter';

/**
 * Complete settings state structure
 * 
 * Manages:
 * - All application settings (Single Source of Truth)
 * - Settings metadata (file locations, available types)
 * - Loading/saving status flags
 * - Error state for user feedback
 * 
 * Design Pattern: Normalized state with full object cache
 */
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
