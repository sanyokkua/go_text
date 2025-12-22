import React from 'react';
import { ActionIdentifier } from '../../../../../logic/common/types';
import Button from '../../../base/Button';

interface ActionGroupWidgetProps {
    buttons: ActionIdentifier[];
    onBtnClick: (btnId: string) => void;
    disabled?: boolean;
}

export const ActionGroupWidget: React.FC<ActionGroupWidgetProps> = ({ buttons, onBtnClick, disabled }: ActionGroupWidgetProps) => {
    return (
        <div className="tab-buttons-widget">
            <div className="tab-buttons-widget-grid">
                {buttons.map((item) => (
                    <div key={item.id}>
                        <Button
                            text={item.name}
                            onClick={() => onBtnClick(item.id)}
                            variant="outlined"
                            colorStyle={'primary-color'}
                            size="small"
                            block={true}
                            disabled={disabled ?? false}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};

ActionGroupWidget.displayName = 'ActionGroupWidget';
