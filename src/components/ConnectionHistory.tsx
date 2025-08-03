import { Show, For, createSignal } from 'solid-js'
import {
  Clock,
  Wifi,
  WifiOff,
  FileText,
  HardDrive,
  Trash2,
  Users,
  RotateCcw,
  Calendar,
  Activity,
} from 'lucide-solid'
import type { ConnectionHistoryEntry } from '../hooks/useFileTransfer'

interface ConnectionHistoryProps {
  connectionHistory: () => ConnectionHistoryEntry[]
  connectedPeers: () => string[]
  formatFileSize: (bytes: number) => string
  formatDuration: (ms: number) => string
  onClearHistory: () => void
  onAddTrustedPeer?: (peerId: string) => boolean
  privacyMode?: () => boolean
}

export function ConnectionHistory(props: ConnectionHistoryProps) {
  const [showClearConfirmation, setShowClearConfirmation] = createSignal(false)

  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - timestamp
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return date.toLocaleTimeString()
    } else if (diffDays === 1) {
      return 'Yesterday ' + date.toLocaleTimeString()
    } else if (diffDays < 7) {
      return `${diffDays} days ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  const isCurrentlyConnected = (peerId: string): boolean => {
    return props.connectedPeers().includes(peerId)
  }

  const sortedHistory = () => {
    return [...props.connectionHistory()].sort((a, b) => b.lastSeen - a.lastSeen)
  }

  const getTotalStats = () => {
    const history = props.connectionHistory()
    return {
      totalConnections: history.length,
      totalFilesTransferred: history.reduce((sum, entry) => sum + entry.filesTransferred, 0),
      totalBytesTransferred: history.reduce((sum, entry) => sum + entry.totalBytesTransferred, 0),
      averageConnectionTime:
        history.length > 0
          ? history.reduce((sum, entry) => sum + (entry.duration || 0), 0) / history.length
          : 0,
    }
  }

  const stats = () => getTotalStats()

  return (
    <div class='space-y-4'>
      <div class='flex items-center justify-between'>
        <div class='flex items-center space-x-2'>
          <Clock class='h-5 w-5 text-green-600 dark:text-green-400' />
          <h4 class='text-lg font-medium text-gray-900 dark:text-white'>Connection History</h4>
          <span class='rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800 dark:bg-green-900/20 dark:text-green-300'>
            {props.connectionHistory().length} peers
          </span>
        </div>

        <div class='flex space-x-2'>
          <button
            onClick={() => setShowClearConfirmation(true)}
            disabled={props.connectionHistory().length === 0}
            class='inline-flex items-center rounded-md border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-700 transition-all duration-200 hover:bg-red-50 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-600 dark:bg-gray-700 dark:text-red-400 dark:hover:bg-red-900/20'
          >
            <Trash2 class='mr-1 h-4 w-4' />
            Clear History
          </button>
        </div>
      </div>

      <div class='text-sm text-gray-600 dark:text-gray-400'>
        <p class='mb-2'>
          <strong>Connection tracking:</strong> View all past and current peer connections with
          detailed statistics and transfer history.
        </p>
        <p>
          <strong>Privacy note:</strong> Connection history is stored locally in your browser and
          never shared.
        </p>
      </div>

      {/* Statistics Overview */}
      <div class='grid grid-cols-2 gap-4 sm:grid-cols-4'>
        <div class='rounded-lg border border-gray-200 bg-white p-3 text-center dark:border-gray-600 dark:bg-gray-800'>
          <Users class='mx-auto h-5 w-5 text-blue-600 dark:text-blue-400' />
          <div class='mt-1 text-lg font-semibold text-gray-900 dark:text-white'>
            {stats().totalConnections}
          </div>
          <div class='text-xs text-gray-500 dark:text-gray-400'>Total Peers</div>
        </div>

        <div class='rounded-lg border border-gray-200 bg-white p-3 text-center dark:border-gray-600 dark:bg-gray-800'>
          <FileText class='mx-auto h-5 w-5 text-green-600 dark:text-green-400' />
          <div class='mt-1 text-lg font-semibold text-gray-900 dark:text-white'>
            {stats().totalFilesTransferred}
          </div>
          <div class='text-xs text-gray-500 dark:text-gray-400'>Files Shared</div>
        </div>

        <div class='rounded-lg border border-gray-200 bg-white p-3 text-center dark:border-gray-600 dark:bg-gray-800'>
          <HardDrive class='mx-auto h-5 w-5 text-purple-600 dark:text-purple-400' />
          <div class='mt-1 text-lg font-semibold text-gray-900 dark:text-white'>
            {props.formatFileSize(stats().totalBytesTransferred)}
          </div>
          <div class='text-xs text-gray-500 dark:text-gray-400'>Data Transfer</div>
        </div>

        <div class='rounded-lg border border-gray-200 bg-white p-3 text-center dark:border-gray-600 dark:bg-gray-800'>
          <Activity class='mx-auto h-5 w-5 text-orange-600 dark:text-orange-400' />
          <div class='mt-1 text-lg font-semibold text-gray-900 dark:text-white'>
            {props.formatDuration(stats().averageConnectionTime)}
          </div>
          <div class='text-xs text-gray-500 dark:text-gray-400'>Avg Duration</div>
        </div>
      </div>

      {/* Connection History List */}
      <div class='space-y-3'>
        <Show
          when={props.privacyMode?.()}
          fallback={
            <Show
              when={props.connectionHistory().length > 0}
              fallback={
                <div class='rounded-lg border-2 border-dashed border-gray-300 p-6 text-center dark:border-gray-600'>
                  <Clock class='mx-auto h-8 w-8 text-gray-400 dark:text-gray-500' />
                  <h5 class='mt-2 text-sm font-medium text-gray-700 dark:text-gray-300'>
                    No connection history yet
                  </h5>
                  <p class='mt-1 text-xs text-gray-500 dark:text-gray-400'>
                    Connection history will appear here once you connect to peers
                  </p>
                </div>
              }
            >
              <div class='space-y-2'>
                <For each={sortedHistory()}>
                  {entry => {
                    const isConnected = isCurrentlyConnected(entry.peerId)

                    return (
                      <div class='rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-600 dark:bg-gray-800'>
                        <div class='flex items-center justify-between'>
                          <div class='flex items-center space-x-3'>
                            <div class='flex items-center space-x-2'>
                              {isConnected ? (
                                <Wifi class='h-4 w-4 text-green-500' />
                              ) : (
                                <WifiOff class='h-4 w-4 text-gray-400 dark:text-gray-500' />
                              )}
                              <div
                                class={`h-2 w-2 rounded-full ${
                                  isConnected ? 'bg-green-500' : 'bg-gray-400 dark:bg-gray-500'
                                }`}
                              />
                            </div>
                            <div class='min-w-0 flex-1'>
                              <div class='flex items-center space-x-2'>
                                <span class='font-mono text-sm font-medium text-gray-900 dark:text-white'>
                                  {entry.peerId}
                                </span>
                                {isConnected && (
                                  <span class='rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800 dark:bg-green-900/20 dark:text-green-300'>
                                    Connected
                                  </span>
                                )}
                              </div>
                              <div class='mt-1 flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400'>
                                <div class='flex items-center space-x-1'>
                                  <Calendar class='h-3 w-3' />
                                  <span>Last seen: {formatTimestamp(entry.lastSeen)}</span>
                                </div>
                                <div class='flex items-center space-x-1'>
                                  <RotateCcw class='h-3 w-3' />
                                  <span>{entry.connectionCount} connections</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div class='flex items-center space-x-2'>
                            {props.onAddTrustedPeer && (
                              <button
                                onClick={() => props.onAddTrustedPeer!(entry.peerId)}
                                class='text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300'
                              >
                                Trust
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Statistics */}
                        <div class='mt-3 grid grid-cols-3 gap-4 border-t border-gray-200 pt-3 dark:border-gray-600'>
                          <div class='text-center'>
                            <div class='flex items-center justify-center space-x-1'>
                              <FileText class='h-3 w-3 text-blue-600 dark:text-blue-400' />
                              <span class='text-sm font-medium text-gray-900 dark:text-white'>
                                {entry.filesTransferred}
                              </span>
                            </div>
                            <div class='text-xs text-gray-500 dark:text-gray-400'>Files</div>
                          </div>

                          <div class='text-center'>
                            <div class='flex items-center justify-center space-x-1'>
                              <HardDrive class='h-3 w-3 text-green-600 dark:text-green-400' />
                              <span class='text-sm font-medium text-gray-900 dark:text-white'>
                                {props.formatFileSize(entry.totalBytesTransferred)}
                              </span>
                            </div>
                            <div class='text-xs text-gray-500 dark:text-gray-400'>Data</div>
                          </div>

                          <div class='text-center'>
                            <div class='flex items-center justify-center space-x-1'>
                              <Clock class='h-3 w-3 text-purple-600 dark:text-purple-400' />
                              <span class='text-sm font-medium text-gray-900 dark:text-white'>
                                {entry.duration ? props.formatDuration(entry.duration) : 'Active'}
                              </span>
                            </div>
                            <div class='text-xs text-gray-500 dark:text-gray-400'>Duration</div>
                          </div>
                        </div>
                      </div>
                    )
                  }}
                </For>
              </div>
            </Show>
          }
        >
          {/* Privacy mode message */}
          <div class='rounded-lg border-2 border-dashed border-indigo-300 bg-indigo-50 p-6 text-center dark:border-indigo-600 dark:bg-indigo-900/20'>
            <WifiOff class='mx-auto h-8 w-8 text-indigo-500 dark:text-indigo-400' />
            <h5 class='mt-2 text-sm font-medium text-indigo-700 dark:text-indigo-300'>
              Privacy Mode Enabled
            </h5>
            <p class='mt-1 text-xs text-indigo-600 dark:text-indigo-400'>
              Connection history tracking is disabled for enhanced privacy
            </p>
            <p class='mt-2 text-xs text-indigo-500 dark:text-indigo-500'>
              To view connection history, disable privacy mode in the Privacy settings below
            </p>
          </div>
        </Show>
      </div>

      {/* Clear confirmation dialog */}
      <Show when={showClearConfirmation()}>
        <div class='fixed inset-0 z-50 flex items-center justify-center bg-gray-900/75 backdrop-blur-sm dark:bg-gray-900/80'>
          <div class='relative max-h-full w-full max-w-md p-4'>
            <div class='relative rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'>
              <div class='p-4 text-center sm:p-6 md:p-8'>
                <div class='mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/20'>
                  <Trash2 class='h-8 w-8 text-red-600 dark:text-red-400' />
                </div>
                <h3 class='mb-6 text-lg font-semibold text-gray-900 dark:text-white'>
                  Clear Connection History?
                </h3>
                <p class='mb-6 text-gray-600 dark:text-gray-300'>
                  Are you sure you want to clear all connection history?
                  <br />
                  <span class='font-medium text-red-600 dark:text-red-400'>
                    This action cannot be undone.
                  </span>
                </p>
                <div class='flex justify-center space-x-3'>
                  <button
                    onClick={() => {
                      props.onClearHistory()
                      setShowClearConfirmation(false)
                    }}
                    class='inline-flex items-center rounded-md bg-red-600 px-5 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:outline-none dark:focus:ring-red-500'
                  >
                    Yes, clear history
                  </button>
                  <button
                    onClick={() => setShowClearConfirmation(false)}
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
