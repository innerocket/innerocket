import { createSignal, createEffect, on, Show, Switch, Match, type Component } from 'solid-js'
import { X } from 'lucide-solid'
import { ZipPreview } from './ZipPreview'

interface FilePreviewProps {
  fileName: string
  fileType: string
  previewUrl: string | null
  onClose: () => void
}

export const FilePreview: Component<FilePreviewProps> = props => {
  const [isLoading, setIsLoading] = createSignal(true)
  const [error, setError] = createSignal<string | null>(null)
  const [actualFileType, setActualFileType] = createSignal(props.fileType)
  const [videoPlaybackAttempted, setVideoPlaybackAttempted] = createSignal(false)
  const [fileBlob, setFileBlob] = createSignal<Blob | null>(null)

  createEffect(
    on(
      () => props.previewUrl,
      previewUrl => {
        setIsLoading(true)
        setError(null)
        setVideoPlaybackAttempted(false)
        setFileBlob(null)

        if (previewUrl) {
          console.log(`FilePreview: Loading preview for ${props.fileName} (${props.fileType})`)

          fetch(previewUrl)
            .then(response => response.blob())
            .then(blob => {
              console.log(`Preview blob type: ${blob.type}, size: ${blob.size} bytes`)
              setFileBlob(blob)

              let detectedType = blob.type
              if (
                (detectedType === 'application/octet-stream' || !detectedType) &&
                props.fileName.toLowerCase().match(/\.(mp4|webm|ogg|mov|avi)$/)
              ) {
                const ext = props.fileName.split('.').pop()?.toLowerCase()
                if (ext === 'mp4') detectedType = 'video/mp4'
                else if (ext === 'webm') detectedType = 'video/webm'
                else if (ext === 'ogg') detectedType = 'video/ogg'
                else if (ext === 'mov') detectedType = 'video/quicktime'
                else if (ext === 'avi') detectedType = 'video/x-msvideo'
                console.log(`Detected video type from filename: ${detectedType}`)
              }

              if (props.fileType === 'application/zip' || props.fileName.endsWith('.zip')) {
                detectedType = 'application/zip'
              }

              if (detectedType && detectedType !== 'application/octet-stream') {
                setActualFileType(detectedType)
              }
              setIsLoading(false)
            })
            .catch(err => {
              console.error('Error fetching preview blob:', err)
              setError('Failed to load preview data')
              setIsLoading(false)
            })
        } else {
          setIsLoading(false)
        }
      }
    )
  )

  const handleVideoError = (e: Event) => {
    console.error('Video error:', e)
    if (!videoPlaybackAttempted()) {
      setVideoPlaybackAttempted(true)
      if (actualFileType() !== 'video/mp4') {
        console.log('Retrying video with video/mp4 type')
        setActualFileType('video/mp4')
      } else {
        setError('Unable to play this video. Try downloading it instead.')
      }
    } else {
      setError('Unable to play this video. Try downloading it instead.')
    }
  }

  return (
    <div class='fixed inset-0 z-50 flex items-center justify-center overflow-x-hidden overflow-y-auto bg-gray-900/75 p-4 backdrop-blur-sm dark:bg-gray-900/80'>
      <div class='relative flex max-h-[90vh] w-full max-w-4xl flex-col rounded-md bg-white dark:bg-gray-800'>
        <div class='flex items-center justify-between rounded-t-md border-b border-gray-200 p-3 sm:p-4 dark:border-gray-600'>
          <h3 class='truncate text-xl font-semibold text-gray-900 dark:text-white'>
            {props.fileName}
          </h3>
          <button
            onClick={props.onClose}
            type='button'
            class='ml-auto inline-flex items-center rounded-md bg-transparent p-1.5 text-sm text-gray-400 hover:bg-gray-200 hover:text-gray-900 dark:hover:bg-gray-600 dark:hover:text-white'
          >
            <X class='h-4 w-4' />
            <span class='sr-only'>Close</span>
          </button>
        </div>

        <div class='flex flex-1 items-center justify-center overflow-auto p-4 sm:p-6'>
          <Show when={isLoading()}>
            <div class='flex h-full items-center justify-center'>
              <div class='inline-block h-12 w-12 animate-spin rounded-lg border-4 border-solid border-current border-e-transparent align-[-0.125em] text-blue-600 motion-reduce:animate-[spin_1.5s_linear_infinite] dark:text-blue-500'></div>
            </div>
          </Show>

          <Show when={error() && !isLoading()}>
            <div class='p-8 text-center'>
              <p class='mb-2 text-red-500'>{error()}</p>
              <p class='text-sm text-gray-500 dark:text-gray-400'>
                Try downloading the file instead.
              </p>
            </div>
          </Show>

          <Show when={!isLoading() && !error()}>
            <Switch
              fallback={
                <div class='p-8 text-center'>
                  <div class='mb-4 inline-block rounded-md bg-gray-100 p-6 dark:bg-gray-700'>
                    <svg
                      xmlns='http://www.w3.org/2000/svg'
                      class='mx-auto h-16 w-16 text-gray-400 dark:text-gray-300'
                      fill='none'
                      viewBox='0 0 24 24'
                      stroke='currentColor'
                    >
                      <path
                        stroke-linecap='round'
                        stroke-linejoin='round'
                        stroke-width={2}
                        d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
                      />
                    </svg>
                  </div>
                  <p class='mb-2 text-gray-600 dark:text-gray-300'>
                    Preview not available for this file type.
                  </p>
                  <p class='text-sm text-gray-500 dark:text-gray-400'>
                    {actualFileType() || 'Unknown type'}
                  </p>
                </div>
              }
            >
              <Match when={actualFileType().startsWith('image/')}>
                <img
                  src={props.previewUrl!}
                  alt={props.fileName}
                  class='max-h-full max-w-full object-contain'
                  onError={() => setError('Failed to load image')}
                />
              </Match>
              <Match when={actualFileType().startsWith('video/')}>
                <video
                  src={props.previewUrl!}
                  controls
                  class='max-h-full max-w-full'
                  onError={handleVideoError}
                />
              </Match>
              <Match when={actualFileType().startsWith('audio/')}>
                <audio
                  src={props.previewUrl!}
                  controls
                  class='w-full'
                  onError={() => setError('Failed to load audio')}
                />
              </Match>
              <Match when={actualFileType() === 'application/pdf'}>
                <iframe
                  src={props.previewUrl!}
                  class='h-full w-full'
                  style={{ 'min-height': '70vh' }}
                  onError={() => setError('Failed to load PDF')}
                />
              </Match>
              <Match when={actualFileType() === 'application/zip' && fileBlob()}>
                <ZipPreview file={fileBlob()!} />
              </Match>
            </Switch>
          </Show>
        </div>
      </div>
    </div>
  )
}
