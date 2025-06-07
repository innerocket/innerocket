import type { JSX } from 'preact';
import { Loader } from 'lucide-react';

type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'danger'
  | 'warning'
  | 'info';
type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends JSX.HTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: JSX.Element;
  fullWidth?: boolean;
  isLoading?: boolean;
  disabled?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  fullWidth = false,
  isLoading = false,
  disabled = false,
  className = '',
  children,
  ...props
}: ButtonProps) {
  const baseStyles =
    'inline-flex items-center justify-center font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';

  const variantStyles = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary:
      'bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-500',
    success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    warning:
      'bg-yellow-500 text-white hover:bg-yellow-600 focus:ring-yellow-500',
    info: 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200 focus:ring-indigo-500',
  };

  const sizeStyles = {
    sm: 'px-3 py-1 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg',
  };

  const disabledStyles = 'opacity-50 cursor-not-allowed';
  const widthStyles = fullWidth ? 'w-full' : '';

  // Create the final classname string
  let buttonClasses =
    baseStyles + ' ' + variantStyles[variant] + ' ' + sizeStyles[size];
  if (widthStyles) buttonClasses += ' ' + widthStyles;
  if (disabled || isLoading) buttonClasses += ' ' + disabledStyles;
  if (className) buttonClasses += ' ' + className;

  return (
    <button
      className={buttonClasses}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <Loader className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" />
      )}
      {icon && !isLoading && <span className="mr-2">{icon}</span>}
      {children}
    </button>
  );
}
