import React from 'react';
import { TabButtonsWidget, TabContentBtn } from './common/TabButtonsWidget';

type ButtonsOnlyWidgetProps = { buttons: TabContentBtn[]; disabled?: boolean; onBtnClick: (btnId: string) => void };

const ButtonsOnlyWidget: React.FC<ButtonsOnlyWidgetProps> = (props) => {
    const { buttons, onBtnClick } = props;
    return <TabButtonsWidget buttons={buttons} onBtnClick={onBtnClick} disabled={props.disabled} />;
};

ButtonsOnlyWidget.displayName = 'ButtonsOnlyWidget';
export default ButtonsOnlyWidget;
