/**
 * Settings State Types
 *
 * Defines the Redux state structure for application settings management.
 * Follows a normalized pattern with a single source of truth and status tracking.
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
 * Design Pattern: Normalized state with a full object cache
 */
export interface SettingsState {
    // Full object cache (Single Source of Truth)
    allSettings: Settings | null;

    // Metadata is separate from the main Settings object
    metadata: AppSettingsMetadata | null;

    // Model ids discovered for the current provider via live discovery.
    // Reset to [] whenever the current provider changes so the picker never
    // offers another provider's models. Optional so existing preloaded-state
    // fixtures stay valid; initialState always seeds it to [].
    discoveredModels?: string[];
}
