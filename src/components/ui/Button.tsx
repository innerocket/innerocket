import { type JSX, Show, splitProps, type Component } from 'solid-js'
import { Loader } from 'lucide-solid'
import { tv, type VariantProps } from 'tailwind-variants'

const button = tv({
  base: 'inline-flex items-center justify-center font-medium rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 active:scale-95',
  variants: {
    variant: {
      primary:
        'text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 border-2 border-blue-600 hover:border-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-500 dark:border-blue-600',
      secondary:
        'text-gray-700 bg-white border-2 border-gray-300 hover:bg-gray-50 hover:border-gray-400 focus:ring-gray-500 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:border-gray-500 dark:focus:ring-gray-400',
      success:
        'text-white bg-green-600 hover:bg-green-700 focus:ring-green-500 border-2 border-green-600 hover:border-green-700 dark:bg-green-600 dark:hover:bg-green-700 dark:focus:ring-green-500',
      danger:
        'text-white bg-red-600 hover:bg-red-700 focus:ring-red-500 border-2 border-red-600 hover:border-red-700 dark:bg-red-600 dark:hover:bg-red-700 dark:focus:ring-red-500',
      warning:
        'text-white bg-amber-500 hover:bg-amber-600 focus:ring-amber-500 border-2 border-amber-500 hover:border-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700 dark:focus:ring-amber-500',
      info: 'text-white bg-cyan-600 hover:bg-cyan-700 focus:ring-cyan-500 border-2 border-cyan-600 hover:border-cyan-700 dark:bg-cyan-600 dark:hover:bg-cyan-700 dark:focus:ring-cyan-500',
      light:
        'text-gray-600 bg-gray-100 border-2 border-gray-200 hover:bg-gray-200 hover:border-gray-300 focus:ring-gray-500 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600 dark:hover:border-gray-500',
      dark: 'text-white bg-gray-800 hover:bg-gray-900 focus:ring-gray-600 border-2 border-gray-800 hover:border-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600 dark:focus:ring-gray-500',
      ghost:
        'text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus:ring-gray-500 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200',
    },
    size: {
      xs: 'px-2.5 py-1.5 text-xs',
      sm: 'px-3 py-2 text-sm',
      md: 'px-4 py-2.5 text-sm',
      lg: 'px-5 py-3 text-base',
      xl: 'px-6 py-3.5 text-base',
    },
    fullWidth: {
      true: 'w-full',
    },
    disabled: {
      true: 'opacity-50 cursor-not-allowed pointer-events-none hover:bg-current focus:ring-0',
      false: '',
    },
  },
  defaultVariants: {
    variant: 'primary',
    size: 'md',
    fullWidth: false,
    disabled: false,
  },
})

export type ButtonProps = JSX.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof button> & {
    icon?: JSX.Element
    isLoading?: boolean
  }

export const Button: Component<ButtonProps> = props => {
  const [local, rest] = splitProps(props, [
    'variant',
    'size',
    'icon',
    'fullWidth',
    'isLoading',
    'disabled',
    'class',
    'children',
  ])

  // Explicitly compute the disabled state to ensure reactivity
  const isDisabled = () => local.disabled || local.isLoading

  return (
    <button
      class={button({
        variant: local.variant,
        size: local.size,
        fullWidth: local.fullWidth,
        disabled: isDisabled(),
        class: local.class,
      })}
      disabled={isDisabled()}
      type='button'
      {...rest}
    >
      <Show when={local.isLoading}>
        <Loader class='mr-3 inline h-4 w-4 animate-spin text-current' />
      </Show>
      <Show when={!local.isLoading && local.icon}>
        <span class='mr-2'>{local.icon}</span>
      </Show>
      {local.children}
    </button>
  )
}
