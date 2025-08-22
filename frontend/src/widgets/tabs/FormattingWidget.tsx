import React from 'react';
import { TabContentBtn, TabContentWidget } from './common/TabContentWidget';

type FormattingWidgetProps = {
    buttons: TabContentBtn[];
    onBtnClick: (btnId: string) => void;
};


const FormattingWidget: React.FC<FormattingWidgetProps> = (props) => {
    const { buttons, onBtnClick } = props;
    return <TabContentWidget buttons={buttons} onBtnClick={onBtnClick}/>
};

FormattingWidget.displayName = 'FormattingWidget';
export default FormattingWidget;