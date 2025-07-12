import { createSignal, Show, For } from 'solid-js'
import { Plus, Trash2, Shield, Users, AlertTriangle } from 'lucide-solid'

interface TrustedPeersListProps {
  trustedPeers: () => string[]
  connectedPeers: () => string[]
  onAddTrustedPeer: (peerId: string) => boolean
  onRemoveTrustedPeer: (peerId: string) => boolean
}

export function TrustedPeersList(props: TrustedPeersListProps) {
  const [newPeerId, setNewPeerId] = createSignal('')
  const [showAddForm, setShowAddForm] = createSignal(false)
  const [error, setError] = createSignal('')

  const handleAddPeer = () => {
    const peerId = newPeerId().trim()
    if (!peerId) {
      setError('Peer ID cannot be empty')
      return
    }

    const success = props.onAddTrustedPeer(peerId)
    if (success) {
      setNewPeerId('')
      setShowAddForm(false)
      setError('')
    } else {
      setError('Peer already in trusted list')
    }
  }

  const handleRemovePeer = (peerId: string) => {
    props.onRemoveTrustedPeer(peerId)
  }

  const handleQuickAdd = (peerId: string) => {
    const success = props.onAddTrustedPeer(peerId)
    if (!success) {
      setError(`Peer ${peerId} is already in trusted list`)
      setTimeout(() => setError(''), 3000)
    }
  }

  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddPeer()
    } else if (e.key === 'Escape') {
      setShowAddForm(false)
      setNewPeerId('')
      setError('')
    }
  }

  return (
    <div class='space-y-4'>
      <div class='flex items-center justify-between'>
        <div class='flex items-center space-x-2'>
          <Shield class='h-5 w-5 text-blue-600 dark:text-blue-400' />
          <h4 class='text-lg font-medium text-gray-900 dark:text-white'>Trusted Peers</h4>
          <span class='rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'>
            {props.trustedPeers().length}
          </span>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm())}
          class='inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none dark:focus:ring-blue-500'
        >
          <Plus class='mr-1 h-4 w-4' />
          Add Peer
        </button>
      </div>

      <div class='text-sm text-gray-600 dark:text-gray-400'>
        <p class='mb-2'>
          <strong>Auto-accept behavior:</strong> When auto-accept is enabled, files will only be
          automatically accepted from peers in this trusted list.
        </p>
        <p>
          <strong>Security note:</strong> Only add peers you completely trust to avoid unwanted file
          transfers.
        </p>
      </div>

      {/* Quick add from connected peers */}
      <Show when={props.connectedPeers().length > 0}>
        <div class='rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-700/20'>
          <div class='mb-3 flex items-center space-x-2'>
            <Users class='h-4 w-4 text-gray-600 dark:text-gray-400' />
            <h5 class='text-sm font-medium text-gray-700 dark:text-gray-300'>
              Quick Add from Connected Peers
            </h5>
          </div>
          <div class='space-y-2'>
            <For each={props.connectedPeers()}>
              {peerId => (
                <Show when={!props.trustedPeers().includes(peerId)}>
                  <div class='flex items-center justify-between rounded-md border border-gray-200 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-800'>
                    <div class='flex items-center space-x-2'>
                      <div class='h-2 w-2 rounded-full bg-green-500'></div>
                      <span class='font-mono text-sm text-gray-700 dark:text-gray-300'>
                        {peerId}
                      </span>
                    </div>
                    <button
                      onClick={() => handleQuickAdd(peerId)}
                      class='text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300'
                    >
                      Trust
                    </button>
                  </div>
                </Show>
              )}
            </For>
          </div>
        </div>
      </Show>

      {/* Add form */}
      <Show when={showAddForm()}>
        <div class='rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-600 dark:bg-gray-800'>
          <h5 class='mb-3 text-sm font-medium text-gray-700 dark:text-gray-300'>
            Add Trusted Peer ID
          </h5>
          <div class='space-y-3'>
            <input
              type='text'
              value={newPeerId()}
              onInput={e => {
                setNewPeerId(e.currentTarget.value)
                setError('')
              }}
              onKeyPress={handleKeyPress}
              placeholder='Enter peer ID...'
              class='w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-500'
              autofocus
            />
            <div class='flex space-x-2'>
              <button
                onClick={handleAddPeer}
                disabled={!newPeerId().trim()}
                class='inline-flex items-center rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-400 disabled:hover:bg-gray-400 dark:focus:ring-green-500'
              >
                Add to Trusted
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false)
                  setNewPeerId('')
                  setError('')
                }}
                class='inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-all duration-200 hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </Show>

      {/* Error message */}
      <Show when={error()}>
        <div class='flex items-center space-x-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-700 dark:bg-red-900/20 dark:text-red-400'>
          <AlertTriangle class='h-4 w-4' />
          <span>{error()}</span>
        </div>
      </Show>

      {/* Trusted peers list */}
      <div class='space-y-3'>
        <Show
          when={props.trustedPeers().length > 0}
          fallback={
            <div class='rounded-lg border-2 border-dashed border-gray-300 p-6 text-center dark:border-gray-600'>
              <Shield class='mx-auto h-8 w-8 text-gray-400 dark:text-gray-500' />
              <h5 class='mt-2 text-sm font-medium text-gray-700 dark:text-gray-300'>
                No trusted peers yet
              </h5>
              <p class='mt-1 text-xs text-gray-500 dark:text-gray-400'>
                Add trusted peers to enable secure auto-accept functionality
              </p>
            </div>
          }
        >
          <For each={props.trustedPeers()}>
            {peerId => {
              const isConnected = () => props.connectedPeers().includes(peerId)
              return (
                <div class='flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-600 dark:bg-gray-800'>
                  <div class='flex items-center space-x-3'>
                    <div class='flex items-center space-x-2'>
                      <div
                        class={`h-2 w-2 rounded-full ${
                          isConnected() ? 'bg-green-500' : 'bg-gray-400 dark:bg-gray-500'
                        }`}
                      ></div>
                    </div>
                    <div>
                      <span class='font-mono text-sm font-medium text-gray-900 dark:text-white'>
                        {peerId}
                      </span>
                      <div class='text-xs text-gray-500 dark:text-gray-400'>
                        {isConnected() ? 'Connected' : 'Offline'}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemovePeer(peerId)}
                    class='inline-flex items-center rounded-md border border-red-300 bg-white px-2 py-2 text-xs font-medium text-red-700 transition-all duration-200 hover:bg-red-50 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:outline-none dark:border-red-600 dark:bg-gray-700 dark:text-red-400 dark:hover:bg-red-900/20'
                  >
                    <Trash2 class='h-3 w-3' />
                  </button>
                </div>
              )
            }}
          </For>
        </Show>
      </div>
    </div>
  )
}
