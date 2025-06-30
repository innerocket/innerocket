import { type JSX, Show, type ParentProps, type Component } from 'solid-js'

interface EmptyStateProps extends ParentProps {
  icon: JSX.Element
  title: string
  subtitle?: string
}

export const EmptyState: Component<EmptyStateProps> = props => {
  return (
    <div class='p-4 sm:p-6 text-center text-gray-600 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 dark:bg-gray-800/50 dark:border-gray-600 dark:text-gray-400'>
      <div class='flex flex-col items-center space-y-3'>
        <div class='w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center dark:bg-gray-600'>
          {props.icon}
        </div>
        <div>
          <p class='font-medium'>{props.title}</p>
          <Show when={props.subtitle}>
            <p class='text-sm text-gray-500 dark:text-gray-500 mt-1'>{props.subtitle}</p>
          </Show>
        </div>
        {props.children}
      </div>
    </div>
  )
}
