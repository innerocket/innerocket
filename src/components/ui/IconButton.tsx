import type { JSX } from 'preact';
import { Loader } from 'lucide-react';

type IconButtonVariant =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'danger'
  | 'warning'
  | 'info'
  | 'ghost';
type IconButtonSize = 'sm' | 'md' | 'lg';

export interface IconButtonProps extends JSX.HTMLAttributes<HTMLButtonElement> {
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  icon: JSX.Element;
  disabled?: boolean;
  isLoading?: boolean;
  ariaLabel: string;
  rounded?: boolean;
}

export function IconButton({
  variant = 'primary',
  size = 'md',
  icon,
  disabled = false,
  isLoading = false,
  ariaLabel,
  rounded = false,
  className = '',
  ...props
}: IconButtonProps) {
  const baseStyles =
    'inline-flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';

  const variantStyles = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary:
      'bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-500',
    success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    warning:
      'bg-yellow-500 text-white hover:bg-yellow-600 focus:ring-yellow-500',
    info: 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200 focus:ring-indigo-500',
    ghost: 'bg-transparent text-gray-600 hover:bg-gray-100 focus:ring-gray-500',
  };

  const sizeStyles = {
    sm: 'p-1',
    md: 'p-2',
    lg: 'p-3',
  };

  const iconSizeStyles = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  const disabledStyles = 'opacity-50 cursor-not-allowed';
  const roundedStyles = rounded ? 'rounded-full' : 'rounded-md';

  // Create the final classname string
  let buttonClasses =
    baseStyles +
    ' ' +
    variantStyles[variant] +
    ' ' +
    sizeStyles[size] +
    ' ' +
    roundedStyles;
  if (disabled || isLoading) buttonClasses += ' ' + disabledStyles;
  if (className) buttonClasses += ' ' + className;

  // Create the icon with appropriate size
  const sizedIcon = isLoading ? (
    <Loader className={`animate-spin ${iconSizeStyles[size]}`} />
  ) : (
    <span className={iconSizeStyles[size]}>{icon}</span>
  );

  return (
    <button
      className={buttonClasses}
      disabled={disabled || isLoading}
      aria-label={ariaLabel}
      type="button"
      {...props}
    >
      {sizedIcon}
    </button>
  );
}
