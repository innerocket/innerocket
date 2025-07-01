import { createSignal, Show, type Component } from 'solid-js'
import { Users } from 'lucide-solid'
import { Button } from './ui'

interface FileSenderProps {
  onSendFileToAll: (file: File) => void | Promise<void>
  connectedPeersCount?: number
}

export const FileSender: Component<FileSenderProps> = props => {
  let fileInputRef: HTMLInputElement | undefined
  const [selectedFiles, setSelectedFiles] = createSignal<File[]>([])
  const [isDragging, setIsDragging] = createSignal(false)

  const handleFileChange = (e: Event) => {
    const input = e.target as HTMLInputElement
    if (input.files && input.files.length > 0) {
      setSelectedFiles(Array.from(input.files))
    }
  }

  const handleSendFileToAll = async () => {
    if (selectedFiles().length > 0 && props.onSendFileToAll) {
      for (const file of selectedFiles()) {
        await props.onSendFileToAll(file)
      }
      setSelectedFiles([])

      if (fileInputRef) {
        fileInputRef.value = ''
      }
    }
  }

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      setSelectedFiles(Array.from(e.dataTransfer.files))
    }
  }

  const totalSize = () => selectedFiles().reduce((t, f) => t + f.size, 0)

  return (
    <div class='flex h-full w-full flex-col'>
      <div class='relative flex flex-1 flex-col'>
        <div class='flex h-full flex-col gap-4'>
          <input
            ref={fileInputRef}
            type='file'
            multiple
            onChange={handleFileChange}
            class='hidden'
            id='file-input'
          />
          <label
            for='file-input'
            class={`flex w-full flex-1 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 transition-all duration-200 sm:p-8 ${
              isDragging()
                ? 'border-blue-600 bg-blue-100 dark:border-blue-300 dark:bg-blue-800/40'
                : 'border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-800/30'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div class='flex w-full flex-1 flex-col items-center justify-center'>
              <Show
                when={selectedFiles().length > 0}
                fallback={
                  <div class='text-center'>
                    <p class='font-medium text-gray-600 dark:text-gray-400'>
                      {isDragging() ? 'Drop files here' : 'Select files to send'}
                    </p>
                    <p class='mt-1 text-sm text-gray-500'>Click here or drag and drop files</p>
                  </div>
                }
              >
                <div class='w-full text-center'>
                  <Show
                    when={selectedFiles().length === 1}
                    fallback={
                      <>
                        <p class='font-medium text-gray-600 dark:text-gray-400'>
                          {selectedFiles().length} files selected
                        </p>
                        <p class='mt-1 text-sm text-gray-500'>
                          Total: {formatFileSize(totalSize())}
                        </p>
                      </>
                    }
                  >
                    <p class='max-w-full truncate font-medium text-gray-600 dark:text-gray-400'>
                      {selectedFiles()[0].name}
                    </p>
                    <p class='mt-1 text-sm text-gray-500'>
                      {formatFileSize(selectedFiles()[0].size)}
                      <span class='mx-1'>・</span>
                      {selectedFiles()[0].type || 'Unknown type'}
                    </p>
                  </Show>
                </div>
              </Show>
            </div>
          </label>

          <div class='flex w-full flex-col gap-3'>
            <Button
              onClick={handleSendFileToAll}
              disabled={selectedFiles().length === 0}
              variant={selectedFiles().length > 0 ? 'primary' : 'secondary'}
              icon={<Users class='h-4 w-4' />}
              class='w-full'
            >
              Send to All ({props.connectedPeersCount ?? 0})
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
