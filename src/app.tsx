import { createSignal, createEffect, on, Show } from 'solid-js'
import { useFileTransfer } from './hooks/useFileTransfer'
import { PeerConnection } from './components/PeerConnection'
import { ConnectedPeers } from './components/ConnectedPeers'
import { FileSender } from './components/FileSender'
import { FilePreview } from './components/FilePreview'
import { NotificationContainer } from './components/Notification'
import { IncomingRequests } from './components/IncomingRequests'
import { HistoryTab } from './components/HistoryTab'
import { TabsProvider, TabList, TabButton, TabContent } from './components/ui'
import { Toggle } from './components/ui/Toggle'
import { TrustedPeersList } from './components/TrustedPeersList'
import type { NotificationItem, NotificationType } from './components/Notification'
import Sqlds from 'sqids'
import { Info, HelpCircle, Trash2 } from 'lucide-solid'
import { usePeer } from './contexts/PeerContext'
import { isDevelopment } from './utils/debug'

const sqlds = new Sqlds()

export function App() {
  const { peerId } = usePeer()
  const {
    fileTransfers,
    connectedPeers,
    connectToPeer,
    disconnectFromPeer,
    sendFileToAllPeers,
    incomingRequests,
    acceptRequest,
    rejectRequest,
    downloadFile,
    previewFile,
    getFileType,
    clearFileHistory,
    isTransferring,
    compressionEnabled,
    setCompressionEnabled,
    autoAcceptFiles,
    setAutoAcceptFiles,
    trustedPeers,
    addTrustedPeer,
    removeTrustedPeer,
  } = useFileTransfer()

  const [notifications, setNotifications] = createSignal<NotificationItem[]>([])
  let prevFileTransfers = fileTransfers()
  let prevConnectedPeersLength = 0
  const [previewFileId, setPreviewFileId] = createSignal<string | null>(null)
  const [previewUrl, setPreviewUrl] = createSignal<string | null>(null)
  const [showHelp, setShowHelp] = createSignal<boolean>(false)
  const [showClearConfirmation, setShowClearConfirmation] = createSignal<boolean>(false)
  const [activeTab, setActiveTab] = createSignal<string>('connection')

  // Monitor file transfers for status changes
  createEffect(
    on(fileTransfers, currentFileTransfers => {
      // Check for newly completed transfers
      currentFileTransfers.forEach(transfer => {
        const prevTransfer = prevFileTransfers.find(t => t.id === transfer.id)

        // If a transfer just completed, show a notification
        if (
          transfer.status === 'completed' &&
          prevTransfer &&
          prevTransfer.status !== 'completed'
        ) {
          showNotification(
            `File "${transfer.fileName}" has been ${
              transfer.sender === peerId() ? 'sent' : 'received'
            } successfully!`,
            'success'
          )
        }

        // If a transfer failed, show a notification
        if (transfer.status === 'failed' && prevTransfer && prevTransfer.status !== 'failed') {
          showNotification(
            `Failed to ${transfer.sender === peerId() ? 'send' : 'receive'} file "${
              transfer.fileName
            }"`,
            'error'
          )
        }

        // If a transfer enters verification phase
        if (
          transfer.status === 'verifying' &&
          prevTransfer &&
          prevTransfer.status !== 'verifying'
        ) {
          showNotification(`Verifying integrity of "${transfer.fileName}"...`, 'info')
        }

        // If an integrity check failed, show a notification
        if (
          transfer.status === 'integrity_error' &&
          prevTransfer &&
          prevTransfer.status !== 'integrity_error'
        ) {
          showNotification(
            `Integrity check failed for "${transfer.fileName}". The file may be corrupted.`,
            'error'
          )
        }
      })

      prevFileTransfers = [...currentFileTransfers]
    })
  )

  // Monitor connected peers to switch tab when first peer connects
  createEffect(
    on(connectedPeers, currentConnectedPeers => {
      // If we went from 0 to 1+ connected peers, switch to file-transfer tab
      if (prevConnectedPeersLength === 0 && currentConnectedPeers.length > 0) {
        setActiveTab('file-transfer')
      }
      prevConnectedPeersLength = currentConnectedPeers.length
    })
  )

  // Clean up previous preview URL when a new one is set
  createEffect(
    on(previewUrl, (_, prevPreviewUrl) => {
      if (prevPreviewUrl) {
        URL.revokeObjectURL(prevPreviewUrl)
      }
    })
  )

  const showNotification = (message: string, type: NotificationType) => {
    const id = sqlds.encode([Date.now(), Math.floor(Math.random() * 10000)])
    setNotifications(prev => [...prev, { id, message, type }])
  }

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id))
  }

  const handleSendFileToAll = async (file: File) => {
    const transferIds = await sendFileToAllPeers(file)
    if (transferIds.length > 0) {
      showNotification(`Sending file "${file.name}" to ${transferIds.length} peers...`, 'info')
    } else {
      showNotification(`Failed to initiate file transfer for "${file.name}"`, 'error')
    }
  }

  const handleConnectToPeer = (peerId: string) => {
    connectToPeer(peerId)
    showNotification(`Connecting to peer ${peerId}...`, 'info')
  }

  const handleDisconnectFromPeer = (peerId: string) => {
    disconnectFromPeer(peerId)
    showNotification(`Disconnected from peer ${peerId}`, 'info')
  }

  const handleDownloadFile = (fileId: string) => {
    downloadFile(fileId)
    const transfer = fileTransfers().find(t => t.id === fileId)
    if (transfer) {
      showNotification(`Downloading file "${transfer.fileName}"...`, 'info')
    }
  }

  const handlePreviewFile = async (fileId: string) => {
    const transfer = fileTransfers().find(t => t.id === fileId)
    if (!transfer) return

    // Set the file ID first to show the loading state
    setPreviewFileId(fileId)

    try {
      // Fetch the preview URL
      const url = await previewFile(fileId)

      if (url) {
        setPreviewUrl(url)
      } else {
        showNotification(`Unable to preview "${transfer.fileName}"`, 'error')
        setPreviewFileId(null)
      }
    } catch (error) {
      console.error('Error previewing file:', error)
      showNotification(`Error previewing "${transfer.fileName}"`, 'error')
      setPreviewFileId(null)
    }
  }

  const handleAcceptRequest = (id: string) => {
    const req = incomingRequests().find(r => r.metadata.id === id)
    if (req) {
      acceptRequest(id)
      showNotification(`Accepted file "${req.metadata.name}"`, 'info')
    }
  }

  const handleRejectRequest = (id: string) => {
    const req = incomingRequests().find(r => r.metadata.id === id)
    if (req) {
      rejectRequest(id)
      showNotification(`Rejected file "${req.metadata.name}"`, 'warning')
    }
  }

  const handleClosePreview = () => {
    if (previewUrl()) {
      URL.revokeObjectURL(previewUrl()!)
    }
    setPreviewUrl(null)
    setPreviewFileId(null)
  }

  const toggleHelp = () => {
    setShowHelp(!showHelp())
  }

  const handleClearFileHistory = () => {
    setShowClearConfirmation(true)
  }

  const confirmClearFileHistory = () => {
    clearFileHistory()
    showNotification('File transfer history has been cleared', 'info')
    setShowClearConfirmation(false)
  }

  const cancelClearFileHistory = () => {
    setShowClearConfirmation(false)
  }

  return (
    <div class='min-h-dvh bg-gray-50 dark:bg-gray-900'>
      <main class='mx-auto max-w-4xl px-2 py-4 sm:px-6 sm:py-8 lg:px-8'>
        {/* Main Tabbed Interface */}
        <div class='w-full rounded-xl border-2 border-gray-200 bg-white transition-all duration-200 dark:border-gray-700 dark:bg-gray-800'>
          <TabsProvider activeTab={activeTab()} onTabChange={setActiveTab}>
            {/* Tab Navigation */}
            <TabList class='px-4 pt-4 sm:px-6 sm:pt-6'>
              <TabButton value='connection'>Connection</TabButton>
              <TabButton value='file-transfer'>File Transfer</TabButton>
              <TabButton value='history'>History</TabButton>
              <TabButton value='settings'>Settings</TabButton>
            </TabList>

            {/* Tab Content */}
            <div class='p-4 sm:p-6'>
              {/* Connection Tab */}
              <TabContent value='connection'>
                <div class='min-h-72 space-y-8'>
                  <div>
                    <h2 class='mb-1 text-xl font-semibold text-gray-900 dark:text-white'>
                      Connection
                    </h2>
                    <p class='mb-4 text-sm text-gray-600 sm:mb-6 dark:text-gray-400'>
                      Connect with peers to start sharing files
                    </p>
                    <PeerConnection onConnect={handleConnectToPeer} />
                  </div>

                  <div>
                    <h3 class='mb-4 text-lg font-semibold text-gray-900 dark:text-white'>
                      Connected Peers
                    </h3>
                    <ConnectedPeers
                      peers={connectedPeers()}
                      onDisconnect={handleDisconnectFromPeer}
                    />
                  </div>
                </div>
              </TabContent>

              {/* File Transfer Tab */}
              <TabContent value='file-transfer'>
                <div class='flex min-h-72 flex-col'>
                  <div class='mb-4 sm:mb-6'>
                    <h2 class='mb-1 text-xl font-semibold text-gray-900 dark:text-white'>
                      Send Files
                    </h2>
                    <p class='text-sm text-gray-600 dark:text-gray-400'>
                      Upload and share files with connected peers
                    </p>
                  </div>
                  <div class='flex-1'>
                    <FileSender
                      onSendFileToAll={handleSendFileToAll}
                      connectedPeersCount={connectedPeers().length}
                      isTransferring={isTransferring()}
                    />
                  </div>
                </div>
              </TabContent>

              {/* History Tab */}
              <TabContent value='history'>
                <div class='min-h-72'>
                  <HistoryTab
                    transfers={fileTransfers()}
                    onDownload={handleDownloadFile}
                    onPreview={handlePreviewFile}
                    onClearHistory={handleClearFileHistory}
                  />
                </div>
              </TabContent>

              {/* Settings Tab */}
              <TabContent value='settings'>
                <div class='min-h-72 space-y-6'>
                  <div>
                    <h2 class='mb-1 text-xl font-semibold text-gray-900 dark:text-white'>
                      Settings
                    </h2>
                    <p class='mb-6 text-sm text-gray-600 dark:text-gray-400'>
                      Configure your file transfer preferences
                    </p>
                  </div>

                  {/* Compression Settings */}
                  <div class='space-y-4'>
                    <h3 class='text-lg font-medium text-gray-900 dark:text-white'>
                      File Compression
                    </h3>

                    <div class='rounded-lg border border-gray-200 p-4 dark:border-gray-700'>
                      <Toggle
                        id='compression-toggle'
                        checked={compressionEnabled?.()}
                        onChange={setCompressionEnabled}
                        label='Enable file compression'
                        description='Automatically compress compatible files to reduce transfer time and bandwidth usage'
                        variant='success'
                        size='md'
                      />

                      <div class='mt-4 text-sm text-gray-600 dark:text-gray-400'>
                        <p class='mb-2'>
                          <strong>How it works:</strong> Text files, JSON, HTML, CSS, and other
                          compatible formats are automatically compressed before transfer,
                          potentially reducing file sizes by 70-90%.
                        </p>
                        <p>
                          <strong>Note:</strong> Already compressed files (ZIP, images, videos) are
                          not processed to avoid unnecessary overhead.
                        </p>
                      </div>
                    </div>

                    {/* Compression Statistics */}
                    <Show when={compressionEnabled?.()}>
                      <div class='rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-700 dark:bg-green-900/20'>
                        <h4 class='text-sm font-medium text-green-800 dark:text-green-300'>
                          Compression Status
                        </h4>
                        <p class='text-sm text-green-700 dark:text-green-400'>
                          File compression is currently <strong>enabled</strong>. Compatible files
                          will be automatically compressed during transfer.
                        </p>
                        <div class='mt-3 rounded border border-green-300 bg-green-100 p-2 text-xs text-green-800 dark:border-green-600 dark:bg-green-800/20 dark:text-green-200'>
                          <Show when={isDevelopment}>
                            <div class='mb-1'>
                              <strong>Status:</strong> Compression active and saved to browser
                              storage
                            </div>
                            <div>
                              <strong>Debug:</strong> Check browser console for compression logs
                              when sending files
                            </div>
                          </Show>
                        </div>
                      </div>
                    </Show>

                    <Show when={!compressionEnabled?.()}>
                      <div class='rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-800'>
                        <h4 class='text-sm font-medium text-gray-700 dark:text-gray-300'>
                          Compression Status
                        </h4>
                        <p class='text-sm text-gray-600 dark:text-gray-400'>
                          File compression is currently <strong>disabled</strong>. Files will be
                          transferred without compression.
                        </p>
                        <div class='mt-3 rounded border border-gray-300 bg-gray-100 p-2 text-xs text-gray-700 dark:border-gray-500 dark:bg-gray-700/20 dark:text-gray-300'>
                          <strong>Status:</strong> Setting saved to browser storage
                        </div>
                      </div>
                    </Show>

                    {/* Auto-Accept Settings */}
                    <div class='space-y-4'>
                      <h3 class='text-lg font-medium text-gray-900 dark:text-white'>
                        File Reception
                      </h3>

                      <div class='rounded-lg border border-gray-200 p-4 dark:border-gray-700'>
                        <Toggle
                          id='auto-accept-toggle'
                          checked={autoAcceptFiles?.()}
                          onChange={setAutoAcceptFiles}
                          label='Auto-accept incoming files'
                          description='Automatically accept all incoming file transfers without manual approval'
                          variant='default'
                          size='md'
                        />

                        <div class='mt-4 text-sm text-gray-600 dark:text-gray-400'>
                          <p class='mb-2'>
                            <strong>Manual approval (recommended):</strong> You will be prompted to
                            accept or reject each incoming file transfer.
                          </p>
                          <p>
                            <strong>Auto-accept:</strong> All incoming files will be automatically
                            accepted and downloaded.
                          </p>
                        </div>
                      </div>

                      {/* Auto-Accept Status */}
                      <Show when={autoAcceptFiles?.()}>
                        <div class='rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-700 dark:bg-orange-900/20'>
                          <h4 class='text-sm font-medium text-orange-800 dark:text-orange-300'>
                            Auto-Accept Status
                          </h4>
                          <p class='text-sm text-orange-700 dark:text-orange-400'>
                            <strong>Warning:</strong> Auto-accept is currently{' '}
                            <strong>enabled</strong>. All incoming files will be automatically
                            accepted without your approval.
                          </p>
                          <div class='mt-3 rounded border border-orange-300 bg-orange-100 p-2 text-xs text-orange-700 dark:border-orange-600 dark:bg-orange-800/20 dark:text-orange-200'>
                            <strong>Security:</strong> Only enable this when receiving files from
                            trusted sources
                          </div>
                        </div>
                      </Show>

                      <Show when={!autoAcceptFiles?.()}>
                        <div class='rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-700 dark:bg-blue-900/20'>
                          <h4 class='text-sm font-medium text-blue-800 dark:text-blue-300'>
                            Manual Approval Mode
                          </h4>
                          <p class='text-sm text-blue-700 dark:text-blue-400'>
                            You will be asked to approve each incoming file transfer. This is the{' '}
                            <strong>recommended</strong> setting for security.
                          </p>
                        </div>
                      </Show>
                    </div>

                    {/* Trusted Peers Settings */}
                    <div class="space-y-4">
                      <h3 class="text-lg font-medium text-gray-900 dark:text-white">
                        Trusted Peers
                      </h3>

                      <div class="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                        <TrustedPeersList
                          trustedPeers={trustedPeers}
                          connectedPeers={connectedPeers}
                          onAddTrustedPeer={addTrustedPeer}
                          onRemoveTrustedPeer={removeTrustedPeer}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </TabContent>
            </div>
          </TabsProvider>
        </div>

        {/* Help Toggle Button */}
        <div class='mt-8 mb-4 flex justify-center'>
          <button
            onClick={toggleHelp}
            type='button'
            class='inline-flex items-center rounded-lg border-2 border-blue-500 px-4 py-2 text-sm font-medium text-blue-600 transition-all duration-200 hover:bg-blue-600 hover:text-white focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none sm:px-6 sm:py-3 dark:border-blue-500 dark:text-blue-400 dark:hover:bg-blue-600 dark:hover:text-white dark:focus:ring-blue-500'
          >
            <HelpCircle class='mr-2 h-5 w-5' />
            <span>{showHelp() ? 'Hide information' : 'Click for more information'}</span>
          </button>
        </div>

        {/* Help Section - Togglable */}
        <Show when={showHelp()}>
          <div class='mt-6 mb-4 w-full rounded-xl border-2 border-gray-200 bg-white transition-all duration-200 sm:mt-8 dark:border-gray-700 dark:bg-gray-800'>
            <div class='rounded-t-xl border-b-2 border-gray-200 p-4 sm:p-6 dark:border-gray-700'>
              <h2 class='text-xl font-semibold text-gray-900 dark:text-white'>About</h2>
              <p class='mt-1 text-sm text-gray-600 dark:text-gray-400'>
                Learn how our secure file sharing works
              </p>
            </div>

            <div class='p-4 sm:p-6'>
              <div class='space-y-3 sm:space-y-4'>
                <p class='leading-relaxed text-gray-700 dark:text-gray-300'>
                  Innerocket is a secure peer-to-peer file sharing application that uses WebRTC
                  technology to transfer files directly between users without sending any file data
                  through servers.
                </p>
                <p class='leading-relaxed text-gray-700 dark:text-gray-300'>
                  All file transfers are end-to-end encrypted and take place directly between your
                  browser and the recipient's browser. This means your files never touch our
                  servers, ensuring maximum privacy and security.
                </p>
                <div class='rounded-lg border-2 border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 sm:p-4 dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-300'>
                  <div class='flex'>
                    <div class='flex-shrink-0'>
                      <Info class='h-5 w-5 text-blue-600 dark:text-blue-400' />
                    </div>
                    <div class='ml-3'>
                      <p class='leading-relaxed'>
                        To share files, first connect with the recipient by exchanging peer IDs or
                        scanning their QR code, then select the file and send it directly to them.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Show>
      </main>

      <IncomingRequests
        requests={incomingRequests()}
        onAccept={handleAcceptRequest}
        onReject={handleRejectRequest}
      />

      <NotificationContainer notifications={notifications()} onRemove={removeNotification} />

      <Show when={previewFileId()}>
        <FilePreview
          fileName={fileTransfers().find(t => t.id === previewFileId())?.fileName || 'Unknown file'}
          fileType={getFileType(previewFileId()!) || 'application/octet-stream'}
          previewUrl={previewUrl()}
          onClose={handleClosePreview}
        />
      </Show>

      {/* Confirmation Dialog */}
      <Show when={showClearConfirmation()}>
        <div class='fixed inset-0 z-50 flex items-center justify-center bg-gray-900/75 backdrop-blur-sm dark:bg-gray-900/80'>
          <div class='relative max-h-full w-full max-w-md p-4'>
            <div class='relative rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'>
              <div class='p-4 text-center sm:p-6 md:p-8'>
                <div class='mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/20'>
                  <Trash2 class='h-8 w-8 text-red-600 dark:text-red-400' />
                </div>
                <h3 class='mb-6 text-lg font-semibold text-gray-900 dark:text-white'>
                  Clear File Transfer History?
                </h3>
                <p class='mb-6 text-gray-600 dark:text-gray-300'>
                  Are you sure you want to clear all file transfer history?
                  <br />
                  <span class='font-medium text-red-600 dark:text-red-400'>
                    This action cannot be undone.
                  </span>
                </p>
                <div class='flex justify-center space-x-3'>
                  <button
                    onClick={confirmClearFileHistory}
                    type='button'
                    class='inline-flex items-center rounded-md bg-red-600 px-5 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:outline-none dark:focus:ring-red-500'
                  >
                    Yes, clear history
                  </button>
                  <button
                    onClick={cancelClearFileHistory}
                    type='button'
                    class='rounded-md border-2 border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition-all duration-200 hover:border-gray-400 hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 dark:hover:text-white dark:focus:ring-gray-500'
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Show>
    </div>
  )
}
