import React from 'react';
import Button from '../../base/Button';

interface TopBarWidgetProps {
    onButtonClick?: () => void;
    disabled?: boolean;
}

const TopBarWidget: React.FC<TopBarWidgetProps> = ({ onButtonClick, disabled }) => {
    return (
        <nav className="app-bar">
            <h3 className="app-bar-title-link">Text Processor</h3>
            <div className="app-bar-spacing-stub" />

            <Button
                text={'Settings'}
                onClick={onButtonClick}
                variant={'outlined'}
                colorStyle={'white-color'}
                size={'tiny'}
                disabled={disabled}
            />
        </nav>
    );
};
TopBarWidget.displayName = 'TopBarWidget';
export default TopBarWidget;
