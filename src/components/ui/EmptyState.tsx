import { type JSX, Show, type ParentProps, type Component } from 'solid-js'

interface EmptyStateProps extends ParentProps {
  icon: JSX.Element
  title: string
  subtitle?: string
}

export const EmptyState: Component<EmptyStateProps> = props => {
  return (
    <div class='rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-4 text-center text-gray-600 sm:p-6 dark:border-gray-600 dark:bg-gray-800/50 dark:text-gray-400'>
      <div class='flex flex-col items-center space-y-3'>
        <div class='flex h-12 w-12 items-center justify-center rounded-full bg-gray-300 dark:bg-gray-600'>
          {props.icon}
        </div>
        <div>
          <p class='font-medium'>{props.title}</p>
          <Show when={props.subtitle}>
            <p class='mt-1 text-sm text-gray-500 dark:text-gray-500'>{props.subtitle}</p>
          </Show>
        </div>
        {props.children}
      </div>
    </div>
  )
}
