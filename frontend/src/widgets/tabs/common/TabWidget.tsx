import { Children, ReactNode, useState } from 'react';

interface TabWidgetProps {
    tabs: string[];
    children: ReactNode;
    disabled?: boolean;
}

const defaultActiveIndex = 0;

export const TabWidget = ({ tabs, children, disabled }: TabWidgetProps) => {
    const childrenArray = Children.toArray(children);

    if (childrenArray.length !== tabs.length) {
        throw new Error(`TabWidget: Number of children (${childrenArray.length}) ` + `does not match number of tabs (${tabs.length})`);
    }

    const [activeIndex, setActiveIndex] = useState(defaultActiveIndex);

    const handleTabClick = (index: number) => {
        setActiveIndex(index);
    };

    return (
        <div className="tab-widget-container">
            <div className="tab-buttons-container">
                <div className="tab-buttons-container-buttons">
                    {tabs.map((label, index) => (
                        <button
                            key={index}
                            className={`${activeIndex === index ? 'active' : ''}`}
                            onClick={() => handleTabClick(index)}
                            disabled={disabled}
                        >
                            {label}
                        </button>
                    ))}
                </div>
                <hr className="tab-buttons-container-underline" />
            </div>

            {childrenArray.map((child, index) => (
                <div
                    key={`tab-panel-${index}`}
                    id={`tab-panel-${index}`}
                    className={`tab-content-container ${activeIndex === index ? 'tab-content-container-active' : 'tab-content-container-hidden'}`}
                >
                    {child}
                </div>
            ))}
        </div>
    );
};

TabWidget.displayName = 'TabWidget';
