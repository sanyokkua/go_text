import React from 'react';
import { selectLayout, useAppSelector } from '../../../../logic/store';
import styles from './EditorArea.module.css';
import InputPane from './InputPane';
import OutputPane from './OutputPane';

const EditorArea: React.FC = () => {
    const layout = useAppSelector(selectLayout);

    return (
        <div className={layout === 'side' ? styles.side : styles.stacked}>
            <InputPane />
            {layout === 'side' && <div className={styles.splitter} aria-hidden="true" />}
            <OutputPane />
        </div>
    );
};

EditorArea.displayName = 'EditorArea';
export default EditorArea;
