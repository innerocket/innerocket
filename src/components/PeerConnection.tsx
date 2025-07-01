import { createSignal, Show, type Component, createMemo } from 'solid-js'
import { Copy, Check, QrCode, ScanLine } from 'lucide-solid'
import { usePeer } from '../contexts/PeerContext'
import { QRCodeModal } from './QRCodeModal'
import { Button, IconButton, Input } from './ui'

interface PeerConnectionProps {
  onConnect: (peerId: string) => void
}

export const PeerConnection: Component<PeerConnectionProps> = props => {
  const { peerId, removePrefixFromId } = usePeer()
  const [peerIdInput, setPeerIdInput] = createSignal('')
  const [copySuccess, setCopySuccess] = createSignal(false)
  const [showQRCode, setShowQRCode] = createSignal(false)
  const [showQRScanner, setShowQRScanner] = createSignal(false)

  // Create a computed signal for the disabled state to ensure proper reactivity
  const isConnectDisabled = createMemo(() => {
    const input = peerIdInput().trim()
    const currentPeerId = peerId()
    const scannerOpen = showQRScanner()

    return !input || input === currentPeerId || scannerOpen
  })

  const handleConnect = () => {
    if (peerIdInput().trim() && peerIdInput() !== peerId()) {
      const cleanId = removePrefixFromId(peerIdInput().trim())
      props.onConnect(cleanId)
      setPeerIdInput('')
    }
  }

  const copyMyPeerId = () => {
    navigator.clipboard.writeText(peerId())
    setCopySuccess(true)
    setTimeout(() => setCopySuccess(false), 2000)
  }

  const toggleQRCode = () => {
    setShowQRCode(!showQRCode())
    if (showQRScanner()) setShowQRScanner(false)
  }

  const toggleQRScanner = () => {
    setShowQRScanner(!showQRScanner())
    if (showQRCode()) setShowQRCode(false)
  }

  const handleScan = (data: string) => {
    if (data && data !== peerId()) {
      const cleanId = removePrefixFromId(data)
      setPeerIdInput(cleanId)
      setShowQRScanner(false)
    }
  }

  return (
    <>
      <div class='space-y-6'>
        {/* Your Peer ID Section */}
        <div class='rounded-lg border-2 border-gray-200 bg-white p-4 transition-all duration-200 sm:p-6 dark:border-gray-700 dark:bg-gray-800'>
          <div class='mb-4 flex items-center justify-between'>
            <h4 class='text-lg font-semibold text-gray-900 dark:text-white'>Your Peer ID</h4>
            <div class='flex space-x-2'>
              <IconButton
                onClick={copyMyPeerId}
                variant={copySuccess() ? 'success' : 'ghost'}
                size='sm'
                icon={copySuccess() ? <Check class='h-4 w-4' /> : <Copy class='h-4 w-4' />}
                ariaLabel='Copy to clipboard'
              />
              <IconButton
                onClick={toggleQRCode}
                variant='ghost'
                size='sm'
                icon={<QrCode class='h-4 w-4' />}
                ariaLabel='Show QR Code'
              />
            </div>
          </div>

          <code class='block w-full rounded-md bg-gray-100 px-3.5 py-3 font-mono text-sm break-all text-gray-800 dark:bg-gray-700 dark:text-gray-200'>
            {peerId()}
          </code>

          <p class='mt-3 text-sm text-gray-600 dark:text-gray-400'>
            <Show
              when={copySuccess()}
              fallback={'Share this ID with others to let them connect to you'}
            >
              <span class='flex items-center font-medium text-green-600 dark:text-green-400'>
                <Check class='mr-1 h-4 w-4' />
                ID copied to clipboard!
              </span>
            </Show>
          </p>
        </div>

        {/* Connect to Peer Section */}
        <div class='rounded-lg border-2 border-gray-200 bg-white p-4 transition-all duration-200 sm:p-6 dark:border-gray-700 dark:bg-gray-800'>
          <h4 class='mb-4 text-lg font-semibold text-gray-900 dark:text-white'>
            Connect to a Peer
          </h4>

          <div class='flex items-center'>
            <div class='flex-1'>
              <Input
                type='text'
                value={peerIdInput()}
                onInput={e => setPeerIdInput(e.currentTarget.value)}
                placeholder='Enter peer ID to connect'
                fullWidth
                class='rounded-r-none'
                disabled={showQRScanner()}
              />
            </div>
            <Button
              onClick={handleConnect}
              disabled={isConnectDisabled()}
              class='mr-2 rounded-l-none rounded-r-md border-l-0'
              size='md'
            >
              Connect
            </Button>
            <IconButton
              onClick={toggleQRScanner}
              variant={showQRScanner() ? 'primary' : 'secondary'}
              size='md'
              icon={<ScanLine class='h-5 w-5' />}
              ariaLabel='Scan QR Code'
            />
          </div>
        </div>
      </div>

      {/* QR Code Modal */}
      <QRCodeModal
        isOpen={showQRCode()}
        onClose={() => setShowQRCode(false)}
        value={peerId()}
        title='Your Peer ID'
        mode='generate'
      />

      {/* QR Scanner Modal */}
      <QRCodeModal
        isOpen={showQRScanner()}
        onClose={() => setShowQRScanner(false)}
        title='Scan QR Code'
        mode='scan'
        onScan={handleScan}
      />
    </>
  )
}
