import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../logic/store';
import { selectEffectiveTheme, selectThemeMode } from '../logic/store/ui/selectors';
import { setThemeEffective } from '../logic/store/ui/slice';
import { applyTheme, watchSystemTheme } from '../logic/theme/init';
import { TooltipProvider } from './primitives/Tooltip';
import GlobalLoadingOverlay from './widgets/base/GlobalLoadingOverlay';
import NotificationContainer from './widgets/base/NotificationContainer';
import AppMainView from './widgets/views/AppMainView';

const AppLayout: React.FC = () => {
    const dispatch = useAppDispatch();
    const effective = useAppSelector(selectEffectiveTheme);
    const mode = useAppSelector(selectThemeMode);

    // Apply the effective theme to the DOM whenever Redux state changes
    useEffect(() => {
        applyTheme(effective);
    }, [effective]);

    // Watch OS preference changes; clean up when mode changes away from 'auto'
    useEffect(() => {
        const unwatch = watchSystemTheme(mode, (eff) => dispatch(setThemeEffective(eff)));
        return unwatch;
    }, [mode, dispatch]);

    return (
        <TooltipProvider>
            <AppMainView />
            <GlobalLoadingOverlay />
            <NotificationContainer />
        </TooltipProvider>
    );
};

AppLayout.displayName = 'AppLayout';
export default AppLayout;
