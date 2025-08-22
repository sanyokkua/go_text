import React from 'react';
import Button from "../inputs/Button";

interface TopBarWidgetProps {
    onButtonClick?: () => void;
}

const TopBarWidget: React.FC<TopBarWidgetProps> = ({onButtonClick}) => {
    return (
        <nav className="app-bar">
            <h3 className="app-bar-title-link">Text Processor</h3>

            <div className="app-bar-spacing-stub"/>

            <Button text={'Settings'}
                    onClick={onButtonClick}
                    variant={'outlined'}
                    colorStyle={'white-color'}
                    size={'small'}
            />
        </nav>
    );
};
TopBarWidget.displayName = 'TopBarWidget';
export default TopBarWidget;