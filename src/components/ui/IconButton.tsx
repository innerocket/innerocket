import type { JSX } from 'preact';
import { cloneElement } from 'preact';
import { Loader } from 'lucide-react';
import { tv, type VariantProps } from 'tailwind-variants';

const iconButton = tv({
  base: 'inline-flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
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
      ghost:
        'bg-transparent text-gray-600 hover:bg-gray-100 focus:ring-gray-500',
    },
    size: {
      sm: 'p-1 h-8 w-8',
      md: 'p-2 h-10 w-10',
      lg: 'p-3 h-12 w-12',
    },
    rounded: {
      true: 'rounded-full',
      false: 'rounded-md',
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
      sm: 'h-4 w-4',
      md: 'h-5 w-5',
      lg: 'h-6 w-6',
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
