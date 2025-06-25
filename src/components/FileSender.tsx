import { useRef, useState } from 'preact/hooks'
import { Users } from 'lucide-preact'
import { Button } from './ui'

interface FileSenderProps {
  onSendFileToAll: (file: File) => void | Promise<void>
  connectedPeersCount?: number
}

export function FileSender({ onSendFileToAll, connectedPeersCount = 0 }: FileSenderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isDragging, setIsDragging] = useState(false)

  const handleFileChange = (e: Event) => {
    const input = e.target as HTMLInputElement
    if (input.files && input.files.length > 0) {
      setSelectedFiles(Array.from(input.files))
    }
  }

  const handleSendFileToAll = async () => {
    if (selectedFiles.length > 0 && onSendFileToAll) {
      for (const file of selectedFiles) {
        await onSendFileToAll(file)
      }
      setSelectedFiles([])

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
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

  return (
    <div className='w-full h-full flex flex-col'>
      <div className='relative flex-1 flex flex-col'>
        <div className='flex flex-col gap-4 h-full'>
          <input
            ref={fileInputRef}
            type='file'
            multiple
            onChange={handleFileChange}
            className='hidden'
            id='file-input'
          />
          <label
            htmlFor='file-input'
            className={`w-full flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 p-6 sm:p-8 ${
              isDragging
                ? 'border-blue-600 bg-blue-100 dark:border-blue-300 dark:bg-blue-800/40'
                : 'border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-800/30'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className='flex flex-col items-center justify-center flex-1 w-full'>
              {selectedFiles.length > 0 ? (
                <div className='text-center w-full'>
                  {selectedFiles.length === 1 ? (
                    <>
                      <p className='font-medium text-gray-600 dark:text-gray-400 truncate max-w-full'>
                        {selectedFiles[0].name}
                      </p>
                      <p className='text-sm text-gray-500 mt-1'>
                        {formatFileSize(selectedFiles[0].size)}
                        <span className='mx-1'>・</span>
                        {selectedFiles[0].type || 'Unknown type'}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className='font-medium text-gray-600 dark:text-gray-400'>
                        {selectedFiles.length} files selected
                      </p>
                      <p className='text-sm text-gray-500 mt-1'>
                        Total: {formatFileSize(selectedFiles.reduce((t, f) => t + f.size, 0))}
                      </p>
                    </>
                  )}
                </div>
              ) : (
                <div className='text-center'>
                  <p className='font-medium text-gray-600 dark:text-gray-400'>
                    {isDragging ? 'Drop files here' : 'Select files to send'}
                  </p>
                  <p className='text-sm text-gray-500 mt-1'>Click here or drag and drop files</p>
                </div>
              )}
            </div>
          </label>

          <div className='flex flex-col gap-3 w-full'>
            <Button
              onClick={handleSendFileToAll}
              disabled={selectedFiles.length === 0}
              variant={selectedFiles.length > 0 ? 'primary' : 'secondary'}
              icon={<Users size={18} />}
              className='w-full'
            >
              Send to All ({connectedPeersCount})
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
