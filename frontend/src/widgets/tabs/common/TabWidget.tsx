import React, { Children, ReactNode, useEffect, useState } from 'react';

interface TabWidgetProps {
  tabs: string[];
  children: ReactNode;
}

const defaultActiveIndex = 0;

export const TabWidget = ({ tabs, children }: TabWidgetProps) => {
  const childrenArray = Children.toArray(children);

  if (childrenArray.length !== tabs.length) {
    throw new Error(
      `TabWidget: Number of children (${childrenArray.length}) ` +
        `does not match number of tabs (${tabs.length})`,
    );
  }

  const [activeIndex, setActiveIndex] = useState(defaultActiveIndex);
  const [isInitialRender, setIsInitialRender] = useState(true);

  useEffect(() => {
    setIsInitialRender(false);
  }, []);

  const handleTabClick = (index: number) => {
    setActiveIndex(index);
  };

  return (
    <div className="tab-widget">
      <div className="tab" role="tablist" aria-orientation="horizontal">
        <div className="tab-buttons-container">
          {tabs.map((label, index) => (
            <button
              key={index}
              role="tab"
              aria-selected={activeIndex === index}
              aria-controls={`tabpanel-${index}`}
              tabIndex={activeIndex === index ? 0 : -1}
              className={`tablinks ${activeIndex === index ? "active" : ""}`}
              onClick={() => handleTabClick(index)}
            >
              {label}
            </button>
          ))}
        </div>
        {/* Underline indicator */}
        <div className="tab-underline" />
      </div>

      {/* Tab content */}
      {childrenArray.map((child, index) => (
        <div
          key={`tabpanel-${index}`}
          id={`tabpanel-${index}`}
          role="tabpanel"
          aria-labelledby={`tab-${index}`}
          className={`tab-content ${activeIndex === index ? "active" : ""}`}
          style={{
            display: activeIndex === index ? "block" : "none",
            animation:
              isInitialRender && activeIndex === index ? "none" : undefined,
          }}
        >
          {child}
        </div>
      ))}
    </div>
  );
};

TabWidget.displayName = "TabWidget";
