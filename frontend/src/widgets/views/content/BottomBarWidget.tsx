import React from 'react';

interface BottomBarWidgetProps {
    provider?: string;
    model?: string;
    task?: string;
}

const BottomBarWidget: React.FC<BottomBarWidgetProps> = ({ provider = 'N/A', model = 'N/A', task = 'N/A' }) => {
    return (
        <nav>
            <footer className="bottom-bar">
                <p>Provider: {provider}</p>
                <p>Model: {model}</p>
                <p>Task: {task}</p>
            </footer>
        </nav>
    );
};

BottomBarWidget.displayName = 'BottomBarWidget';
export default BottomBarWidget;
