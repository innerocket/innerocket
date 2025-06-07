import type { JSX } from 'preact';
import { tv, type VariantProps } from 'tailwind-variants';

const badge = tv({
  base: 'inline-flex items-center text-xs font-medium px-2.5 py-0.5',
  variants: {
    variant: {
      primary: 'bg-blue-100 text-blue-800',
      secondary: 'bg-gray-100 text-gray-800',
      success: 'bg-green-100 text-green-800',
      danger: 'bg-red-100 text-red-800',
      warning: 'bg-yellow-100 text-yellow-800',
      info: 'bg-indigo-100 text-indigo-800',
    },
    rounded: {
      true: 'rounded-full',
      false: 'rounded',
    },
  },
  defaultVariants: {
    variant: 'primary',
    rounded: false,
  },
});

export type BadgeProps = VariantProps<typeof badge> & {
  label: string;
  icon?: JSX.Element;
  className?: string;
};

export function Badge({
  variant,
  label,
  icon,
  className = '',
  rounded,
}: BadgeProps) {
  const badgeClasses = badge({
    variant,
    rounded,
    className: className as string,
  });

  return (
    <span className={badgeClasses}>
      {icon && <span className="mr-1 -ml-0.5">{icon}</span>}
      {label}
    </span>
  );
}

export function getStatusBadgeVariant(
  status: string
): VariantProps<typeof badge>['variant'] {
  switch (status) {
    case 'pending':
      return 'warning';
    case 'transferring':
      return 'primary';
    case 'completed':
      return 'success';
    case 'failed':
      return 'danger';
    case 'integrity_error':
      return 'danger';
    default:
      return 'secondary';
  }
}
