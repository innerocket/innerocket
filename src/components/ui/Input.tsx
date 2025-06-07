import type { JSX } from 'preact';
import { forwardRef } from 'preact/compat';
import { tv } from 'tailwind-variants';

const inputWrapper = tv({
  base: 'relative',
  variants: {
    fullWidth: {
      true: 'w-full',
    },
  },
});

const inputStyles = tv({
  base: 'px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
  variants: {
    error: {
      true: 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500',
      false: 'border-gray-300',
    },
    icon: {
      true: 'pl-10',
    },
    rightIcon: {
      true: 'pr-10',
    },
    fullWidth: {
      true: 'w-full',
    },
  },
});

const iconWrapper = tv({
  base: 'flex items-center justify-center h-full w-10 flex-shrink-0',
});

const leftIconWrapper = tv({
  base: 'absolute inset-y-0 left-0 flex items-center pointer-events-none',
});

const rightIconWrapper = tv({
  base: 'absolute inset-y-0 right-0 flex items-center',
  variants: {
    clickable: {
      true: 'cursor-pointer',
      false: 'pointer-events-none',
    },
  },
});

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
    const inputWrapperClasses = inputWrapper({ fullWidth });
    const inputClasses = inputStyles({
      error: !!error,
      icon: !!icon,
      rightIcon: !!rightIcon,
      fullWidth,
      className: className as string,
    });

    return (
      <div className={fullWidth ? 'w-full' : ''}>
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {label}
          </label>
        )}
        <div className={inputWrapperClasses}>
          {icon && (
            <div className={leftIconWrapper()}>
              <div className={iconWrapper()}>
                <span className="text-gray-500">{icon}</span>
              </div>
            </div>
          )}
          <input ref={ref} className={inputClasses} {...props} />
          {rightIcon && (
            <div
              className={rightIconWrapper({ clickable: !!onRightIconClick })}
              onClick={onRightIconClick}
            >
              <div className={iconWrapper()}>
                <span className="text-gray-500">{rightIcon}</span>
              </div>
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
