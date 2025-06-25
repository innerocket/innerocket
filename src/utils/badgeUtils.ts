// Utility functions for badge variants

// Define the badge variant type
export type BadgeVariant =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'danger'
  | 'warning'
  | 'info'
  | 'light'
  | 'dark'

export function getStatusBadgeVariant(status: string): BadgeVariant {
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
