import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'highlight' | 'warning';
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  variant = 'default',
  onClick,
}) => {
  const variantStyles = {
    default: 'bg-white border border-gray-200',
    highlight: 'bg-primary-light border-2 border-primary',
    warning: 'bg-warning-light border border-warning',
  };

  return (
    <div
      className={`rounded-lg p-6 ${variantStyles[variant]} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
};
