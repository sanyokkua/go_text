import React from 'react';
import { selectLayout, useAppSelector } from '../../../../logic/store';
import styles from './EditorArea.module.css';
import InputPane from './InputPane';
import OutputPane from './OutputPane';

interface EditorAreaProps {
    /** Run/builder control bar. In stacked layout it renders between the panes (per mockup);
        in side layout it is rendered by the parent below the panes and this is omitted. */
    controlBar?: React.ReactNode;
}

const EditorArea: React.FC<EditorAreaProps> = ({ controlBar }) => {
    const layout = useAppSelector(selectLayout);

    if (layout === 'side') {
        return (
            <div className={styles.side}>
                <InputPane />
                <div className={styles.splitter} aria-hidden="true" />
                <OutputPane />
            </div>
        );
    }

    return (
        <div className={styles.stacked}>
            <InputPane />
            {controlBar}
            <OutputPane />
        </div>
    );
};

EditorArea.displayName = 'EditorArea';
export default EditorArea;
