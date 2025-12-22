import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './logic/store/store';
import './ui/styles/appbar.scss';
import './ui/styles/bottombar.scss';
import './ui/styles/button.scss';
import './ui/styles/colors.scss';
import './ui/styles/global_styles.scss';
import './ui/styles/io_widgets.scss';
import './ui/styles/select.scss';
import './ui/styles/settings_widget.scss';
import './ui/styles/tab_buttons_widget.scss';
import './ui/styles/tab_widget.scss';
import './ui/styles/texteditor.scss';
import AppMainController from './ui/widgets/AppMainController';

const container = document.getElementById('root');
const root = createRoot(container!);

root.render(
    <React.StrictMode>
        <Provider store={store}>
            <AppMainController />
        </Provider>
    </React.StrictMode>,
);
