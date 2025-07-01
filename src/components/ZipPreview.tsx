import { createSignal, onMount, type Component } from 'solid-js'
import JSZip from 'jszip'
import { For, Show } from 'solid-js'
import { File, Folder } from 'lucide-solid'

interface ZipPreviewProps {
  file: Blob
}

const MAX_ZIP_SIZE = 100 * 1024 * 1024 // 100MB

export const ZipPreview: Component<ZipPreviewProps> = props => {
  const [zipFiles, setZipFiles] = createSignal<{ name: string; type: 'file' | 'folder' }[]>([])
  const [error, setError] = createSignal<string | null>(null)
  const [isLoading, setIsLoading] = createSignal(true)

  onMount(async () => {
    if (props.file.size > MAX_ZIP_SIZE) {
      setError('File is too large to preview.')
      setIsLoading(false)
      return
    }

    try {
      const zip = await JSZip.loadAsync(props.file)
      const files = Object.values(zip.files).map(file => ({
        name: file.name,
        type: file.dir ? ('folder' as const) : ('file' as const),
      }))
      setZipFiles(files)
    } catch (e) {
      console.error('Error reading zip file:', e)
      setError('Could not read the contents of the zip file.')
    } finally {
      setIsLoading(false)
    }
  })

  return (
    <div class='p-4 bg-gray-50 dark:bg-gray-700 rounded-md h-full overflow-auto'>
      <Show when={isLoading()}>
        <div class='flex items-center justify-center h-full'>
          <div class='inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-e-transparent align-[-0.125em] text-blue-600 motion-reduce:animate-[spin_1.5s_linear_infinite] dark:text-blue-500'></div>
        </div>
      </Show>

      <Show when={error()}>
        <div class='text-center p-8'>
          <p class='text-red-500 mb-2'>{error()}</p>
          <p class='text-sm text-gray-500 dark:text-gray-400'>Try downloading the file instead.</p>
        </div>
      </Show>

      <Show when={!isLoading() && !error()}>
        <ul class='space-y-2'>
          <For each={zipFiles()}>
            {item => (
              <li class='flex items-center text-sm text-gray-800 dark:text-gray-200'>
                {item.type === 'folder' ? (
                  <Folder class='w-4 h-4 mr-2 text-yellow-500' />
                ) : (
                  <File class='w-4 h-4 mr-2 text-gray-400' />
                )}
                <span>{item.name}</span>
              </li>
            )}
          </For>
        </ul>
      </Show>
    </div>
  )
}
