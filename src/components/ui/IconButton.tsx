import type { JSX } from 'preact';
import { cloneElement } from 'preact';
import { Loader } from 'lucide-react';
import { tv, type VariantProps } from 'tailwind-variants';

const iconButton = tv({
  base: 'inline-flex items-center justify-center transition-colors focus:outline-none focus:ring-4',
  variants: {
    variant: {
      primary:
        'text-white bg-blue-700 hover:bg-blue-800 focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800',
      secondary:
        'text-gray-900 bg-white border border-gray-300 focus:outline-none hover:bg-gray-100 focus:ring-gray-200 dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:border-gray-600 dark:focus:ring-gray-700',
      success:
        'text-white bg-green-700 hover:bg-green-800 focus:ring-green-300 dark:bg-green-600 dark:hover:bg-green-700 dark:focus:ring-green-800',
      danger:
        'text-white bg-red-700 hover:bg-red-800 focus:ring-red-300 dark:bg-red-600 dark:hover:bg-red-700 dark:focus:ring-red-900',
      warning:
        'text-white bg-yellow-400 hover:bg-yellow-500 focus:ring-yellow-300 dark:bg-yellow-600 dark:hover:bg-yellow-700 dark:focus:ring-yellow-800',
      info: 'text-white bg-blue-700 hover:bg-blue-800 focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800',
      light:
        'text-gray-900 bg-white border border-gray-300 hover:bg-gray-100 focus:ring-gray-200 dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:border-gray-600 dark:focus:ring-gray-700',
      dark: 'text-white bg-gray-800 hover:bg-gray-900 focus:ring-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 dark:focus:ring-gray-700 dark:border-gray-700',
      ghost:
        'text-gray-500 bg-transparent hover:bg-gray-100 hover:text-gray-900 focus:ring-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white dark:focus:ring-gray-700',
    },
    size: {
      xs: 'p-1.5 w-7 h-7',
      sm: 'p-2 w-8 h-8',
      md: 'p-2.5 w-10 h-10',
      lg: 'p-3 w-12 h-12',
      xl: 'p-3.5 w-14 h-14',
    },
    rounded: {
      true: 'rounded-full',
      false: 'rounded-lg',
    },
    disabled: {
      true: 'opacity-50 cursor-not-allowed',
    },
  },
  defaultVariants: {
    variant: 'primary',
    size: 'md',
    rounded: false,
  },
});

const iconSize = tv({
  variants: {
    size: {
      xs: 'h-3 w-3',
      sm: 'h-4 w-4',
      md: 'h-5 w-5',
      lg: 'h-6 w-6',
      xl: 'h-7 w-7',
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

export type IconButtonProps = JSX.HTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof iconButton> & {
    icon: JSX.Element;
    isLoading?: boolean;
    ariaLabel: string;
  };

export function IconButton({
  variant,
  size,
  icon,
  disabled = false,
  isLoading = false,
  ariaLabel,
  rounded,
  className = '',
  ...props
}: IconButtonProps) {
  const buttonClasses = iconButton({
    variant,
    size,
    rounded,
    disabled: disabled || isLoading,
    className: className as string,
  });

  const iconClasses = iconSize({ size });

  // Clone the icon element with the appropriate size class
  const sizedIcon = isLoading ? (
    <Loader className={`animate-spin ${iconClasses}`} />
  ) : // Clone the icon element and add size class
  typeof icon === 'object' && icon !== null && 'type' in icon ? (
    cloneElement(icon as JSX.Element, {
      className: `${
        (icon as JSX.Element).props?.className || ''
      } ${iconClasses}`.trim(),
    })
  ) : (
    <span className={iconClasses}>{icon}</span>
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
