import type { JSX } from 'preact'
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
  className?: string
}

export function Badge({ variant, label, icon, className = '', rounded }: BadgeProps) {
  const badgeClasses = badge({
    variant,
    rounded,
    className: className as string,
  })

  return (
    <span className={badgeClasses}>
      {icon && <span className='mr-1 -ml-0.5'>{icon}</span>}
      {label}
    </span>
  )
}

export function getStatusBadgeVariant(status: string): VariantProps<typeof badge>['variant'] {
  switch (status) {
    case 'pending':
      return 'warning'
    case 'preparing':
      return 'secondary'
    case 'transferring':
      return 'primary'
    case 'completed':
      return 'success'
    case 'rejected':
      return 'danger'
    case 'failed':
      return 'danger'
    case 'integrity_error':
      return 'danger'
    case 'verifying':
      return 'info'
    default:
      return 'secondary'
  }
}
