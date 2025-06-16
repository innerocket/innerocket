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
  base: 'block p-3 rounded-lg focus:outline-none transition-all duration-200',
  variants: {
    error: {
      true: 'bg-red-50 border-2 border-red-400 text-red-900 placeholder-red-600 focus:border-red-500 dark:bg-red-900/20 dark:border-red-500 dark:text-red-200 dark:placeholder-red-400',
      false:
        'bg-gray-50 border-2 border-gray-200 text-gray-900 placeholder-gray-500 focus:border-blue-400 dark:bg-gray-800 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:border-blue-500',
    },
    icon: {
      true: 'pl-11',
    },
    rightIcon: {
      true: 'pr-11',
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
  base: 'absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none',
});

const rightIconWrapper = tv({
  base: 'absolute inset-y-0 right-0 flex items-center pr-3',
  variants: {
    clickable: {
      true: 'cursor-pointer',
      false: 'pointer-events-none',
    },
  },
});

export interface InputProps extends JSX.InputHTMLAttributes<HTMLInputElement> {
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
          <label className="block mb-3 text-sm font-semibold text-gray-700 dark:text-gray-200">
            {label}
          </label>
        )}
        <div className={inputWrapperClasses}>
          {icon && (
            <div className={leftIconWrapper()}>
              <div className={iconWrapper()}>
                <span className="text-gray-500 dark:text-gray-400">{icon}</span>
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
                <span className="text-gray-500 dark:text-gray-400">
                  {rightIcon}
                </span>
              </div>
            </div>
          )}
        </div>
        {(error || hint) && (
          <p
            className={`mt-2 text-sm ${
              error
                ? 'text-red-600 dark:text-red-500'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            {error || hint}
          </p>
        )}
      </div>
    );
  }
);
