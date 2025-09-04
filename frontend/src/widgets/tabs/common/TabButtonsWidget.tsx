import Button from '../../base/Button';

export interface TabContentBtn {
    btnId: string;
    btnName: string;
}

interface TabContentWidgetProps {
    buttons: TabContentBtn[];
    onBtnClick: (btnId: string) => void;
    disabled?: boolean;
}

export const TabButtonsWidget = ({ buttons, onBtnClick, disabled }: TabContentWidgetProps) => {
    return (
        <div className="tab-buttons-widget">
            <div className="tab-buttons-widget-grid">
                {buttons.map((item) => (
                    <div key={item.btnId}>
                        <Button
                            text={item.btnName}
                            onClick={() => onBtnClick(item.btnId)}
                            variant="outlined"
                            colorStyle={'primary-color'}
                            size="small"
                            block={true}
                            disabled={disabled}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};

TabButtonsWidget.displayName = 'TabContentWidget';
