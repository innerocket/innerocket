import { type JSX, Show, splitProps, type Component } from 'solid-js'
import { tv } from 'tailwind-variants'

const inputWrapper = tv({
  base: 'relative',
  variants: {
    fullWidth: {
      true: 'w-full',
    },
  },
})

const inputStyles = tv({
  base: 'block p-2.5 px-3 rounded-lg focus:outline-none transition-all duration-200 text-sm',
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
})

const iconWrapper = tv({
  base: 'flex items-center justify-center h-full w-10 flex-shrink-0',
})

const leftIconWrapper = tv({
  base: 'absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none',
})

const rightIconWrapper = tv({
  base: 'absolute inset-y-0 right-0 flex items-center pr-3',
  variants: {
    clickable: {
      true: 'cursor-pointer',
      false: 'pointer-events-none',
    },
  },
})

export type InputProps = JSX.InputHTMLAttributes<HTMLInputElement> & {
  label?: string
  error?: string
  hint?: string
  fullWidth?: boolean
  icon?: JSX.Element
  rightIcon?: JSX.Element
  onRightIconClick?: () => void
}

export const Input: Component<InputProps> = props => {
  const [local, rest] = splitProps(props, [
    'label',
    'error',
    'hint',
    'fullWidth',
    'icon',
    'rightIcon',
    'onRightIconClick',
    'class',
  ])

  const inputWrapperClasses = inputWrapper({ fullWidth: local.fullWidth })
  const inputClasses = inputStyles({
    error: !!local.error,
    icon: !!local.icon,
    rightIcon: !!local.rightIcon,
    fullWidth: local.fullWidth,
    class: local.class,
  })

  return (
    <div class={local.fullWidth ? 'w-full' : ''}>
      <Show when={local.label}>
        <label class='mb-3 block text-sm font-semibold text-gray-700 dark:text-gray-200'>
          {local.label}
        </label>
      </Show>
      <div class={inputWrapperClasses}>
        <Show when={local.icon}>
          <div class={leftIconWrapper()}>
            <div class={iconWrapper()}>
              <span class='text-gray-500 dark:text-gray-400'>{local.icon}</span>
            </div>
          </div>
        </Show>
        <input class={inputClasses} {...rest} />
        <Show when={local.rightIcon}>
          <div
            class={rightIconWrapper({ clickable: !!local.onRightIconClick })}
            onClick={local.onRightIconClick}
          >
            <div class={iconWrapper()}>
              <span class='text-gray-500 dark:text-gray-400'>{local.rightIcon}</span>
            </div>
          </div>
        </Show>
      </div>
      <Show when={local.error || local.hint}>
        <p
          class={`mt-2 text-sm ${
            local.error ? 'text-red-600 dark:text-red-500' : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          {local.error || local.hint}
        </p>
      </Show>
    </div>
  )
}
