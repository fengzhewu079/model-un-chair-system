import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  disabled,
  ...props
}) => {
  const sizeStyles = {
    sm: 'h-8 min-w-[80px] px-3 text-sm',
    md: 'h-11 min-w-[100px] px-4 text-base',
    lg: 'h-14 min-w-[160px] px-6 text-lg',
  };

  const baseStyles = `${sizeStyles[size]} rounded-md font-semibold transition-colors duration-150`;

  const variantStyles = {
    primary: 'bg-primary text-primary-ink hover:bg-primary-hover active:translate-y-px disabled:opacity-50',
    secondary: 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 active:bg-gray-200 disabled:opacity-50',
    danger: 'bg-white border border-error text-error hover:bg-error-light active:bg-red-200 disabled:opacity-50',
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${className} ${
        disabled ? 'cursor-not-allowed' : 'cursor-pointer'
      }`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};
