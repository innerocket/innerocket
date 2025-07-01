import { createSignal, createEffect, on, Show, type Component } from 'solid-js'

interface TextPreviewProps {
  file: Blob
}

export const TextPreview: Component<TextPreviewProps> = props => {
  const [textContent, setTextContent] = createSignal('')
  const [isLoading, setIsLoading] = createSignal(true)
  const [error, setError] = createSignal<string | null>(null)

  createEffect(
    on(
      () => props.file,
      file => {
        setIsLoading(true)
        setError(null)
        const reader = new FileReader()
        reader.onload = () => {
          setTextContent(reader.result as string)
          setIsLoading(false)
        }
        reader.onerror = () => {
          setError('Failed to read text file.')
          setIsLoading(false)
        }
        reader.readAsText(file)
      }
    )
  )

  return (
    <div class='h-full w-full overflow-auto bg-gray-50 p-4 dark:bg-gray-900'>
      <Show when={isLoading()}>
        <div class='flex h-full items-center justify-center'>
          <div class='text-gray-500'>Loading...</div>
        </div>
      </Show>
      <Show when={error()}>
        <div class='flex h-full items-center justify-center'>
          <div class='text-red-500'>{error()}</div>
        </div>
      </Show>
      <Show when={!isLoading() && !error()}>
        <pre class='whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200'>
          {textContent()}
        </pre>
      </Show>
    </div>
  )
}