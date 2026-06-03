import React, { useState, useRef, useEffect } from 'react';

interface TooltipProps {
  content: string;
  children: React.ReactElement;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'bottom',
  delay = 300,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const triggerRef = useRef<HTMLDivElement>(null);

  const showTooltip = () => {
    timeoutRef.current = setTimeout(() => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        let x = 0;
        let y = 0;

        switch (position) {
          case 'top':
            x = rect.left + rect.width / 2;
            y = rect.top;
            break;
          case 'bottom':
            x = rect.left + rect.width / 2;
            y = rect.bottom;
            break;
          case 'left':
            x = rect.left;
            y = rect.top + rect.height / 2;
            break;
          case 'right':
            x = rect.right;
            y = rect.top + rect.height / 2;
            break;
        }

        setCoords({ x, y });
        setIsVisible(true);
      }
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const getTooltipStyle = (): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      position: 'fixed',
      zIndex: 9999,
      pointerEvents: 'none',
      opacity: isVisible ? 1 : 0,
      transition: 'opacity 150ms ease-in-out',
    };

    switch (position) {
      case 'top':
        return {
          ...baseStyle,
          left: `${coords.x}px`,
          top: `${coords.y}px`,
          transform: 'translate(-50%, calc(-100% - 8px))',
        };
      case 'bottom':
        return {
          ...baseStyle,
          left: `${coords.x}px`,
          top: `${coords.y}px`,
          transform: 'translate(-50%, 8px)',
        };
      case 'left':
        return {
          ...baseStyle,
          left: `${coords.x}px`,
          top: `${coords.y}px`,
          transform: 'translate(calc(-100% - 8px), -50%)',
        };
      case 'right':
        return {
          ...baseStyle,
          left: `${coords.x}px`,
          top: `${coords.y}px`,
          transform: 'translate(8px, -50%)',
        };
      default:
        return baseStyle;
    }
  };

  const getArrowStyle = (): React.CSSProperties => {
    const baseArrowStyle: React.CSSProperties = {
      position: 'absolute',
      width: 0,
      height: 0,
      borderStyle: 'solid',
    };

    switch (position) {
      case 'top':
        return {
          ...baseArrowStyle,
          left: '50%',
          bottom: '-4px',
          transform: 'translateX(-50%)',
          borderWidth: '4px 4px 0 4px',
          borderColor: '#1F2937 transparent transparent transparent',
        };
      case 'bottom':
        return {
          ...baseArrowStyle,
          left: '50%',
          top: '-4px',
          transform: 'translateX(-50%)',
          borderWidth: '0 4px 4px 4px',
          borderColor: 'transparent transparent #1F2937 transparent',
        };
      case 'left':
        return {
          ...baseArrowStyle,
          right: '-4px',
          top: '50%',
          transform: 'translateY(-50%)',
          borderWidth: '4px 0 4px 4px',
          borderColor: 'transparent transparent transparent #1F2937',
        };
      case 'right':
        return {
          ...baseArrowStyle,
          left: '-4px',
          top: '50%',
          transform: 'translateY(-50%)',
          borderWidth: '4px 4px 4px 0',
          borderColor: 'transparent #1F2937 transparent transparent',
        };
      default:
        return baseArrowStyle;
    }
  };

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        style={{ display: 'inline-block' }}
      >
        {children}
      </div>
      {isVisible && (
        <div
          style={getTooltipStyle()}
          className="bg-gray-800 text-white text-sm px-3 py-1.5 rounded-md shadow-lg whitespace-nowrap"
        >
          {content}
          <div style={getArrowStyle()} />
        </div>
      )}
    </>
  );
};
