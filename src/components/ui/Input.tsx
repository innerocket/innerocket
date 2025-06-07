import type { JSX } from 'preact';
import { forwardRef } from 'preact/compat';

export interface InputProps extends JSX.HTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  fullWidth?: boolean;
  icon?: JSX.Element;
  rightIcon?: JSX.Element;
  onRightIconClick?: () => void;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      hint,
      fullWidth = false,
      icon,
      rightIcon,
      onRightIconClick,
      className = '',
      ...props
    },
    ref
  ) => {
    const inputWrapperClasses = `relative ${fullWidth ? 'w-full' : ''}`;
    const inputClasses = `px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
      error
        ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500'
        : 'border-gray-300'
    } ${icon ? 'pl-10' : ''} ${rightIcon ? 'pr-10' : ''} ${
      fullWidth ? 'w-full' : ''
    } ${className}`;

    return (
      <div className={`${fullWidth ? 'w-full' : ''}`}>
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {label}
          </label>
        )}
        <div className={inputWrapperClasses}>
          {icon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-500 sm:text-sm">{icon}</span>
            </div>
          )}
          <input ref={ref} className={inputClasses} {...props} />
          {rightIcon && (
            <div
              className={`absolute inset-y-0 right-0 pr-3 flex items-center ${
                onRightIconClick ? 'cursor-pointer' : 'pointer-events-none'
              }`}
              onClick={onRightIconClick}
            >
              <span className="text-gray-500 sm:text-sm">{rightIcon}</span>
            </div>
          )}
        </div>
        {(error || hint) && (
          <p
            className={`mt-1 text-sm ${
              error ? 'text-red-600' : 'text-gray-500'
            }`}
          >
            {error || hint}
          </p>
        )}
      </div>
    );
  }
);
