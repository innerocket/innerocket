import { type JSX, Show, splitProps, type Component } from 'solid-js'
import { Loader } from 'lucide-solid'
import { tv, type VariantProps } from 'tailwind-variants'

const iconButton = tv({
  base: 'inline-flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 active:scale-95',
  variants: {
    variant: {
      primary:
        'text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 border border-blue-600 hover:border-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-500',
      secondary:
        'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 hover:border-gray-400 focus:ring-gray-500 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:border-gray-500',
      success:
        'text-white bg-green-600 hover:bg-green-700 focus:ring-green-500 border border-green-600 hover:border-green-700 dark:bg-green-600 dark:hover:bg-green-700 dark:focus:ring-green-500',
      danger:
        'text-white bg-red-600 hover:bg-red-700 focus:ring-red-500 border border-red-600 hover:border-red-700 dark:bg-red-600 dark:hover:bg-red-700 dark:focus:ring-red-500',
      warning:
        'text-white bg-amber-500 hover:bg-amber-600 focus:ring-amber-500 border border-amber-500 hover:border-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700 dark:focus:ring-amber-500',
      info: 'text-white bg-cyan-600 hover:bg-cyan-700 focus:ring-cyan-500 border border-cyan-600 hover:border-cyan-700 dark:bg-cyan-600 dark:hover:bg-cyan-700 dark:focus:ring-cyan-500',
      light:
        'text-gray-600 bg-gray-100 border border-gray-200 hover:bg-gray-200 hover:border-gray-300 focus:ring-gray-500 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600 dark:hover:border-gray-500',
      dark: 'text-white bg-gray-800 hover:bg-gray-900 focus:ring-gray-600 border border-gray-800 hover:border-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600 dark:focus:ring-gray-500',
      ghost:
        'text-gray-500 bg-transparent hover:bg-gray-100 hover:text-gray-700 focus:ring-gray-500 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200 dark:focus:ring-gray-400',
    },
    size: {
      xs: 'p-1.5 w-7 h-7',
      sm: 'p-2 w-8 h-8',
      md: 'p-2.5 w-10 h-10',
      lg: 'p-3 w-12 h-12',
      xl: 'p-3.5 w-14 h-14',
    },
    rounded: {
      true: 'rounded-lg',
      false: 'rounded-md',
    },
    disabled: {
      true: 'opacity-50 cursor-not-allowed pointer-events-none',
    },
  },
  defaultVariants: {
    variant: 'ghost',
    size: 'md',
    rounded: false,
  },
})

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
})

export type IconButtonProps = JSX.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof iconButton> & {
    icon: JSX.Element
    isLoading?: boolean
    ariaLabel: string
  }

export const IconButton: Component<IconButtonProps> = props => {
  const [local, rest] = splitProps(props, [
    'variant',
    'size',
    'icon',
    'disabled',
    'isLoading',
    'ariaLabel',
    'rounded',
    'class',
  ])

  const buttonClasses = iconButton({
    variant: local.variant,
    size: local.size,
    rounded: local.rounded,
    disabled: local.disabled || local.isLoading,
    class: local.class,
  })

  const iconClasses = iconSize({ size: local.size })

  return (
    <button
      class={buttonClasses}
      disabled={local.disabled || local.isLoading}
      aria-label={local.ariaLabel}
      type='button'
      {...rest}
    >
      <Show when={local.isLoading} fallback={<span class={iconClasses}>{local.icon}</span>}>
        <Loader class={`animate-spin ${iconClasses}`} />
      </Show>
    </button>
  )
}
