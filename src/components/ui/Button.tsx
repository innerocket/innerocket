import type { JSX } from 'preact';
import { Loader } from 'lucide-react';
import { tv, type VariantProps } from 'tailwind-variants';

const button = tv({
  base: 'inline-flex items-center justify-center font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
  variants: {
    variant: {
      primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
      secondary:
        'bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-500',
      success:
        'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500',
      danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
      warning:
        'bg-yellow-500 text-white hover:bg-yellow-600 focus:ring-yellow-500',
      info: 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200 focus:ring-indigo-500',
    },
    size: {
      sm: 'px-3 py-1 text-sm',
      md: 'px-4 py-2',
      lg: 'px-6 py-3 text-lg',
    },
    fullWidth: {
      true: 'w-full',
    },
    disabled: {
      true: 'opacity-50 cursor-not-allowed',
    },
  },
  defaultVariants: {
    variant: 'primary',
    size: 'md',
    fullWidth: false,
  },
});

export type ButtonProps = JSX.HTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof button> & {
    icon?: JSX.Element;
    isLoading?: boolean;
  };

export function Button({
  variant,
  size,
  icon,
  fullWidth,
  isLoading = false,
  disabled = false,
  className = '',
  children,
  ...props
}: ButtonProps) {
  const buttonClasses = button({
    variant,
    size,
    fullWidth,
    disabled: disabled || isLoading,
    className: className as string,
  });

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
