import type { JSX } from 'preact';

type BadgeVariant =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'danger'
  | 'warning'
  | 'info';

export interface BadgeProps {
  variant?: BadgeVariant;
  label: string;
  icon?: JSX.Element;
  className?: string;
  rounded?: boolean;
}

export function Badge({
  variant = 'primary',
  label,
  icon,
  className = '',
  rounded = false,
}: BadgeProps) {
  const variantStyles = {
    primary: 'bg-blue-100 text-blue-800',
    secondary: 'bg-gray-100 text-gray-800',
    success: 'bg-green-100 text-green-800',
    danger: 'bg-red-100 text-red-800',
    warning: 'bg-yellow-100 text-yellow-800',
    info: 'bg-indigo-100 text-indigo-800',
  };

  const baseStyles = 'inline-flex items-center text-xs font-medium';
  const paddingStyles = 'px-2.5 py-0.5';
  const roundedStyles = rounded ? 'rounded-full' : 'rounded';

  const badgeClasses = `${baseStyles} ${paddingStyles} ${roundedStyles} ${variantStyles[variant]} ${className}`;

  return (
    <span className={badgeClasses}>
      {icon && <span className="mr-1 -ml-0.5">{icon}</span>}
      {label}
    </span>
  );
}

export function getStatusBadgeVariant(status: string): BadgeVariant {
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
