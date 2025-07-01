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
          <CheckCircle class='h-5 w-5' />
        </Match>
        <Match when={props.type === 'error'}>
          <XCircle class='h-5 w-5' />
        </Match>
        <Match when={props.type === 'warning'}>
          <AlertTriangle class='h-5 w-5' />
        </Match>
        <Match when={props.type === 'info'}>
          <Info class='h-5 w-5' />
        </Match>
      </Switch>
    )
  }

  return (
    <div
      class={`fixed top-4 right-4 z-50 max-w-[calc(100dvw-2rem)] transition-opacity duration-300 ${
        isVisible() ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div class={notificationStyles({ type: props.type })} role='alert'>
        <div class='mr-4 inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-white/50 dark:bg-gray-800/50'>
          {getIcon()}
        </div>
        <div class='flex-1 text-sm font-medium'>{props.message}</div>
        <button
          type='button'
          onClick={() => {
            setIsVisible(false)
            setTimeout(props.onClose, 300)
          }}
          class='-mx-1.5 -my-1.5 ml-4 inline-flex h-8 w-8 items-center justify-center rounded-md p-2 transition-colors duration-200 hover:bg-white/50 focus:ring-2 dark:hover:bg-gray-800/50'
          aria-label='Close'
        >
          <span class='sr-only'>Close</span>
          <X class='h-4 w-4' />
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
