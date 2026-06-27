import React from 'react';
import styles from './MarkdownView.module.css';

interface MarkdownViewProps {
    source: string;
}

export const MarkdownView = React.memo(function MarkdownView({ source }: MarkdownViewProps) {
    return (
        <div className={`markdown-body ${styles.root}`}>
            <pre className={styles.stub}>{source}</pre>
        </div>
    );
});

MarkdownView.displayName = 'MarkdownView';
export default MarkdownView;
