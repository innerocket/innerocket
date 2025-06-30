import type { FileTransferRequest } from '../types'
import { Button } from './ui'
import { For, Show, type Component } from 'solid-js'

interface IncomingRequestsProps {
  requests: FileTransferRequest[]
  onAccept: (id: string) => void
  onReject: (id: string) => void
}

export const IncomingRequests: Component<IncomingRequestsProps> = props => {
  return (
    <Show when={props.requests.length > 0}>
      <div class='fixed bottom-4 right-4 space-y-2 z-50'>
        <For each={props.requests}>
          {req => (
            <div class='bg-white border border-gray-200 dark:bg-gray-800 dark:border-gray-700 p-3 sm:p-4 rounded-md shadow'>
              <p class='mb-2 text-sm text-gray-700 dark:text-gray-300'>
                Incoming file: <span class='font-medium'>{req.metadata.name}</span> (
                {formatFileSize(req.metadata.size)})
              </p>
              <div class='flex justify-end gap-2'>
                <Button size='sm' variant='danger' onClick={() => props.onReject(req.metadata.id)}>
                  Reject
                </Button>
                <Button size='sm' onClick={() => props.onAccept(req.metadata.id)}>
                  Accept
                </Button>
              </div>
            </div>
          )}
        </For>
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
