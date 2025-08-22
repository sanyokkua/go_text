import React from 'react';
import { TabContentBtn, TabContentWidget } from './common/TabContentWidget';

type ProofreadingWidgetProps = {
    buttons: TabContentBtn[];
    onBtnClick: (btnId: string) => void;
};


const ProofreadingWidget: React.FC<ProofreadingWidgetProps> = (props) => {
    const { buttons, onBtnClick } = props;
    return <TabContentWidget buttons={buttons} onBtnClick={onBtnClick}/>
};

ProofreadingWidget.displayName = 'ProofreadingWidget';
export default ProofreadingWidget;