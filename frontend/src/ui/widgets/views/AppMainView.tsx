import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { getLogger } from '../../../logic/adapter';
import {
    selectActionCatalog,
    selectCurrentView,
    selectInferenceRunning,
    selectInputContent,
    selectSavedStacks,
    useAppDispatch,
    useAppSelector,
} from '../../../logic/store';
import { loadActionCatalog } from '../../../logic/store/actions';
import { runSingleAction } from '../../../logic/store/run';
import { initializeSettingsState, selectAllSettings } from '../../../logic/store/settings';
import { addStep } from '../../../logic/store/stacks/builder/slice';
import { enqueueNotification } from '../../../logic/store/notifications/slice';
import { enterBuildMode, navigateToMain, setActiveActionsTab } from '../../../logic/store/ui/slice';
import { parseError } from '../../../logic/utils/error_utils';
import { CommandPalette, CommandPaletteItem } from '../../primitives/CommandPalette';
import FlexContainer from '../../components/FlexContainer';
import { UI_HEIGHTS } from '../../styles/constants';
import AppBar from '../base/AppBar';
import StatusBar from '../base/StatusBar';
import MainContent from './MainContent';

const logger = getLogger('AppMainView');

const AppMainView: React.FC = () => {
    const dispatch = useAppDispatch();
    const view = useAppSelector(selectCurrentView);
    const showSettings = view === 'settings';
    const inferenceRunning = useAppSelector(selectInferenceRunning);
    const catalog = useAppSelector(selectActionCatalog);
    const savedStacks = useAppSelector(selectSavedStacks);
    const inputContent = useAppSelector(selectInputContent);
    const settings = useAppSelector(selectAllSettings);

    const [paletteOpen, setPaletteOpen] = useState(false);

    useEffect(() => {
        const initializeApp = async () => {
            try {
                logger.logInfo('Initializing app state');
                await dispatch(initializeSettingsState()).unwrap();
                logger.logInfo('Settings initialized');
                const catalogItems = await dispatch(loadActionCatalog()).unwrap();
                logger.logInfo(`Catalog loaded: ${catalogItems.length} actions`);
                if (catalogItems.length > 0) {
                    dispatch(setActiveActionsTab(catalogItems[0].category));
                }
            } catch (error: unknown) {
                const err = parseError(error);
                logger.logError(`Failed to initialize app: ${err.message}`);
            }
        };
        initializeApp();
    }, [dispatch]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setPaletteOpen((prev) => !prev);
            }
        };
        globalThis.addEventListener('keydown', handleKeyDown);
        return () => globalThis.removeEventListener('keydown', handleKeyDown);
    }, []);

    const paletteItems = useMemo<CommandPaletteItem[]>(
        () => [
            ...catalog.map((a) => ({ value: a.id, label: a.name, group: a.category })),
            ...savedStacks.map((s) => ({ value: `stack:${s.id}`, label: s.name, group: 'My Stacks' })),
        ],
        [catalog, savedStacks],
    );

    const handlePaletteRun = useCallback(
        async (value: string) => {
            dispatch(navigateToMain());
            if (value.startsWith('stack:')) {
                // Stack execution to be wired in T26
                return;
            }
            try {
                await dispatch(runSingleAction({ actionId: value, inputText: inputContent, settings })).unwrap();
            } catch (error: unknown) {
                const err = parseError(error);
                dispatch(enqueueNotification({ message: `Run failed: ${err.message}`, severity: 'error' }));
            }
        },
        [dispatch, inputContent, settings],
    );

    const handlePaletteAddToStack = useCallback(
        (value: string) => {
            if (value.startsWith('stack:')) return;
            dispatch(navigateToMain());
            dispatch(enterBuildMode());
            dispatch(addStep(value));
        },
        [dispatch],
    );

    return (
        <FlexContainer direction="column" overflowHidden style={{ width: '100%', height: '100%', maxHeight: '100vh', minHeight: '100vh' }}>
            <div style={{ height: UI_HEIGHTS.APP_BAR }}>
                <AppBar />
            </div>
            <FlexContainer grow overflowHidden>
                <MainContent />
            </FlexContainer>
            {!showSettings && (
                <div style={{ height: UI_HEIGHTS.STATUS_BAR }}>
                    <StatusBar />
                </div>
            )}
            <CommandPalette
                open={paletteOpen}
                onOpenChange={setPaletteOpen}
                items={paletteItems}
                placeholder="Run or add action to stack…"
                onSelect={handlePaletteRun}
                onShiftSelect={handlePaletteAddToStack}
                disabled={inferenceRunning}
            />
        </FlexContainer>
    );
};

AppMainView.displayName = 'AppMainView';
export default AppMainView;
