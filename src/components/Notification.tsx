import { useEffect, useState } from 'preact/hooks'
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react'
import { tv } from 'tailwind-variants'

export type NotificationType = 'success' | 'error' | 'info' | 'warning'

interface NotificationProps {
  message: string
  type: NotificationType
  duration?: number
  onClose: () => void
}

const notificationStyles = tv({
  base: 'flex items-center p-3 sm:p-4 mb-4 border-2 rounded-lg backdrop-blur-sm',
  variants: {
    type: {
      success:
        'text-green-800 bg-green-50/90 border-green-300 dark:border-green-600 dark:bg-green-900/30 dark:text-green-300',
      error:
        'text-red-800 bg-red-50/90 border-red-300 dark:border-red-600 dark:bg-red-900/30 dark:text-red-300',
      warning:
        'text-amber-800 bg-amber-50/90 border-amber-300 dark:border-amber-600 dark:bg-amber-900/30 dark:text-amber-300',
      info: 'text-blue-800 bg-blue-50/90 border-blue-300 dark:border-blue-600 dark:bg-blue-900/30 dark:text-blue-300',
    },
  },
})

export function Notification({ message, type, duration = 5000, onClose }: NotificationProps) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false)
      setTimeout(onClose, 300) // Wait for animation to complete
    }, duration)

    return () => {
      clearTimeout(timer)
    }
  }, [duration, onClose])

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className='w-5 h-5' />
      case 'error':
        return <XCircle className='w-5 h-5' />
      case 'warning':
        return <AlertTriangle className='w-5 h-5' />
      case 'info':
      default:
        return <Info className='w-5 h-5' />
    }
  }

  return (
    <div
      className={`fixed top-4 right-4 z-50 transition-opacity duration-300 max-w-[calc(100dvw-2rem)] ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className={notificationStyles({ type })} role='alert'>
        <div className='inline-flex items-center justify-center flex-shrink-0 w-10 h-10 mr-4 rounded-lg bg-white/50 dark:bg-gray-800/50'>
          {getIcon()}
        </div>
        <div className='text-sm font-medium flex-1'>{message}</div>
        <button
          type='button'
          onClick={() => {
            setIsVisible(false)
            setTimeout(onClose, 300)
          }}
          className='ml-4 -mx-1.5 -my-1.5 rounded-md focus:ring-2 p-2 inline-flex items-center justify-center h-8 w-8 hover:bg-white/50 dark:hover:bg-gray-800/50 transition-colors duration-200'
          aria-label='Close'
        >
          <span className='sr-only'>Close</span>
          <X className='w-4 h-4' />
        </button>
      </div>
    </div>
  )
}

export interface NotificationItem {
  id: string
  message: string
  type: NotificationType
}

interface NotificationContainerProps {
  notifications: NotificationItem[]
  onRemove: (id: string) => void
}

export function NotificationContainer({ notifications, onRemove }: NotificationContainerProps) {
  return (
    <>
      {notifications.map(notification => (
        <Notification
          key={notification.id}
          message={notification.message}
          type={notification.type}
          onClose={() => onRemove(notification.id)}
        />
      ))}
    </>
  )
}
