import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles/appbar.scss';
import './styles/bottombar.scss';
import './styles/button.scss';
import './styles/colors.scss';
import './styles/gloabl_styles.scss';
import './styles/io_widgets.scss';
import './styles/select.scss';
import './styles/tab_buttons_widget.scss';
import './styles/tab_widget.scss';
import './styles/texteditor.scss';
import AppMainController from './widgets/AppMainController';

const container = document.getElementById('root');
const root = createRoot(container!);

root.render(
    <React.StrictMode>
        <AppMainController />
    </React.StrictMode>,
);
