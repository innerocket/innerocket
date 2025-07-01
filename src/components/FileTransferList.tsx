import type { FileTransfer } from '../types'
import { ChevronRight, ChevronLeft, Eye, Download, FolderOpen } from 'lucide-solid'
import { Badge, Button, Input, getStatusBadgeVariant, EmptyState } from './ui'
import { usePeer } from '../contexts/PeerContext'
import {
  createSignal,
  createMemo,
  createEffect,
  For,
  Show,
  type Component,
  Switch,
  Match,
} from 'solid-js'
import { getFileTypeConfig } from '../utils/fileTypeUtils.tsx'

interface FileTransferListProps {
  transfers: FileTransfer[]
  onDownload: (fileId: string) => void
  onPreview: (fileId: string) => void
}

export const FileTransferList: Component<FileTransferListProps> = props => {
  const { peerId } = usePeer()
  const [searchQuery, setSearchQuery] = createSignal('')
  let tableContainerRef: HTMLDivElement | undefined
  const [isDragging, setIsDragging] = createSignal(false)
  const [dragStart, setDragStart] = createSignal({ x: 0, scrollLeft: 0 })
  let lastCallTime = 0

  createEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging() || !tableContainerRef) return

      e.preventDefault()

      const now = Date.now()
      if (now - lastCallTime < 16) return
      lastCallTime = now

      const x = e.pageX
      const walkX = (x - dragStart().x) * 2
      tableContainerRef.scrollLeft = dragStart().scrollLeft - walkX
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    if (isDragging()) {
      document.addEventListener('mousemove', handleMouseMove, { passive: false })
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  })

  const handleMouseDown = (e: MouseEvent) => {
    if (!tableContainerRef) return
    setIsDragging(true)
    setDragStart({
      x: e.pageX,
      scrollLeft: tableContainerRef.scrollLeft,
    })
  }

  const sortedTransfers = createMemo(() =>
    [...props.transfers].sort((a, b) => {
      if (a.status === 'completed' && b.status !== 'completed') return -1
      if (a.status !== 'completed' && b.status === 'completed') return 1
      return b.createdAt - a.createdAt
    })
  )

  const filteredTransfers = createMemo(() =>
    sortedTransfers().filter(transfer => {
      if (!searchQuery().trim()) return true
      const query = searchQuery().toLowerCase()
      const dateString = new Date(transfer.createdAt).toLocaleString().toLowerCase()
      return transfer.fileName.toLowerCase().includes(query) || dateString.includes(query)
    })
  )

  return (
    <Show
      when={props.transfers.length > 0}
      fallback={
        <EmptyState
          icon={<FolderOpen class='h-6 w-6 text-gray-500 dark:text-gray-400' />}
          title='No file transfers yet'
          subtitle='Connect to peers and start sharing files'
        />
      }
    >
      <div>
        <Input
          type='text'
          placeholder='Search by file name or date'
          value={searchQuery()}
          onInput={e => setSearchQuery(e.currentTarget.value)}
          class='mb-4'
          fullWidth
        />
        <div
          ref={tableContainerRef}
          class={`relative overflow-x-auto overflow-y-visible rounded-lg border-2 border-gray-200 select-none dark:border-gray-700 ${
            isDragging() ? 'cursor-grabbing' : 'cursor-grab'
          }`}
          style={{ 'overscroll-behavior-x': 'contain' }}
          onMouseDown={handleMouseDown}
        >
          <table class='w-full text-left text-sm text-gray-600 dark:text-gray-300'>
            <thead class='border-b-2 border-gray-200 bg-gray-100 text-xs text-gray-700 uppercase dark:border-gray-700 dark:bg-gray-600 dark:text-gray-300'>
              <tr>
                <th scope='col' class='px-6 py-4 font-semibold'>
                  File
                </th>
                <th scope='col' class='px-6 py-4 font-semibold'>
                  Size
                </th>
                <th scope='col' class='px-6 py-4 font-semibold'>
                  Direction
                </th>
                <th scope='col' class='px-6 py-4 font-semibold'>
                  Status
                </th>
                <th scope='col' class='px-6 py-4 font-semibold'>
                  Progress
                </th>
                <th scope='col' class='px-6 py-4 font-semibold'>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody class='divide-y-2 divide-gray-100 dark:divide-gray-600'>
              <For each={filteredTransfers()}>
                {transfer => {
                  const fileTypeConfig = getFileTypeConfig(transfer.fileName)
                  return (
                    <tr class='bg-white transition-all duration-200 dark:bg-gray-800'>
                      <td class='px-6 py-4'>
                        <div class='flex items-center space-x-3'>
                          <div
                            class={`flex h-10 w-10 items-center justify-center rounded-md ${fileTypeConfig.backgroundColor}`}
                          >
                            <div class={`h-6 w-6 ${fileTypeConfig.textColor}`}>
                              {fileTypeConfig.icon()}
                            </div>
                          </div>
                          <div class='min-w-0 flex-1'>
                            <div class='max-w-xs truncate text-sm font-medium text-gray-900 dark:text-white'>
                              {transfer.fileName}
                            </div>
                            <div class='text-xs text-gray-500 dark:text-gray-400'>
                              {transfer.fileType || 'Unknown type'}
                            </div>
                            <div class='text-xs text-gray-400 dark:text-gray-500'>
                              {new Date(transfer.createdAt).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td class='px-6 py-4 whitespace-nowrap'>
                        <div class='text-sm text-gray-900 dark:text-white'>
                          {formatFileSize(transfer.fileSize)}
                        </div>
                        <Show when={transfer.chunkSize && transfer.status === 'transferring'}>
                          <div class='text-xs text-gray-500 dark:text-gray-400'>
                            Chunk: {formatFileSize(transfer.chunkSize!)}
                          </div>
                        </Show>
                      </td>
                      <td class='px-6 py-4 whitespace-nowrap'>
                        <Switch
                          fallback={<span class='text-sm text-gray-500 dark:text-gray-400'>-</span>}
                        >
                          <Match when={transfer.sender === 'unknown'}>
                            <span class='text-sm text-gray-500 dark:text-gray-400'>Received</span>
                          </Match>
                          <Match when={transfer.sender !== transfer.receiver}>
                            <Show
                              when={transfer.sender === peerId()}
                              fallback={
                                <span class='flex items-center text-green-600 dark:text-green-500'>
                                  <ChevronLeft class='mr-1 h-4 w-4' />
                                  Received
                                </span>
                              }
                            >
                              <span class='flex items-center text-blue-600 dark:text-blue-500'>
                                <ChevronRight class='mr-1 h-4 w-4' />
                                Sent
                              </span>
                            </Show>
                          </Match>
                        </Switch>
                      </td>
                      <td class='px-6 py-4 whitespace-nowrap'>
                        <Badge
                          variant={getStatusBadgeVariant(transfer.status)}
                          label={transfer.status}
                          rounded
                        />
                      </td>
                      <td class='px-6 py-4 whitespace-nowrap'>
                        <div class='h-3 w-full overflow-hidden rounded-lg bg-gray-200 dark:bg-gray-600'>
                          <div
                            class={`h-3 rounded-lg transition-all duration-300 ${
                              transfer.status === 'completed'
                                ? 'bg-green-500'
                                : transfer.status === 'failed' ||
                                    transfer.status === 'integrity_error'
                                  ? 'bg-red-500'
                                  : transfer.status === 'verifying'
                                    ? 'bg-amber-500'
                                    : 'bg-blue-500'
                            }`}
                            style={{ width: `${transfer.progress}%` }}
                          ></div>
                        </div>
                        <div class='mt-2 text-xs font-medium text-gray-600 dark:text-gray-300'>
                          {transfer.progress}%
                        </div>
                      </td>
                      <td class='px-6 py-4 text-sm font-medium whitespace-nowrap'>
                        <Show when={transfer.status === 'completed'}>
                          <div class='flex space-x-2'>
                            <Button
                              onClick={() => props.onPreview(transfer.id)}
                              size='sm'
                              icon={<Eye class='h-4 w-4' />}
                            >
                              Preview
                            </Button>
                            <Button
                              onClick={() => props.onDownload(transfer.id)}
                              size='sm'
                              icon={<Download class='h-4 w-4' />}
                            >
                              Download
                            </Button>
                          </div>
                        </Show>
                      </td>
                    </tr>
                  )
                }}
              </For>
            </tbody>
          </table>
        </div>
      </div>
    </Show>
  )
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
