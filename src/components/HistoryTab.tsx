import { createSignal, createMemo, Show, type Component } from 'solid-js'
import { FileTransferList } from './FileTransferList'
import { Button } from './ui'
import { Trash2 } from 'lucide-solid'
import type { FileTransfer } from '../types'

interface HistoryTabProps {
  transfers: FileTransfer[]
  onDownload: (fileId: string) => void
  onPreview: (fileId: string) => void
  onClearHistory: () => void
}

export const HistoryTab: Component<HistoryTabProps> = props => {
  const [showAll, setShowAll] = createSignal(false)

  const sortedTransfers = createMemo(() =>
    [...props.transfers].sort((a, b) => b.createdAt - a.createdAt)
  )

  const displayedTransfers = createMemo(() =>
    showAll() ? sortedTransfers() : sortedTransfers().slice(0, 5)
  )

  const hasMoreTransfers = createMemo(() => sortedTransfers().length > 5)

  return (
    <div class='h-full flex flex-col space-y-4'>
      <div class='flex justify-between items-center flex-shrink-0'>
        <div>
          <h3 class='text-lg font-semibold text-gray-900 dark:text-white'>File Transfer History</h3>
          <p class='text-sm text-gray-600 dark:text-gray-400 mt-1'>
            Track your file transfers and downloads
          </p>
        </div>
        <Show when={props.transfers.length > 0}>
          <Button
            onClick={props.onClearHistory}
            variant='secondary'
            size='sm'
            class='text-red-600 border-red-500 hover:bg-red-600 hover:text-white dark:text-red-400 dark:border-red-500'
          >
            <Trash2 class='h-4 w-4 mr-2' />
            Clear History
          </Button>
        </Show>
      </div>

      <div class='flex-1 min-h-0'>
        <FileTransferList
          transfers={displayedTransfers()}
          onDownload={props.onDownload}
          onPreview={props.onPreview}
        />
      </div>

      <Show when={hasMoreTransfers() && !showAll()}>
        <div class='flex justify-center flex-shrink-0'>
          <Button onClick={() => setShowAll(true)} variant='secondary' size='sm'>
            Show All ({sortedTransfers().length} total)
          </Button>
        </div>
      </Show>

      <Show when={showAll() && hasMoreTransfers()}>
        <div class='flex justify-center flex-shrink-0'>
          <Button onClick={() => setShowAll(false)} variant='secondary' size='sm'>
            Show Less
          </Button>
        </div>
      </Show>
    </div>
  )
}
