import React from 'react'
import {createRoot} from 'react-dom/client'
import './styles/gloabl_styles.scss';
import './styles/colors.scss'
import './styles/texteditor.scss'
import './styles/appbar.scss'
import './styles/buttons.scss'
import './styles/bottombar.scss'
import './styles/io_widgets.scss'
import './styles/tab_widget.scss'
import './styles/tab_container.scss'
import './styles/containers.scss'
import App from './App'

const container = document.getElementById('root')
const root = createRoot(container!)

root.render(
    <React.StrictMode>
        <App/>
    </React.StrictMode>
)
