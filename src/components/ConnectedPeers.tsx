import { createSignal, For, Show, type Component } from 'solid-js'
import { X, QrCode, Users } from 'lucide-solid'
import { QRCodeModal } from './QRCodeModal'
import { IconButton, EmptyState } from './ui'

interface ConnectedPeersProps {
  peers: string[]
  onDisconnect: (peerId: string) => void
}

export const ConnectedPeers: Component<ConnectedPeersProps> = props => {
  const [showQRCode, setShowQRCode] = createSignal<string | null>(null)

  const toggleQRCode = (peerId: string) => {
    setShowQRCode(showQRCode() === peerId ? null : peerId)
  }

  return (
    <Show
      when={props.peers.length > 0}
      fallback={
        <EmptyState
          icon={<Users class='h-6 w-6 text-gray-500 dark:text-gray-400' />}
          title='No peers connected yet'
          subtitle='Connect to peers to start sharing files'
        />
      }
    >
      <div class='space-y-3'>
        <For each={props.peers}>
          {peerId => (
            <div class='rounded-lg border-2 border-gray-200 bg-white transition-all duration-200 dark:border-gray-700 dark:bg-gray-800'>
              <div class='flex items-center justify-between p-3 sm:p-4'>
                <div class='mr-3 flex flex-1 items-center truncate'>
                  <div class='mr-3 h-3 w-3 animate-pulse rounded-lg bg-green-500'></div>
                  <code class='flex-1 truncate rounded-md bg-gray-100 px-3 py-2 font-mono text-sm dark:bg-gray-700 dark:text-gray-300'>
                    {peerId}
                  </code>
                </div>
                <div class='flex space-x-1'>
                  <IconButton
                    onClick={() => toggleQRCode(peerId)}
                    variant='ghost'
                    size='sm'
                    icon={<QrCode class='h-4 w-4' />}
                    ariaLabel='Show QR Code'
                  />
                  <IconButton
                    onClick={() => props.onDisconnect(peerId)}
                    variant='ghost'
                    size='sm'
                    icon={<X class='h-4 w-4' />}
                    ariaLabel='Disconnect'
                    class='hover:text-red-600 dark:hover:text-red-400'
                  />
                </div>
              </div>
            </div>
          )}
        </For>
      </div>

      {/* QR Code Modal */}
      <QRCodeModal
        isOpen={showQRCode() !== null}
        onClose={() => setShowQRCode(null)}
        value={showQRCode() || ''}
        title='Peer QR Code'
      />
    </Show>
  )
}
