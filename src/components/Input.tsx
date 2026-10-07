import React, { useId } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  className = '',
  ...props
}) => {
  const generatedId = useId();
  const fieldId = props.id ?? generatedId;
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={fieldId} className="block text-base font-semibold text-gray-700 mb-2">
          {label}
        </label>
      )}
      <input
        id={fieldId}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${fieldId}-error` : props['aria-describedby']}
        className={`mun-input w-full h-12 px-3 text-base border rounded-lg transition-all duration-150 ${
          error
            ? 'border-2 border-error focus:outline-none focus:ring-2 focus:ring-error-light'
            : 'border-gray-300 focus:outline-none focus:border-2 focus:border-primary focus:ring-2 focus:ring-primary/10'
        } disabled:bg-gray-100 disabled:cursor-not-allowed ${className}`}
        {...props}
      />
      {error && <p id={`${fieldId}-error`} role="alert" className="mt-1 text-sm text-error">{error}</p>}
    </div>
  );
};

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea: React.FC<TextareaProps> = ({
  label,
  error,
  className = '',
  ...props
}) => {
  const generatedId = useId();
  const fieldId = props.id ?? generatedId;
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={fieldId} className="block text-base font-semibold text-gray-700 mb-2">
          {label}
        </label>
      )}
      <textarea
        id={fieldId}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${fieldId}-error` : props['aria-describedby']}
        className={`mun-input w-full min-h-[120px] px-3 py-2 text-base border rounded-lg resize-y transition-all duration-150 ${
          error
            ? 'border-2 border-error focus:outline-none focus:ring-2 focus:ring-error-light'
            : 'border-gray-300 focus:outline-none focus:border-2 focus:border-primary focus:ring-2 focus:ring-primary/10'
        } disabled:bg-gray-100 disabled:cursor-not-allowed ${className}`}
        {...props}
      />
      {error && <p id={`${fieldId}-error`} role="alert" className="mt-1 text-sm text-error">{error}</p>}
    </div>
  );
};
