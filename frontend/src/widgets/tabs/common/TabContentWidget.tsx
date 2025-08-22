import React from 'react';
import Button from '../../inputs/Button';

export interface TabContentBtn {
    btnId: string;
    btnName: string;
}

interface TabContentWidgetProps {
    buttons: TabContentBtn[];
    onBtnClick: (btnId: string) => void;
    columns?: number;
}

export const TabContentWidget = ({
                                     buttons,
                                     onBtnClick,
                                     columns = 3,
                                 }: TabContentWidgetProps) => {

    let style = columns!==3?{  gridTemplateColumns: "repeat(2, 1fr)"} : {};
    return (
        <div className={`tab-content-widget`}>
            <div className="tab-content-grid" style={style}>
                {buttons.map((item) => (
                    <Button
                        key={item.btnId}
                        text={item.btnName}
                        onClick={() => onBtnClick(item.btnId)}
                        variant='outlined'
                        colorStyle={"primary-color"}
                        size='default'
                        block={true}
                    />
                ))}
            </div>
        </div>
    );
};

TabContentWidget.displayName = 'TabContentWidget';