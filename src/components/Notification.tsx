import { createSignal, createEffect, onCleanup, For, Switch, Match, type Component } from 'solid-js'
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-solid'
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

export const Notification: Component<NotificationProps> = props => {
  const [isVisible, setIsVisible] = createSignal(true)

  createEffect(() => {
    const duration = props.duration ?? 5000
    const timer = setTimeout(() => {
      setIsVisible(false)
      setTimeout(props.onClose, 300) // Wait for animation to complete
    }, duration)

    onCleanup(() => {
      clearTimeout(timer)
    })
  })

  const getIcon = () => {
    return (
      <Switch>
        <Match when={props.type === 'success'}>
          <CheckCircle class='w-5 h-5' />
        </Match>
        <Match when={props.type === 'error'}>
          <XCircle class='w-5 h-5' />
        </Match>
        <Match when={props.type === 'warning'}>
          <AlertTriangle class='w-5 h-5' />
        </Match>
        <Match when={props.type === 'info'}>
          <Info class='w-5 h-5' />
        </Match>
      </Switch>
    )
  }

  return (
    <div
      class={`fixed top-4 right-4 z-50 transition-opacity duration-300 max-w-[calc(100dvw-2rem)] ${
        isVisible() ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div class={notificationStyles({ type: props.type })} role='alert'>
        <div class='inline-flex items-center justify-center flex-shrink-0 w-10 h-10 mr-4 rounded-lg bg-white/50 dark:bg-gray-800/50'>
          {getIcon()}
        </div>
        <div class='text-sm font-medium flex-1'>{props.message}</div>
        <button
          type='button'
          onClick={() => {
            setIsVisible(false)
            setTimeout(props.onClose, 300)
          }}
          class='ml-4 -mx-1.5 -my-1.5 rounded-md focus:ring-2 p-2 inline-flex items-center justify-center h-8 w-8 hover:bg-white/50 dark:hover:bg-gray-800/50 transition-colors duration-200'
          aria-label='Close'
        >
          <span class='sr-only'>Close</span>
          <X class='w-4 h-4' />
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

export const NotificationContainer: Component<NotificationContainerProps> = props => {
  return (
    <For each={props.notifications}>
      {notification => (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => props.onRemove(notification.id)}
        />
      )}
    </For>
  )
}
