import { configureStore } from '@reduxjs/toolkit';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import uiReducer from '../../logic/store/ui/slice';
import AppLayout from '../AppLayout';

// The ui slice transitively imports logic/adapter (ESM-heavy Wails bindings).
// Stub it so the store module graph loads under Jest, matching the editor tests.
jest.mock('../../logic/adapter', () => ({ getLogger: () => ({ logInfo: jest.fn(), logDebug: jest.fn(), logError: jest.fn(), logWarn: jest.fn() }) }));

// AppMainView and NotificationContainer are stubbed: the regression target
// (a full-screen loading overlay) is a SIBLING of AppMainView in AppLayout,
// so stubbing the siblings does not hide what this test guards.
jest.mock('../widgets/views/AppMainView', () => {
    const Stub: React.FC = () => <div data-testid="app-main-view-stub" />;
    Stub.displayName = 'AppMainViewStub';
    return { __esModule: true, default: Stub };
});

jest.mock('../widgets/base/NotificationContainer', () => {
    const Stub: React.FC = () => null;
    Stub.displayName = 'NotificationContainerStub';
    return { __esModule: true, default: Stub };
});

// Avoid touching window.matchMedia / DOM theme application during the test.
jest.mock('../../logic/theme/init', () => ({ applyTheme: jest.fn(), watchSystemTheme: jest.fn(() => () => undefined) }));

function makeStore(uiOverrides = {}) {
    return configureStore({
        reducer: { ui: uiReducer },
        preloadedState: {
            ui: {
                layout: 'side' as const,
                sidebarCollapsed: false,
                historyOpen: false,
                inferenceRunning: false,
                currentView: 'main' as const,
                armedActionId: null,
                armedStackId: null,
                activeActionsTab: null,
                buildMode: false,
                editingStackId: null,
                activeSettingsTab: 0,
                theme: { mode: 'auto' as const, effective: 'light' as const },
                appBarVisibility: { providerModelSelectors: true, languagePicker: true, outputFormatToggle: true, outputModeToggle: true, layoutToggle: true, commandPaletteButton: true, historyButton: true, infoButton: true },
                ...uiOverrides,
            },
        },
    });
}

describe('AppLayout', () => {
    it('does not mount a full-screen processing overlay while a run is in progress', () => {
        render(
            <Provider store={makeStore({ inferenceRunning: true, currentView: 'main' })}>
                <AppLayout />
            </Provider>,
        );

        // The old GlobalLoadingOverlay rendered a "Processing…" label. The in-pane
        // StepProgress indicator is the single source of truth instead.
        expect(screen.queryByText(/processing/i)).toBeNull();
        expect(screen.getByTestId('app-main-view-stub')).toBeInTheDocument();
    });
});
