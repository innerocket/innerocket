import { createSignal, createEffect, Show, type Component } from 'solid-js'
import { QRCodeHandler } from './QRCodeHandler'
import { useFileTransfer } from '../hooks/useFileTransfer'
import { usePeer } from '../contexts/PeerContext'
import type { NotificationType } from './Notification'
import { Button } from './ui'

interface QRCodePageProps {
  onSwitchToFileTransfer: () => void
  showNotification: (message: string, type: NotificationType) => void
  onSelectPeer: (peerId: string) => void
}

export const QRCodePage: Component<QRCodePageProps> = props => {
  const { connectToPeer, connectedPeers } = useFileTransfer()
  const { peerId } = usePeer()
  const [scannedValue, setScannedValue] = createSignal<string>('')
  const [connectionStatus, setConnectionStatus] = createSignal<string>('')
  const [isConnecting, setIsConnecting] = createSignal<boolean>(false)
  const [connectedPeer, setConnectedPeer] = createSignal<string | null>(null)

  createEffect(() => {
    if (scannedValue() && connectedPeers().includes(scannedValue())) {
      setIsConnecting(false)
      setConnectedPeer(scannedValue())
      setConnectionStatus(`Connected to peer: ${scannedValue()}`)

      props.showNotification(
        `Successfully connected to peer ${scannedValue().substring(0, 8)}...`,
        'success'
      )
    }
  })

  const handleScan = (data: string) => {
    setScannedValue(data)
    setConnectionStatus(`Ready to connect with ID: ${data}`)

    if (connectedPeers().includes(data)) {
      setConnectedPeer(data)
      setConnectionStatus(`Already connected to peer: ${data}`)
    } else {
      setConnectedPeer(null)
    }
  }

  const handleConnect = () => {
    if (scannedValue() && !connectedPeers().includes(scannedValue())) {
      setIsConnecting(true)
      setConnectionStatus(`Connecting to peer: ${scannedValue()}...`)
      connectToPeer(scannedValue())

      props.showNotification(
        `Attempting to connect to peer ${scannedValue().substring(0, 8)}...`,
        'info'
      )
    }
  }

  const handleSendFiles = () => {
    if (connectedPeer()) {
      props.onSelectPeer(connectedPeer()!)
      props.showNotification(
        'Switched to File Transfer tab. You can now send files to the connected peer.',
        'info'
      )
      props.onSwitchToFileTransfer()
    }
  }

  return (
    <div class='qr-code-page max-w-4xl mx-auto py-6'>
      <h2 class='text-2xl font-bold text-gray-800 mb-6'>QR Code Connection</h2>

      <div class='bg-white rounded-lg p-6 mb-6'>
        <h3 class='text-xl font-bold text-gray-800 mb-4'>Your QR Code</h3>
        <p class='mb-4 text-gray-600'>
          Share this QR code with others to let them connect to you. It contains your unique peer
          ID.
        </p>
        <QRCodeHandler mode='generate' initialValue={peerId()} readOnly={true} />
      </div>

      <div class='bg-white rounded-lg p-6 mb-6'>
        <h3 class='text-xl font-bold text-gray-800 mb-4'>Scan QR Code</h3>
        <p class='mb-4 text-gray-600'>Scan someone else's QR code to connect with them.</p>
        <QRCodeHandler mode='scan' onScan={handleScan} />

        <Show when={scannedValue()}>
          <div class='mt-6'>
            <div class='bg-gray-50 p-4 rounded-sm mb-4'>
              <h4 class='text-md font-medium text-gray-700'>Scanned Peer ID:</h4>
              <p class='text-sm break-all mt-1'>{scannedValue()}</p>
            </div>

            <Show
              when={!connectedPeer()}
              fallback={
                <div class='flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2'>
                  <Button onClick={props.onSwitchToFileTransfer} variant='success'>
                    Go to File Transfer
                  </Button>
                  <Button onClick={handleSendFiles} variant='primary'>
                    Send Files to This Peer
                  </Button>
                </div>
              }
            >
              <Button
                onClick={handleConnect}
                disabled={isConnecting() || !scannedValue()}
                variant='primary'
              >
                {isConnecting() ? 'Connecting...' : 'Connect to This Peer'}
              </Button>
            </Show>

            <Show when={connectionStatus()}>
              <p class='mt-2 text-sm text-gray-600'>{connectionStatus()}</p>
            </Show>
          </div>
        </Show>
      </div>
    </div>
  )
}
