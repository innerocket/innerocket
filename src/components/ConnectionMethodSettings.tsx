import { Show, For } from 'solid-js'
import { 
  Zap, 
  Globe, 
  Server, 
  Shield, 
  ArrowRight, 
  Check, 
  Info, 
  Wifi,
  Settings
} from 'lucide-solid'
import { CONNECTION_METHODS, type ConnectionMethod } from '../hooks/useFileTransfer'

interface ConnectionMethodSettingsProps {
  connectionMethod: () => ConnectionMethod
  onSetConnectionMethod: (method: ConnectionMethod) => void
  connectedPeers: () => string[]
}

const METHOD_ICONS = {
  auto: Settings,
  direct: Zap,
  relay: Server,
  turn: Shield,
  fallback: ArrowRight,
} as const

const METHOD_COLORS = {
  auto: 'blue',
  direct: 'green',
  relay: 'orange',
  turn: 'purple',
  fallback: 'indigo',
} as const

export function ConnectionMethodSettings(props: ConnectionMethodSettingsProps) {
  return (
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-2">
          <Globe class="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          <h4 class="text-lg font-medium text-gray-900 dark:text-white">
            Connection Method
          </h4>
          <span class="rounded-full bg-indigo-100 px-2 py-1 text-xs font-medium text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-300">
            {CONNECTION_METHODS[props.connectionMethod()].label}
          </span>
        </div>
      </div>

      <div class="text-sm text-gray-600 dark:text-gray-400">
        <p class="mb-2">
          <strong>Connection strategy:</strong> Choose how your device connects to other peers.
          Different methods work better in different network environments.
        </p>
        <p>
          <strong>Performance note:</strong> Direct connections are fastest but may not work behind
          firewalls or NAT. Relay/TURN servers help with connectivity but may be slower.
        </p>
      </div>

      {/* Current status */}
      <div class="rounded-lg border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-700 dark:bg-indigo-900/20">
        <div class="flex items-center space-x-2">
          <Wifi class="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          <h5 class="text-sm font-medium text-indigo-800 dark:text-indigo-300">
            Current Method: {CONNECTION_METHODS[props.connectionMethod()].label}
          </h5>
        </div>
        <p class="mt-2 text-sm text-indigo-700 dark:text-indigo-400">
          {CONNECTION_METHODS[props.connectionMethod()].description}
        </p>
        <Show when={props.connectedPeers().length > 0}>
          <div class="mt-3 text-xs text-indigo-600 dark:text-indigo-300">
            <strong>Active connections:</strong> {props.connectedPeers().length} peer(s) using this method
          </div>
        </Show>
      </div>

      {/* Connection method options */}
      <div class="space-y-3">
        <h5 class="text-sm font-medium text-gray-700 dark:text-gray-300">
          Choose Connection Method
        </h5>
        
        <div class="space-y-3">
          <For each={Object.entries(CONNECTION_METHODS)}>
            {([methodKey, methodData]) => {
              const method = methodKey as ConnectionMethod
              const Icon = METHOD_ICONS[method]
              const colorScheme = METHOD_COLORS[method]
              const isSelected = () => props.connectionMethod() === method

              return (
                <div
                  onClick={() => props.onSetConnectionMethod(method)}
                  class={`cursor-pointer rounded-lg border-2 p-4 transition-all duration-200 ${
                    isSelected()
                      ? `border-${colorScheme}-500 bg-${colorScheme}-50 dark:border-${colorScheme}-400 dark:bg-${colorScheme}-900/20`
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:hover:border-gray-500 dark:hover:bg-gray-700'
                  }`}
                >
                  <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-3">
                      <div
                        class={`rounded-lg p-2 ${
                          isSelected()
                            ? `bg-${colorScheme}-100 dark:bg-${colorScheme}-800/20`
                            : 'bg-gray-100 dark:bg-gray-700'
                        }`}
                      >
                        <Icon
                          class={`h-5 w-5 ${
                            isSelected()
                              ? `text-${colorScheme}-600 dark:text-${colorScheme}-400`
                              : 'text-gray-600 dark:text-gray-400'
                          }`}
                        />
                      </div>
                      <div>
                        <h6
                          class={`text-sm font-medium ${
                            isSelected()
                              ? `text-${colorScheme}-800 dark:text-${colorScheme}-300`
                              : 'text-gray-900 dark:text-white'
                          }`}
                        >
                          {methodData.label}
                        </h6>
                        <p
                          class={`text-xs ${
                            isSelected()
                              ? `text-${colorScheme}-600 dark:text-${colorScheme}-400`
                              : 'text-gray-500 dark:text-gray-400'
                          }`}
                        >
                          {methodData.description}
                        </p>
                      </div>
                    </div>
                    <div
                      class={`rounded-full p-1 ${
                        isSelected()
                          ? `bg-${colorScheme}-200 dark:bg-${colorScheme}-700/30`
                          : 'bg-gray-200 dark:bg-gray-600'
                      }`}
                    >
                      {isSelected() ? (
                        <Check class={`h-4 w-4 text-${colorScheme}-600 dark:text-${colorScheme}-400`} />
                      ) : (
                        <div class="h-4 w-4"></div>
                      )}
                    </div>
                  </div>

                  {/* Connection priority flow */}
                  <div class="mt-3 border-t border-gray-200 pt-3 dark:border-gray-600">
                    <div class="flex items-center space-x-2 text-xs">
                      <span class="font-medium text-gray-700 dark:text-gray-300">Priority order:</span>
                      <div class="flex items-center space-x-1">
                        <For each={methodData.priority}>
                          {(priority, index) => (
                            <>
                              {index() > 0 && (
                                <ArrowRight class="h-3 w-3 text-gray-400 dark:text-gray-500" />
                              )}
                              <span
                                class={`rounded px-1 py-0.5 text-xs font-medium ${
                                  priority === 'direct'
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                                    : priority === 'relay'
                                    ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300'
                                    : 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300'
                                }`}
                              >
                                {priority.toUpperCase()}
                              </span>
                            </>
                          )}
                        </For>
                      </div>
                    </div>
                  </div>
                </div>
              )
            }}
          </For>
        </div>
      </div>

      {/* Method explanations */}
      <div class="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-700/20">
        <h5 class="mb-3 flex items-center space-x-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          <Info class="h-4 w-4" />
          <span>Connection Method Guide</span>
        </h5>
        <div class="space-y-3 text-xs text-gray-600 dark:text-gray-400">
          <div class="flex items-start space-x-2">
            <Zap class="mt-0.5 h-3 w-3 text-green-500" />
            <div>
              <strong>Direct P2P:</strong> Fastest connection method. Works best on open networks
              without firewalls or NAT restrictions.
            </div>
          </div>
          <div class="flex items-start space-x-2">
            <Server class="mt-0.5 h-3 w-3 text-orange-500" />
            <div>
              <strong>Relay Server:</strong> Uses intermediate servers to route data. Slower than
              direct but works through most firewalls.
            </div>
          </div>
          <div class="flex items-start space-x-2">
            <Shield class="mt-0.5 h-3 w-3 text-purple-500" />
            <div>
              <strong>TURN Server:</strong> Most reliable method for restrictive networks. May have
              higher latency but ensures connectivity.
            </div>
          </div>
          <div class="flex items-start space-x-2">
            <Settings class="mt-0.5 h-3 w-3 text-blue-500" />
            <div>
              <strong>Automatic:</strong> Intelligently chooses the best method based on network
              conditions and connection success rates.
            </div>
          </div>
          <div class="flex items-start space-x-2">
            <ArrowRight class="mt-0.5 h-3 w-3 text-indigo-500" />
            <div>
              <strong>Adaptive Fallback:</strong> Tries direct connection first, then falls back to
              relay/TURN if needed. Best for varied network conditions.
            </div>
          </div>
        </div>
      </div>

      {/* Network compatibility info */}
      <div class="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-700 dark:bg-blue-900/20">
        <h5 class="text-sm font-medium text-blue-800 dark:text-blue-300">
          Network Compatibility Tips
        </h5>
        <div class="mt-2 space-y-1 text-xs text-blue-700 dark:text-blue-400">
          <p>• <strong>Corporate/School networks:</strong> Use TURN or Adaptive Fallback</p>
          <p>• <strong>Home networks:</strong> Direct P2P usually works best</p>
          <p>• <strong>Mobile hotspots:</strong> Relay or TURN methods recommended</p>
          <p>• <strong>VPN connections:</strong> TURN method may be required</p>
          <p>• <strong>Public WiFi:</strong> Use Automatic or Adaptive Fallback</p>
        </div>
      </div>
    </div>
  )
}