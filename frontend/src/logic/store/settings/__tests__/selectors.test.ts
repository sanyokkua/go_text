import type { RootState } from '../../index';
import { selectAvailableProviders, selectDiscoveredModels, selectProviderItems, selectProviderPresets } from '../selectors';

function stateWithSettings(overrides: Partial<RootState['settings']> = {}): RootState {
    return { settings: { allSettings: null, metadata: null, ...overrides } } as RootState;
}

describe('selectAvailableProviders', () => {
    it('returns the same array reference across calls when allSettings is null', () => {
        const first = selectAvailableProviders(stateWithSettings());
        const second = selectAvailableProviders(stateWithSettings());

        expect(first).toBe(second);
        expect(first).toEqual([]);
    });
});

describe('selectDiscoveredModels', () => {
    it('returns the same array reference across calls when discoveredModels is undefined', () => {
        const first = selectDiscoveredModels(stateWithSettings());
        const second = selectDiscoveredModels(stateWithSettings());

        expect(first).toBe(second);
        expect(first).toEqual([]);
    });
});

describe('selectProviderPresets', () => {
    it('returns the same array reference across calls when providerPresets is undefined', () => {
        const first = selectProviderPresets(stateWithSettings());
        const second = selectProviderPresets(stateWithSettings());

        expect(first).toBe(second);
        expect(first).toEqual([]);
    });
});

describe('selectProviderItems', () => {
    it('returns the same memoized result across two separate state snapshots when providers are unavailable', () => {
        // Two distinct RootState objects (as across re-renders after an unrelated slice
        // updates), both with allSettings null. Before the fix, selectAvailableProviders
        // (an input selector) returned a new [] each call, so reselect's default
        // equality check treated the input as "changed" and recomputed every time.
        const first = selectProviderItems(stateWithSettings());
        const second = selectProviderItems(stateWithSettings());

        expect(first).toBe(second);
    });
});
