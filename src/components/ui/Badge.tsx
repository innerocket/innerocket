import type { JSX } from 'solid-js'
import { mergeProps } from 'solid-js'
import { tv, type VariantProps } from 'tailwind-variants'

const badge = tv({
  base: 'inline-flex items-center text-xs font-medium px-2.5 py-0.5',
  variants: {
    variant: {
      primary: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      secondary: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      success: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      danger: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
      warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      info: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      light: 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      dark: 'bg-gray-700 text-gray-300 dark:bg-gray-700 dark:text-gray-300',
    },
    rounded: {
      true: 'rounded-lg',
      false: 'rounded-md',
    },
  },
  defaultVariants: {
    variant: 'primary',
    rounded: false,
  },
})

export type BadgeProps = VariantProps<typeof badge> & {
  label: string
  icon?: JSX.Element
  class?: string
}

export function Badge(_props: BadgeProps) {
  const props = mergeProps({ class: '' }, _props)
  const badgeClasses = badge({
    variant: props.variant,
    rounded: props.rounded,
    class: props.class as string,
  })

  return (
    <span class={badgeClasses}>
      {props.icon && <span class='mr-1 -ml-0.5'>{props.icon}</span>}
      {props.label}
    </span>
  )
}
