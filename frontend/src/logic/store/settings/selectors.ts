import { Settings } from '../../adapter';
import { RootState } from '../index';

// Basic selectors
export const selectAllSettings = (state: RootState): Settings | null => state.settings.allSettings;
export const selectSettingsMetadata = (state: RootState) => state.settings.metadata;

// Derived selectors for specific settings parts
export const selectCurrentProvider = (state: RootState) => state.settings.allSettings?.currentProviderConfig || null;
export const selectModelConfig = (state: RootState) => state.settings.allSettings?.modelConfig || null;
